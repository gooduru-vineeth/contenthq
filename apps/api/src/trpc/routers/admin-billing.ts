import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { creditService } from "../../services/credit.service";
import { db } from "@contenthq/db/client";
import { creditBalances } from "@contenthq/db/schema";
import { user } from "@contenthq/db/schema";
import { eq, sql, like, or } from "drizzle-orm";

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
      })
      .from(creditBalances);

    return {
      totalUsers: stats?.totalUsers ?? 0,
      totalBalance: stats?.totalBalance ?? 0,
      totalReserved: stats?.totalReserved ?? 0,
      totalAvailable:
        (stats?.totalBalance ?? 0) - (stats?.totalReserved ?? 0),
    };
  }),
});
