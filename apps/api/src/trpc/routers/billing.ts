import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { subscriptions, subscriptionPlans } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import { creditService } from "../../services/credit.service";
import { subscriptionService } from "../../services/subscription.service";

export const billingRouter = router({
  /**
   * Get the current user's credit balance.
   * Creates a default balance with free credits for new users.
   */
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await creditService.getBalance(ctx.user.id);
    const subscription = await subscriptionService.getCurrentSubscription(ctx.user.id);

    return {
      ...balance,
      subscription: subscription
        ? {
            planName: subscription.plan.name,
            planSlug: subscription.plan.slug,
            creditsGranted: subscription.creditsGranted,
            creditsUsed: subscription.creditsUsed,
            creditsRemaining: subscription.creditsGranted - subscription.creditsUsed,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          }
        : null,
    };
  }),

  /**
   * Get the current user's available balance (balance minus reserved).
   */
  getAvailableBalance: protectedProcedure.query(async ({ ctx }) => {
    const available = await creditService.getAvailableBalance(ctx.user.id);
    return { available };
  }),

  /**
   * List credit transactions for the current user.
   */
  getTransactions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
          type: z.string().optional(),
          projectId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return creditService.getTransactions(ctx.user.id, {
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        type: input?.type,
        projectId: input?.projectId,
      });
    }),

  /**
   * Get the current user's active subscription with plan details.
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id));

    if (!sub) return null;

    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, sub.planId));

    return { ...sub, plan: plan ?? null };
  }),

  /**
   * List all available subscription plans.
   */
  getPlans: protectedProcedure.query(async () => {
    return db.select().from(subscriptionPlans);
  }),

  /**
   * Deduct credits from the current user's balance.
   * Uses atomic SELECT ... FOR UPDATE to prevent race conditions.
   */
  deductCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().int().min(1),
        description: z.string(),
        jobId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return creditService.deductCredits(
        ctx.user.id,
        input.amount,
        input.description,
        {
          jobId: input.jobId,
          type: "usage",
        }
      );
    }),

  /**
   * Add credits to the current user's balance.
   * Uses atomic SELECT ... FOR UPDATE to prevent race conditions.
   */
  addCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().int().min(1),
        description: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return creditService.addCredits(
        ctx.user.id,
        input.amount,
        input.description,
        "purchase"
      );
    }),
});
