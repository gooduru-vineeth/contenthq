import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { subscriptionPlans, paymentOrders } from "@contenthq/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { subscriptionService } from "../../services/subscription.service";
import { TRPCError } from "@trpc/server";
import { getPaymentService } from "@contenthq/payment";

/**
 * Subscription Router - User-facing subscription procedures
 *
 * Public endpoints:
 * - getPlans: List all active subscription plans (marketplace)
 * - getPlan: Get specific plan details by ID or slug
 *
 * Protected endpoints:
 * - getMy: Get current user's subscription
 * - subscribe: Subscribe to a plan (shows "Coming Soon" until payment ready)
 * - changePlan: Upgrade/downgrade subscription
 * - cancel: Cancel subscription
 * - reactivate: Reactivate cancelled subscription
 * - getUsage: Get usage statistics
 */
export const subscriptionRouter = router({
  /**
   * Get all active subscription plans for the marketplace
   */
  getPlans: publicProcedure.query(async () => {
    return db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.active, true))
      .orderBy(asc(subscriptionPlans.sortOrder));
  }),

  /**
   * Get specific plan details by ID or slug
   */
  getPlan: publicProcedure
    .input(
      z.object({
        id: z.string().optional(),
        slug: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.id && !input.slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either id or slug must be provided",
        });
      }

      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(
          input.id
            ? eq(subscriptionPlans.id, input.id)
            : eq(subscriptionPlans.slug, input.slug!)
        );

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      return plan;
    }),

  /**
   * Get current user's subscription
   */
  getMy: protectedProcedure.query(async ({ ctx }) => {
    return subscriptionService.getCurrentSubscription(ctx.user.id);
  }),

  /**
   * Subscribe to a plan
   * Creates a Razorpay payment order and returns checkout details
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        currency: z.enum(["INR", "USD"]).default("INR"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Validate plan exists and is active
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.id, input.planId),
            eq(subscriptionPlans.active, true)
          )
        );

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      // 2. For free plan, create subscription directly without payment
      if (plan.isDefault || (plan.priceInr === 0 && plan.priceUsd === 0)) {
        return subscriptionService.createSubscription(ctx.user.id, input.planId);
      }

      // 3. Check no active subscription
      const existing = await subscriptionService.getCurrentSubscription(ctx.user.id);
      if (existing?.status === "active") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Already subscribed. Use changePlan to upgrade.",
        });
      }

      // 4. Get payment service
      let paymentService;
      try {
        paymentService = getPaymentService();
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment service not configured",
        });
      }

      // 5. Create Razorpay order
      const amount = input.currency === "INR" ? plan.priceInr : plan.priceUsd;
      const idempotencyKey = crypto.randomUUID();

      const result = await paymentService.createProviderOrder("razorpay", {
        amount,
        currency: input.currency,
        receipt: `sub_${idempotencyKey}`,
        notes: {
          userId: ctx.user.id,
          planId: plan.id,
          orderType: "subscription",
        },
      });

      // 6. Create payment order record
      const [order] = await db
        .insert(paymentOrders)
        .values({
          userId: ctx.user.id,
          creditPackId: null, // NULL for subscriptions
          subscriptionId: null, // Will be set after subscription created
          orderType: "subscription",
          provider: "razorpay",
          externalOrderId: result.externalOrderId,
          credits: (plan.credits ?? 0) + (plan.bonusCredits ?? 0),
          amount,
          currency: input.currency,
          status: "created",
          providerData: result.providerData,
          idempotencyKey,
        })
        .returning();

      // 7. Return checkout details
      return {
        orderId: order.id,
        externalOrderId: result.externalOrderId,
        amount,
        currency: input.currency,
        clientKey: paymentService.getClientKey("razorpay"),
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          credits: plan.credits,
          bonusCredits: plan.bonusCredits,
          billingInterval: plan.billingInterval,
          priceInr: plan.priceInr,
          priceUsd: plan.priceUsd,
        },
      };
    }),

  /**
   * Renew subscription
   * Creates a new payment order for subscription renewal
   */
  renewSubscription: protectedProcedure
    .input(
      z.object({
        currency: z.enum(["INR", "USD"]).default("INR"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Get current subscription
      const subscription = await subscriptionService.getCurrentSubscription(ctx.user.id);
      if (!subscription) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No subscription found to renew",
        });
      }

      // 2. Get plan details
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, subscription.planId));

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      // 3. Get payment service
      let paymentService;
      try {
        paymentService = getPaymentService();
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment service not configured",
        });
      }

      // 4. Create Razorpay order
      const amount = input.currency === "INR" ? plan.priceInr : plan.priceUsd;
      const idempotencyKey = crypto.randomUUID();

      const result = await paymentService.createProviderOrder("razorpay", {
        amount,
        currency: input.currency,
        receipt: `renewal_${idempotencyKey}`,
        notes: {
          userId: ctx.user.id,
          planId: plan.id,
          subscriptionId: subscription.id,
          orderType: "subscription",
          renewal: "true",
        },
      });

      // 5. Create payment order record linked to subscription
      const [order] = await db
        .insert(paymentOrders)
        .values({
          userId: ctx.user.id,
          creditPackId: null,
          subscriptionId: subscription.id, // Link to existing subscription
          orderType: "subscription",
          provider: "razorpay",
          externalOrderId: result.externalOrderId,
          credits: (plan.credits ?? 0) + (plan.bonusCredits ?? 0),
          amount,
          currency: input.currency,
          status: "created",
          providerData: result.providerData,
          idempotencyKey,
        })
        .returning();

      // 6. Return checkout details
      return {
        orderId: order.id,
        externalOrderId: result.externalOrderId,
        amount,
        currency: input.currency,
        clientKey: paymentService.getClientKey("razorpay"),
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          credits: plan.credits,
          bonusCredits: plan.bonusCredits,
          billingInterval: plan.billingInterval,
          priceInr: plan.priceInr,
          priceUsd: plan.priceUsd,
        },
      };
    }),

  /**
   * Change subscription plan (upgrade/downgrade)
   */
  changePlan: protectedProcedure
    .input(
      z.object({
        newPlanId: z.string(),
        effective: z.enum(["immediate", "next_period"]).default("next_period"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return subscriptionService.changePlan(
        ctx.user.id,
        input.newPlanId,
        input.effective
      );
    }),

  /**
   * Cancel subscription
   */
  cancel: protectedProcedure
    .input(
      z.object({
        cancelAtPeriodEnd: z.boolean().default(true),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return subscriptionService.cancelSubscription(
        ctx.user.id,
        input.cancelAtPeriodEnd,
        input.reason
      );
    }),

  /**
   * Reactivate cancelled subscription
   */
  reactivate: protectedProcedure.mutation(async ({ ctx }) => {
    return subscriptionService.reactivateSubscription(ctx.user.id);
  }),

  /**
   * Get usage statistics
   */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const stats = await subscriptionService.getUsageStats(ctx.user.id);

    if (!stats) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      });
    }

    return stats;
  }),
});
