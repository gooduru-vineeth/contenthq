import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  subscriptionPlans,
  subscriptions,
  subscriptionChanges,
  user,
} from "@contenthq/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { subscriptionService } from "../../services/subscription.service";
import { TRPCError } from "@trpc/server";

/**
 * Admin Subscription Router - Admin-only subscription management
 *
 * Plan Management:
 * - listPlans: List all plans (with inactive filter)
 * - createPlan: Create new subscription plan
 * - updatePlan: Update existing plan
 * - togglePlanActive: Activate/deactivate plan
 * - deletePlan: Soft delete plan (set active = false)
 *
 * User Subscriptions:
 * - listSubscriptions: List all user subscriptions
 * - assignPlanToUser: Manually assign plan to user (for testing/support)
 * - getSubscriptionStats: Platform analytics
 */
export const adminSubscriptionRouter = router({
  // ─── Plan Management ───────────────────────────────────────────────

  /**
   * List all subscription plans
   */
  listPlans: adminProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const query = db.select().from(subscriptionPlans);

      if (!input?.includeInactive) {
        return query.where(eq(subscriptionPlans.active, true));
      }

      return query;
    }),

  /**
   * Create new subscription plan
   */
  createPlan: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
        description: z.string().optional(),
        credits: z.number().int().min(0),
        bonusCredits: z.number().int().default(0),
        priceInr: z.number().int().min(0),
        priceUsd: z.number().int().min(0),
        billingInterval: z.enum(["monthly", "yearly"]),
        features: z.record(z.unknown()).optional(),
        popular: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
        active: z.boolean().default(true),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(subscriptionPlans)
          .set({ isDefault: false })
          .where(eq(subscriptionPlans.isDefault, true));
      }

      const [plan] = await db
        .insert(subscriptionPlans)
        .values({
          ...input,
          monthlyCredits: input.credits, // Legacy field
          price: input.priceInr.toString(), // Legacy field
        })
        .returning();

      return plan;
    }),

  /**
   * Update subscription plan
   */
  updatePlan: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
        description: z.string().optional(),
        credits: z.number().int().min(0).optional(),
        bonusCredits: z.number().int().optional(),
        priceInr: z.number().int().min(0).optional(),
        priceUsd: z.number().int().min(0).optional(),
        billingInterval: z.enum(["monthly", "yearly"]).optional(),
        features: z.record(z.unknown()).optional(),
        popular: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await db
          .update(subscriptionPlans)
          .set({ isDefault: false })
          .where(eq(subscriptionPlans.isDefault, true));
      }

      const [plan] = await db
        .update(subscriptionPlans)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, id))
        .returning();

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      return plan;
    }),

  /**
   * Toggle plan active status
   */
  togglePlanActive: adminProcedure
    .input(
      z.object({
        id: z.string(),
        active: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const [plan] = await db
        .update(subscriptionPlans)
        .set({
          active: input.active,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, input.id))
        .returning();

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      return plan;
    }),

  /**
   * Delete plan (soft delete - sets active = false)
   */
  deletePlan: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if plan has active subscriptions
      const activeSubsCount = await db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.planId, input.id),
            eq(subscriptions.status, "active")
          )
        );

      if (activeSubsCount[0].count > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Cannot delete plan with ${activeSubsCount[0].count} active subscriptions. Deactivate instead.`,
        });
      }

      const [plan] = await db
        .update(subscriptionPlans)
        .set({
          active: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, input.id))
        .returning();

      if (!plan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subscription plan not found",
        });
      }

      return plan;
    }),

  // ─── User Subscriptions ────────────────────────────────────────────

  /**
   * List all user subscriptions
   */
  listSubscriptions: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["active", "cancelled", "expired"]).optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(subscriptions.status, input.status));
      }

      const query = db
        .select({
          subscription: subscriptions,
          plan: subscriptionPlans,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        })
        .from(subscriptions)
        .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .innerJoin(user, eq(subscriptions.userId, user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }

      return query;
    }),

  /**
   * Manually assign plan to user (for testing/support)
   */
  assignPlanToUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        planId: z.string(),
        durationMonths: z.number().int().min(1).max(12).default(1),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if user exists
      const [targetUser] = await db
        .select()
        .from(user)
        .where(eq(user.id, input.userId));

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Create subscription
      const subscription = await subscriptionService.createSubscription(
        input.userId,
        input.planId
      );

      // If duration is not 1 month, update the period end
      if (input.durationMonths !== 1) {
        const newPeriodEnd = new Date(subscription.currentPeriodStart);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + input.durationMonths);

        await db
          .update(subscriptions)
          .set({
            currentPeriodEnd: newPeriodEnd,
            metadata: {
              adminAssigned: true,
              durationMonths: input.durationMonths,
              reason: input.reason,
            },
          })
          .where(eq(subscriptions.id, subscription.id));
      }

      return subscription;
    }),

  /**
   * Get subscription statistics
   */
  getSubscriptionStats: adminProcedure.query(async () => {
    // Total subscriptions by status
    const byStatus = await db
      .select({
        status: subscriptions.status,
        count: count(),
      })
      .from(subscriptions)
      .groupBy(subscriptions.status);

    // Total subscriptions by plan
    const byPlan = await db
      .select({
        planId: subscriptions.planId,
        planName: subscriptionPlans.name,
        count: count(),
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.planId, subscriptionPlans.name);

    // Total revenue (assuming all subscriptions are paid)
    const revenue = await db
      .select({
        totalInr: sql<number>`SUM(${subscriptionPlans.priceInr})`,
        totalUsd: sql<number>`SUM(${subscriptionPlans.priceUsd})`,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(eq(subscriptions.status, "active"));

    return {
      byStatus,
      byPlan,
      revenue: revenue[0],
    };
  }),

  /**
   * Get subscription changes (audit trail)
   */
  getSubscriptionChanges: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        subscriptionId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const conditions = [];

      if (input.userId) {
        conditions.push(eq(subscriptionChanges.userId, input.userId));
      }

      if (input.subscriptionId) {
        conditions.push(eq(subscriptionChanges.subscriptionId, input.subscriptionId));
      }

      const query = db
        .select()
        .from(subscriptionChanges)
        .orderBy(desc(subscriptionChanges.createdAt))
        .limit(input.limit);

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }

      return query;
    }),
});
