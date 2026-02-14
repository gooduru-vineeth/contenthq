import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@contenthq/db/client";
import { creditPacks, paymentOrders } from "@contenthq/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { getPaymentService } from "@contenthq/payment";

export const paymentRouter = router({
  /**
   * List all active credit packs available for purchase.
   */
  getPacks: protectedProcedure.query(async () => {
    return db
      .select()
      .from(creditPacks)
      .where(eq(creditPacks.active, true))
      .orderBy(asc(creditPacks.sortOrder));
  }),

  /**
   * Create a payment order for a credit pack. Returns the information
   * needed by the frontend to open the payment provider's checkout flow.
   */
  createOrder: protectedProcedure
    .input(
      z.object({
        creditPackId: z.string(),
        currency: z.enum(["INR", "USD"]).default("INR"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const paymentService = getPaymentService();

      if (!paymentService.isEnabled()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Payments are currently disabled",
        });
      }

      // Validate the credit pack exists and is active
      const [pack] = await db
        .select()
        .from(creditPacks)
        .where(
          and(
            eq(creditPacks.id, input.creditPackId),
            eq(creditPacks.active, true)
          )
        );

      if (!pack) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credit pack not found or is no longer available",
        });
      }

      // Determine amount based on currency
      const amount =
        input.currency === "INR" ? pack.priceInr : pack.priceUsd;
      const provider = paymentService.selectProvider();
      const idempotencyKey = crypto.randomUUID();

      // Create the order with the payment provider
      const result = await paymentService.createProviderOrder(provider, {
        amount,
        currency: input.currency,
        receipt: `order_${idempotencyKey}`,
        notes: {
          userId: ctx.user.id,
          creditPackId: pack.id,
          credits: String(pack.credits),
        },
      });

      // Persist the order in our database
      const [order] = await db
        .insert(paymentOrders)
        .values({
          userId: ctx.user.id,
          creditPackId: pack.id,
          provider,
          externalOrderId: result.externalOrderId,
          credits: pack.credits,
          amount,
          currency: input.currency,
          status: "created",
          providerData: result.providerData,
          idempotencyKey,
        })
        .returning();

      return {
        orderId: order!.id,
        externalOrderId: result.externalOrderId,
        amount,
        currency: input.currency,
        clientKey: paymentService.getClientKey(provider),
        provider,
      };
    }),

  /**
   * Verify a completed payment after the client-side checkout flow.
   *
   * This validates the payment signature with the provider. The actual
   * credit addition is handled by the webhook handler to ensure
   * consistency, but this returns success so the frontend can show
   * a confirmation immediately.
   */
  verifyPayment: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        paymentId: z.string(),
        signature: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const paymentService = getPaymentService();

      // Find the order and verify ownership
      const [order] = await db
        .select()
        .from(paymentOrders)
        .where(
          and(
            eq(paymentOrders.id, input.orderId),
            eq(paymentOrders.userId, ctx.user.id)
          )
        );

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      // If already captured, return success immediately (idempotent)
      if (order.status === "captured") {
        return { success: true, credits: order.credits };
      }

      // Verify the payment signature with the provider
      const valid = await paymentService.verifyPayment(
        order.provider as "razorpay",
        {
          externalOrderId: order.externalOrderId!,
          paymentId: input.paymentId,
          signature: input.signature,
        }
      );

      if (!valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid payment signature",
        });
      }

      // Mark the order as authorized. The webhook handler will finalize
      // the capture and add credits.
      await db
        .update(paymentOrders)
        .set({
          externalPaymentId: input.paymentId,
          status: "authorized",
          updatedAt: new Date(),
        })
        .where(eq(paymentOrders.id, order.id));

      return { success: true, credits: order.credits };
    }),

  /**
   * List the current user's payment orders, most recent first.
   */
  getOrders: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(paymentOrders)
        .where(eq(paymentOrders.userId, ctx.user.id))
        .orderBy(desc(paymentOrders.createdAt))
        .limit(input?.limit ?? 20);
    }),

  /**
   * Get a single payment order by ID (own orders only).
   */
  getOrder: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [order] = await db
        .select()
        .from(paymentOrders)
        .where(
          and(
            eq(paymentOrders.id, input.id),
            eq(paymentOrders.userId, ctx.user.id)
          )
        );

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return order;
    }),

  // ── Admin procedures ─────────────────────────────────────────────────

  /**
   * List all payment orders across all users (admin only).
   */
  adminListOrders: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(paymentOrders)
        .orderBy(desc(paymentOrders.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
    }),

  /**
   * Create a new credit pack (admin only).
   */
  adminCreatePack: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        credits: z.number().int().min(1),
        priceInr: z.number().int().min(0),
        priceUsd: z.number().int().min(0),
        description: z.string().optional(),
        popular: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      const [pack] = await db
        .insert(creditPacks)
        .values(input)
        .returning();
      return pack!;
    }),

  /**
   * Update an existing credit pack (admin only).
   */
  adminUpdatePack: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        credits: z.number().int().min(1).optional(),
        priceInr: z.number().int().min(0).optional(),
        priceUsd: z.number().int().min(0).optional(),
        description: z.string().optional(),
        popular: z.boolean().optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const [pack] = await db
        .update(creditPacks)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(creditPacks.id, id))
        .returning();

      if (!pack) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Credit pack not found",
        });
      }

      return pack;
    }),
});
