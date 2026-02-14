import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  creditTransactions,
  dailyUsageSummaries,
  user,
} from "@contenthq/db/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";

export const analyticsRouter = router({
  /**
   * Get personal usage for the authenticated user, grouped by day/week/month.
   */
  getMyUsage: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        groupBy: z.enum(["day", "week", "month"]).default("day"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Try daily_usage_summaries first for efficient aggregation
      const summaries = await db
        .select()
        .from(dailyUsageSummaries)
        .where(
          and(
            eq(dailyUsageSummaries.userId, userId),
            gte(dailyUsageSummaries.date, input.startDate),
            lte(dailyUsageSummaries.date, input.endDate)
          )
        )
        .orderBy(dailyUsageSummaries.date);

      if (summaries.length > 0) {
        return { source: "summaries" as const, data: summaries };
      }

      // Fall back to credit_transactions for recent data
      const transactions = await db
        .select({
          date: sql<string>`date(${creditTransactions.createdAt})`,
          totalRequests: sql<number>`count(*)::int`,
          totalCreditsUsed: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, new Date(input.startDate)),
            lte(creditTransactions.createdAt, new Date(input.endDate))
          )
        )
        .groupBy(sql`date(${creditTransactions.createdAt})`)
        .orderBy(sql`date(${creditTransactions.createdAt})`);

      return { source: "transactions" as const, data: transactions };
    }),

  /**
   * Get credits used per model for the authenticated user.
   */
  getUsageByModel: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return db
        .select({
          model: creditTransactions.model,
          provider: creditTransactions.provider,
          totalCredits: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          requestCount: sql<number>`count(*)::int`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, ctx.user.id),
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, new Date(input.startDate)),
            lte(creditTransactions.createdAt, new Date(input.endDate)),
            sql`${creditTransactions.model} IS NOT NULL`
          )
        )
        .groupBy(creditTransactions.model, creditTransactions.provider)
        .orderBy(
          desc(
            sql`coalesce(sum(abs(${creditTransactions.amount})), 0)`
          )
        );
    }),

  /**
   * Get credits used per provider for the authenticated user.
   */
  getUsageByProvider: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return db
        .select({
          provider: creditTransactions.provider,
          totalCredits: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          requestCount: sql<number>`count(*)::int`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, ctx.user.id),
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, new Date(input.startDate)),
            lte(creditTransactions.createdAt, new Date(input.endDate)),
            sql`${creditTransactions.provider} IS NOT NULL`
          )
        )
        .groupBy(creditTransactions.provider)
        .orderBy(
          desc(
            sql`coalesce(sum(abs(${creditTransactions.amount})), 0)`
          )
        );
    }),

  /**
   * Get the average daily burn rate for the authenticated user.
   */
  getBurnRate: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const [stats] = await db
        .select({
          totalUsed: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          requestCount: sql<number>`count(*)::int`,
          firstDate: sql<Date>`min(${creditTransactions.createdAt})`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.userId, ctx.user.id),
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, since)
          )
        );

      const totalUsed = stats?.totalUsed ?? 0;
      const firstDate = stats?.firstDate;

      let activeDays = input.days;
      if (firstDate) {
        const daysSinceFirst = Math.ceil(
          (Date.now() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        activeDays = Math.min(input.days, Math.max(1, daysSinceFirst));
      }

      const avgDaily = Math.round((totalUsed / activeDays) * 100) / 100;

      return {
        totalUsed,
        periodDays: activeDays,
        avgDailyCredits: avgDaily,
        requestCount: stats?.requestCount ?? 0,
      };
    }),

  // ─── Admin Procedures ──────────────────────────────────────────────────

  /**
   * Platform-wide usage statistics for admins.
   */
  adminGetPlatformUsage: adminProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const conditions = [eq(creditTransactions.type, "usage")];

      if (input?.startDate) {
        conditions.push(
          gte(creditTransactions.createdAt, new Date(input.startDate))
        );
      }
      if (input?.endDate) {
        conditions.push(
          lte(creditTransactions.createdAt, new Date(input.endDate))
        );
      }

      const [stats] = await db
        .select({
          totalRequests: sql<number>`count(*)::int`,
          totalCreditsUsed: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          uniqueUsers: sql<number>`count(distinct ${creditTransactions.userId})::int`,
        })
        .from(creditTransactions)
        .where(and(...conditions));

      // Daily trend for the query period
      const daily = await db
        .select({
          date: sql<string>`date(${creditTransactions.createdAt})`,
          credits: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          requests: sql<number>`count(*)::int`,
        })
        .from(creditTransactions)
        .where(and(...conditions))
        .groupBy(sql`date(${creditTransactions.createdAt})`)
        .orderBy(sql`date(${creditTransactions.createdAt})`)
        .limit(90);

      return {
        totalRequests: stats?.totalRequests ?? 0,
        totalCreditsUsed: stats?.totalCreditsUsed ?? 0,
        uniqueUsers: stats?.uniqueUsers ?? 0,
        dailyTrend: daily,
      };
    }),

  /**
   * Top users ranked by credits used, requests, or cost.
   */
  adminGetTopUsers: adminProcedure
    .input(
      z.object({
        sortBy: z
          .enum(["credits", "requests"])
          .default("credits"),
        limit: z.number().int().min(1).max(100).default(20),
        days: z.number().int().min(1).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const orderExpr =
        input.sortBy === "credits"
          ? sql`coalesce(sum(abs(${creditTransactions.amount})), 0)`
          : sql`count(*)`;

      return db
        .select({
          userId: creditTransactions.userId,
          userName: user.name,
          userEmail: user.email,
          totalCredits: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          requestCount: sql<number>`count(*)::int`,
        })
        .from(creditTransactions)
        .innerJoin(user, eq(creditTransactions.userId, user.id))
        .where(
          and(
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, since)
          )
        )
        .groupBy(creditTransactions.userId, user.name, user.email)
        .orderBy(desc(orderExpr))
        .limit(input.limit);
    }),

  /**
   * Model usage across all users (admin view).
   */
  adminGetModelUsage: adminProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(365).default(30),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const since = new Date();
      since.setDate(since.getDate() - (input?.days ?? 30));

      return db
        .select({
          model: creditTransactions.model,
          provider: creditTransactions.provider,
          totalCredits: sql<number>`coalesce(sum(abs(${creditTransactions.amount})), 0)::int`,
          requestCount: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${creditTransactions.userId})::int`,
        })
        .from(creditTransactions)
        .where(
          and(
            eq(creditTransactions.type, "usage"),
            gte(creditTransactions.createdAt, since),
            sql`${creditTransactions.model} IS NOT NULL`
          )
        )
        .groupBy(creditTransactions.model, creditTransactions.provider)
        .orderBy(
          desc(
            sql`coalesce(sum(abs(${creditTransactions.amount})), 0)`
          )
        );
    }),
});
