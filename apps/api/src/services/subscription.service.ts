import { db } from "@contenthq/db/client";
import {
  subscriptions,
  subscriptionPlans,
  subscriptionChanges,
  creditBalances,
  creditTransactions,
} from "@contenthq/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Subscription Service - Manages user subscriptions and plan assignments
 *
 * Features:
 * - Create subscriptions with credit grants
 * - Change plans (upgrade/downgrade) with immediate or next-period effective date
 * - Cancel subscriptions (immediate or end-of-period)
 * - Reactivate cancelled subscriptions
 * - Track usage statistics and burn rate
 * - Auto-assign default plan to new users
 */

// ─── Helper Interfaces ───────────────────────────────────────────────

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  cancelled_at: Date | null;
  credits_granted: number;
  credits_used: number;
  plan_snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

interface CreditBalanceRow {
  id: string;
  user_id: string;
  balance: number | null;
  reserved_balance: number;
  lifetime_credits_received: number;
  lifetime_credits_used: number;
  last_updated: Date;
}

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Get user's current active subscription
 */
async function getCurrentSubscription(userId: string) {
  const [subscription] = await db
    .select({
      subscription: subscriptions,
      plan: subscriptionPlans,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  if (!subscription) {
    return null;
  }

  return {
    id: subscription.subscription.id,
    userId: subscription.subscription.userId,
    planId: subscription.subscription.planId,
    status: subscription.subscription.status,
    currentPeriodStart: subscription.subscription.currentPeriodStart,
    currentPeriodEnd: subscription.subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.subscription.cancelAtPeriodEnd,
    cancelledAt: subscription.subscription.cancelledAt,
    creditsGranted: subscription.subscription.creditsGranted,
    creditsUsed: subscription.subscription.creditsUsed,
    creditsRemaining: subscription.subscription.creditsGranted - subscription.subscription.creditsUsed,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      slug: subscription.plan.slug,
      description: subscription.plan.description,
      credits: subscription.plan.credits,
      bonusCredits: subscription.plan.bonusCredits,
      priceInr: subscription.plan.priceInr,
      priceUsd: subscription.plan.priceUsd,
      billingInterval: subscription.plan.billingInterval,
      features: subscription.plan.features,
    },
    metadata: subscription.subscription.metadata,
    createdAt: subscription.subscription.createdAt,
    updatedAt: subscription.subscription.updatedAt,
  };
}

/**
 * Create a new subscription for a user
 *
 * @param userId - Target user ID
 * @param planId - Subscription plan ID
 * @returns Created subscription with plan details
 */
async function createSubscription(userId: string, planId: string) {
  return await db.transaction(async (tx) => {
    // 1. Validate plan is active
    const [plan] = await tx
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));

    if (!plan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscription plan not found",
      });
    }

    if (!plan.active) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This plan is no longer available",
      });
    }

    // 2. Check user doesn't have active subscription
    const existing = await tx
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      );

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User already has an active subscription. Use changePlan to upgrade/downgrade.",
      });
    }

    // 3. Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.billingInterval === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // 4. Create plan snapshot
    const planSnapshot = {
      name: plan.name,
      credits: plan.credits,
      priceInr: plan.priceInr,
      priceUsd: plan.priceUsd,
      billingInterval: plan.billingInterval,
    };

    // 5. Create subscription record
    const [subscription] = await tx
      .insert(subscriptions)
      .values({
        userId,
        planId,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        creditsGranted: (plan.credits ?? 0) + (plan.bonusCredits ?? 0),
        creditsUsed: 0,
        planSnapshot,
        cancelAtPeriodEnd: false,
      })
      .returning();

    // 6. Grant credits to credit_balances
    const totalCredits = (plan.credits ?? 0) + (plan.bonusCredits ?? 0);

    const balResult = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    const existingBalance = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (existingBalance) {
      await tx
        .update(creditBalances)
        .set({
          balance: (existingBalance.balance ?? 0) + totalCredits,
          lifetimeCreditsReceived: (existingBalance.lifetime_credits_received ?? 0) + totalCredits,
          lastUpdated: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
    } else {
      await tx.insert(creditBalances).values({
        userId,
        balance: totalCredits,
        reservedBalance: 0,
        lifetimeCreditsReceived: totalCredits,
      });
    }

    // 7. Record credit transaction
    await tx.insert(creditTransactions).values({
      userId,
      type: "subscription_grant",
      amount: totalCredits,
      description: `Subscription: ${plan.name} (${plan.billingInterval})`,
      metadata: {
        subscriptionId: subscription!.id,
        planId: plan.id,
        planName: plan.name,
      },
    });

    // 8. Create subscription change record
    await tx.insert(subscriptionChanges).values({
      subscriptionId: subscription!.id,
      userId,
      changeType: "created",
      toPlanId: planId,
      effectiveDate: now,
      reason: "New subscription",
    });

    return subscription!;
  });
}

/**
 * Change user's subscription plan
 *
 * @param userId - User ID
 * @param newPlanId - New plan ID
 * @param effective - When to apply: "immediate" or "next_period"
 */
async function changePlan(
  userId: string,
  newPlanId: string,
  effective: "immediate" | "next_period" = "next_period"
) {
  return await db.transaction(async (tx) => {
    // 1. Get current subscription
    const subResult = await tx.execute(
      sql`SELECT * FROM subscriptions WHERE user_id = ${userId} AND status = 'active' FOR UPDATE`
    );
    const currentSub = subResult.rows?.[0] as unknown as SubscriptionRow | undefined;

    if (!currentSub) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      });
    }

    // 2. Get new plan
    const [newPlan] = await tx
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, newPlanId));

    if (!newPlan || !newPlan.active) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Subscription plan not found or inactive",
      });
    }

    if (currentSub.plan_id === newPlanId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are already on this plan",
      });
    }

    // 3. Determine if upgrade or downgrade
    const currentPlanCredits = currentSub.credits_granted;
    const newPlanCredits = (newPlan.credits ?? 0) + (newPlan.bonusCredits ?? 0);
    const changeType = newPlanCredits > currentPlanCredits ? "upgraded" : "downgraded";

    if (effective === "immediate") {
      // Calculate prorated credits
      const now = new Date();
      const periodStart = new Date(currentSub.current_period_start);
      const periodEnd = new Date(currentSub.current_period_end);
      const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
      const remainingDays = (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const proratedCredits = Math.floor((newPlanCredits * remainingDays) / totalDays);

      // Update subscription
      await tx
        .update(subscriptions)
        .set({
          planId: newPlanId,
          creditsGranted: proratedCredits,
          planSnapshot: {
            name: newPlan.name,
            credits: newPlan.credits,
            priceInr: newPlan.priceInr,
            priceUsd: newPlan.priceUsd,
            billingInterval: newPlan.billingInterval,
          },
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, currentSub.id));

      // Grant prorated credits
      const creditsToGrant = Math.max(0, proratedCredits - currentSub.credits_used);
      if (creditsToGrant > 0) {
        const balResult = await tx.execute(
          sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
        );
        const balance = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

        if (balance) {
          await tx
            .update(creditBalances)
            .set({
              balance: (balance.balance ?? 0) + creditsToGrant,
              lifetimeCreditsReceived: (balance.lifetime_credits_received ?? 0) + creditsToGrant,
              lastUpdated: new Date(),
            })
            .where(eq(creditBalances.userId, userId));

          await tx.insert(creditTransactions).values({
            userId,
            type: "subscription_grant",
            amount: creditsToGrant,
            description: `Plan change: ${newPlan.name} (prorated)`,
            metadata: {
              subscriptionId: currentSub.id,
              planId: newPlan.id,
              prorated: true,
            },
          });
        }
      }

      // Record change
      await tx.insert(subscriptionChanges).values({
        subscriptionId: currentSub.id,
        userId,
        changeType,
        fromPlanId: currentSub.plan_id,
        toPlanId: newPlanId,
        effectiveDate: now,
        reason: "Immediate plan change",
      });
    } else {
      // Schedule for next period
      const metadata = currentSub.metadata as Record<string, unknown> || {};
      await tx
        .update(subscriptions)
        .set({
          metadata: {
            ...metadata,
            scheduledPlanChange: {
              newPlanId,
              newPlanName: newPlan.name,
              changeType,
              scheduledAt: new Date(),
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, currentSub.id));

      // Record change
      await tx.insert(subscriptionChanges).values({
        subscriptionId: currentSub.id,
        userId,
        changeType,
        fromPlanId: currentSub.plan_id,
        toPlanId: newPlanId,
        effectiveDate: new Date(currentSub.current_period_end),
        reason: "Scheduled plan change (next period)",
      });
    }
  });
}

/**
 * Cancel user's subscription
 *
 * @param userId - User ID
 * @param cancelAtPeriodEnd - If true, cancel at period end; if false, cancel immediately
 * @param reason - Optional cancellation reason
 */
async function cancelSubscription(
  userId: string,
  cancelAtPeriodEnd: boolean = true,
  reason?: string
) {
  return await db.transaction(async (tx) => {
    const subResult = await tx.execute(
      sql`SELECT * FROM subscriptions WHERE user_id = ${userId} AND status = 'active' FOR UPDATE`
    );
    const subscription = subResult.rows?.[0] as unknown as SubscriptionRow | undefined;

    if (!subscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No active subscription found",
      });
    }

    const now = new Date();

    await tx
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd,
        cancelledAt: now,
        status: cancelAtPeriodEnd ? "active" : "cancelled",
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscription.id));

    // Record change
    await tx.insert(subscriptionChanges).values({
      subscriptionId: subscription.id,
      userId,
      changeType: "cancelled",
      fromPlanId: subscription.plan_id,
      effectiveDate: cancelAtPeriodEnd ? new Date(subscription.current_period_end) : now,
      reason: reason || (cancelAtPeriodEnd ? "Cancelled at period end" : "Cancelled immediately"),
    });
  });
}

/**
 * Reactivate a cancelled subscription
 */
async function reactivateSubscription(userId: string) {
  return await db.transaction(async (tx) => {
    const subResult = await tx.execute(
      sql`SELECT * FROM subscriptions WHERE user_id = ${userId} AND status = 'active' AND cancel_at_period_end = true FOR UPDATE`
    );
    const subscription = subResult.rows?.[0] as unknown as SubscriptionRow | undefined;

    if (!subscription) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No cancellable subscription found",
      });
    }

    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);

    if (now >= periodEnd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Subscription period has already ended",
      });
    }

    await tx
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        status: "active",
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscription.id));

    // Record change
    await tx.insert(subscriptionChanges).values({
      subscriptionId: subscription.id,
      userId,
      changeType: "reactivated",
      toPlanId: subscription.plan_id,
      effectiveDate: now,
      reason: "Reactivated subscription",
    });
  });
}

/**
 * Get usage statistics for user's subscription
 */
async function getUsageStats(userId: string) {
  const subscription = await getCurrentSubscription(userId);

  if (!subscription) {
    return null;
  }

  const remaining = subscription.creditsGranted - subscription.creditsUsed;
  const usagePercent = (subscription.creditsUsed / subscription.creditsGranted) * 100;

  // Calculate burn rate (credits per day)
  const periodDays =
    (subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24);
  const daysElapsed =
    (Date.now() - subscription.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24);
  const burnRate = daysElapsed > 0 ? subscription.creditsUsed / daysElapsed : 0;
  const daysRemaining = burnRate > 0 ? Math.floor(remaining / burnRate) : null;

  return {
    creditsUsed: subscription.creditsUsed,
    creditsGranted: subscription.creditsGranted,
    remaining,
    usagePercent: Math.round(usagePercent * 100) / 100,
    burnRate: Math.round(burnRate * 100) / 100,
    daysRemaining,
    periodDays: Math.round(periodDays),
    daysElapsed: Math.round(daysElapsed),
  };
}

/**
 * Auto-assign default plan to new user
 */
async function assignDefaultPlan(userId: string) {
  const [freePlan] = await db
    .select()
    .from(subscriptionPlans)
    .where(
      and(
        eq(subscriptionPlans.isDefault, true),
        eq(subscriptionPlans.active, true)
      )
    )
    .limit(1);

  if (!freePlan) {
    console.warn("[SubscriptionService] No default plan found for auto-assignment");
    return null;
  }

  try {
    return await createSubscription(userId, freePlan.id);
  } catch (error) {
    // If user already has a subscription, ignore
    if (error instanceof TRPCError && error.code === "CONFLICT") {
      return null;
    }
    throw error;
  }
}

/**
 * Update subscription credits used (called by credit service)
 */
async function incrementCreditsUsed(
  subscriptionId: string,
  amount: number
) {
  return await db.transaction(async (tx) => {
    const subResult = await tx.execute(
      sql`SELECT * FROM subscriptions WHERE id = ${subscriptionId} FOR UPDATE`
    );
    const subscription = subResult.rows?.[0] as unknown as SubscriptionRow | undefined;

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const newUsed = subscription.credits_used + amount;

    await tx
      .update(subscriptions)
      .set({
        creditsUsed: newUsed,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscriptionId));

    return newUsed;
  });
}

// ─── Exports ─────────────────────────────────────────────────────────

export const subscriptionService = {
  getCurrentSubscription,
  createSubscription,
  changePlan,
  cancelSubscription,
  reactivateSubscription,
  getUsageStats,
  assignDefaultPlan,
  incrementCreditsUsed,
};
