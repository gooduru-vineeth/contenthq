import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { creditService } from "../../services/credit.service";
import { db } from "@contenthq/db/client";
import {
  creditBalances,
  creditTransactions,
  bonusCredits,
  paymentOrders,
} from "@contenthq/db/schema";
import { user } from "@contenthq/db/schema";
import { eq, sql, like, or, and, gte, desc } from "drizzle-orm";

export const adminBillingRouter = router({
  /**
   * List all user credit balances with optional search by email or name.
   * Joins credit_balances with user to provide identifying information.
   */
  listBalances: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const search = input?.search;

      const query = db
        .select({
          id: creditBalances.id,
          userId: creditBalances.userId,
          balance: creditBalances.balance,
          reservedBalance: creditBalances.reservedBalance,
          lifetimeCreditsReceived: creditBalances.lifetimeCreditsReceived,
          lifetimeCreditsUsed: creditBalances.lifetimeCreditsUsed,
          bonusBalance: creditBalances.bonusBalance,
          lastUpdated: creditBalances.lastUpdated,
          userName: user.name,
          userEmail: user.email,
        })
        .from(creditBalances)
        .innerJoin(user, eq(creditBalances.userId, user.id));

      if (search) {
        const pattern = `%${search}%`;
        const rows = await query
          .where(or(like(user.email, pattern), like(user.name, pattern)))
          .limit(limit)
          .offset(offset);
        return rows;
      }

      return query.limit(limit).offset(offset);
    }),

  /**
   * Get the full credit balance for a specific user.
   */
  getUserBalance: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return creditService.getBalance(input.userId);
    }),

  /**
   * Admin grants credits to a user. Records the admin's user ID in the
   * transaction metadata for auditing.
   */
  grantCredits: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().int().min(1),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return creditService.adminGrantCredits(
        ctx.user.id,
        input.userId,
        input.amount,
        input.reason
      );
    }),

  /**
   * Admin deducts credits from a user. Records the admin's user ID in the
   * transaction metadata for auditing.
   */
  deductCreditsFromUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().int().min(1),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return creditService.adminDeductCredits(
        ctx.user.id,
        input.userId,
        input.amount,
        input.reason
      );
    }),

  /**
   * List credit transactions for a specific user (admin view).
   */
  getUserTransactions: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      return creditService.getTransactions(input.userId, {
        limit: input.limit,
        offset: input.offset,
      });
    }),

  /**
   * Aggregate usage summary across all users: total users with balances,
   * total credits in the system, and total reserved credits.
   */
  getUsageSummary: adminProcedure.query(async () => {
    const [stats] = await db
      .select({
        totalUsers: sql<number>`count(*)::int`,
        totalBalance: sql<number>`coalesce(sum(${creditBalances.balance}), 0)::int`,
        totalReserved: sql<number>`coalesce(sum(${creditBalances.reservedBalance}), 0)::int`,
        totalLifetimeReceived: sql<number>`coalesce(sum(${creditBalances.lifetimeCreditsReceived}), 0)::int`,
        totalLifetimeUsed: sql<number>`coalesce(sum(${creditBalances.lifetimeCreditsUsed}), 0)::int`,
      })
      .from(creditBalances);

    return {
      totalUsers: stats?.totalUsers ?? 0,
      totalBalance: stats?.totalBalance ?? 0,
      totalReserved: stats?.totalReserved ?? 0,
      totalAvailable:
        (stats?.totalBalance ?? 0) - (stats?.totalReserved ?? 0),
      totalLifetimeReceived: stats?.totalLifetimeReceived ?? 0,
      totalLifetimeUsed: stats?.totalLifetimeUsed ?? 0,
    };
  }),

  /**
   * Get lifetime metrics for a specific user including usage percentage,
   * burn rate (avg daily usage over last 30 days), and estimated days remaining.
   */
  getUserLifetimeMetrics: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const balance = await creditService.getBalance(input.userId);

      const lifetimeReceived = balance.lifetimeCreditsReceived ?? 0;
      const lifetimeUsed = balance.lifetimeCreditsUsed ?? 0;
      const currentBalance = balance.balance ?? 0;

      // Usage percentage
      const usagePercentage =
        lifetimeReceived > 0
          ? Math.round((lifetimeUsed / lifetimeReceived) * 10000) / 100
          : 0;

      // Calculate burn rate: average daily usage over the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [usageStats] = await db
        .select({
          totalUsed: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          transactionCount: sql<number>`count(*)::int`,
          earliestTransaction: sql<Date>`min(${creditTransactions.createdAt})`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, input.userId),
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, thirtyDaysAgo)
          )
        );

      const totalUsedLast30Days = usageStats?.totalUsed ?? 0;

      // Calculate actual days with data (min 1 to avoid division by zero)
      const earliest = usageStats?.earliestTransaction;
      let activeDays = 30;
      if (earliest) {
        const daysSinceFirst = Math.ceil(
          (Date.now() - new Date(earliest).getTime()) / (1000 * 60 * 60 * 24)
        );
        activeDays = Math.min(30, Math.max(1, daysSinceFirst));
      }

      const avgDailyBurn =
        activeDays > 0
          ? Math.round((totalUsedLast30Days / activeDays) * 100) / 100
          : 0;

      // Estimated days remaining
      const daysRemaining =
        avgDailyBurn > 0 ? Math.round(currentBalance / avgDailyBurn) : null;

      return {
        userId: input.userId,
        currentBalance,
        lifetimeCreditsReceived: lifetimeReceived,
        lifetimeCreditsUsed: lifetimeUsed,
        usagePercentage,
        burnRate: {
          avgDailyCredits: avgDailyBurn,
          periodDays: activeDays,
          totalUsedInPeriod: totalUsedLast30Days,
          transactionCount: usageStats?.transactionCount ?? 0,
        },
        daysRemaining,
      };
    }),

  /**
   * Grant bonus credits to a user. Creates a bonus_credits record and
   * increments the user's bonusBalance.
   */
  grantBonus: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().int().min(1),
        source: z.enum([
          "promotional",
          "referral",
          "compensation",
          "loyalty",
          "trial",
          "admin_grant",
          "signup_bonus",
        ]),
        description: z.string().optional(),
        campaignId: z.string().optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        // Create bonus credit record
        const [bonus] = await tx
          .insert(bonusCredits)
          .values({
            userId: input.userId,
            originalAmount: input.amount,
            remainingAmount: input.amount,
            source: input.source,
            description: input.description ?? null,
            campaignId: input.campaignId ?? null,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            grantedBy: ctx.user.id,
            metadata: { grantedBy: ctx.user.id },
          })
          .returning();

        // Increment bonus balance
        await tx
          .update(creditBalances)
          .set({
            bonusBalance: sql`${creditBalances.bonusBalance} + ${input.amount}`,
            lastUpdated: new Date(),
          })
          .where(eq(creditBalances.userId, input.userId));

        // Record as a credit transaction for audit trail
        await tx.insert(creditTransactions).values({
          userId: input.userId,
          type: "bonus_grant",
          amount: input.amount,
          description: `Bonus: ${input.source}${input.description ? ` - ${input.description}` : ""}`,
          adminUserId: ctx.user.id,
          metadata: {
            bonusCreditId: bonus!.id,
            source: input.source,
            campaignId: input.campaignId,
          },
        });

        return bonus!;
      });
    }),

  /**
   * List bonus credit records for a specific user.
   */
  getUserBonusCredits: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return db
        .select()
        .from(bonusCredits)
        .where(eq(bonusCredits.userId, input.userId))
        .orderBy(desc(bonusCredits.createdAt))
        .limit(input.limit);
    }),

  /**
   * Process authorized payments that haven't been processed yet.
   * This is a one-time fix for payments that were authorized before
   * the webhook was updated to handle both authorized and captured events.
   */
  processAuthorizedPayments: adminProcedure.mutation(async () => {
    // Find all authorized payments that don't have a credit transaction
    const authorizedOrders = await db
      .select()
      .from(paymentOrders)
      .where(
        and(
          eq(paymentOrders.status, "authorized"),
          eq(paymentOrders.orderType, "credit_pack"),
          sql`${paymentOrders.creditTransactionId} IS NULL`
        )
      );

    const results: Array<{ orderId: string; success: boolean; error?: string }> = [];

    for (const order of authorizedOrders) {
      try {
        await db.transaction(async (tx) => {
          // Lock the credit balance row
          const balanceResult = await tx.execute(
            sql`SELECT * FROM credit_balances WHERE user_id = ${order.userId} FOR UPDATE`
          );
          let currentBalance = balanceResult.rows?.[0] as { balance: number } | undefined;

          if (!currentBalance) {
            // Create balance if not exists
            await tx.insert(creditBalances).values({
              userId: order.userId,
              balance: 0,
            });
            currentBalance = { balance: 0 };
          }

          // Add credits
          const newBalance = (currentBalance.balance ?? 0) + order.credits;

          await tx
            .update(creditBalances)
            .set({
              balance: newBalance,
              lastUpdated: new Date(),
            })
            .where(eq(creditBalances.userId, order.userId));

          // Record transaction
          const [transaction] = await tx
            .insert(creditTransactions)
            .values({
              userId: order.userId,
              type: "purchase",
              amount: order.credits,
              description: `Purchased ${order.credits} credits (manual processing)`,
              metadata: {
                paymentOrderId: order.id,
                provider: order.provider,
                externalPaymentId: order.externalPaymentId,
                amount: order.amount,
                currency: order.currency,
                note: "Manually processed authorized payment",
              },
            })
            .returning();

          // Update order to mark as processed
          await tx
            .update(paymentOrders)
            .set({
              creditTransactionId: transaction.id,
              updatedAt: new Date(),
            })
            .where(eq(paymentOrders.id, order.id));
        });

        results.push({ orderId: order.id, success: true });
      } catch (error) {
        results.push({
          orderId: order.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      totalProcessed: authorizedOrders.length,
      results,
    };
  }),
});
