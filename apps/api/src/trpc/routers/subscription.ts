import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { subscriptionPlans } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import { subscriptionService } from "../../services/subscription.service";
import { TRPCError } from "@trpc/server";

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
   * NOTE: Shows "Coming Soon" until Razorpay payment integration is ready
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
      })
    )
    .mutation(async () => {
      // Payment integration not ready yet
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Payment integration coming soon! Contact support to subscribe.",
      });

      // TODO: Uncomment when Razorpay integration is ready
      // return subscriptionService.createSubscription(ctx.user.id, input.planId);
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
