import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  creditBalances,
  creditTransactions,
  subscriptions,
  subscriptionPlans,
} from "@contenthq/db/schema";
import { eq, desc } from "drizzle-orm";

export const billingRouter = router({
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const [balance] = await db
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, ctx.user.id));

    if (!balance) {
      // Create initial balance for new users
      const [newBalance] = await db
        .insert(creditBalances)
        .values({ userId: ctx.user.id, balance: 50 })
        .returning();
      return newBalance;
    }
    return balance;
  }),

  getTransactions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, ctx.user.id))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(input?.limit ?? 50);
    }),

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

  getPlans: protectedProcedure.query(async () => {
    return db.select().from(subscriptionPlans);
  }),

  deductCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().int().min(1),
        description: z.string(),
        jobId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [balance] = await db
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, ctx.user.id));

      if (!balance || (balance.balance ?? 0) < input.amount) {
        throw new Error("Insufficient credits");
      }

      // Deduct credits
      await db
        .update(creditBalances)
        .set({
          balance: (balance.balance ?? 0) - input.amount,
          lastUpdated: new Date(),
        })
        .where(eq(creditBalances.userId, ctx.user.id));

      // Record transaction
      const [transaction] = await db
        .insert(creditTransactions)
        .values({
          userId: ctx.user.id,
          type: "deduction",
          amount: -input.amount,
          description: input.description,
          jobId: input.jobId,
        })
        .returning();

      return transaction;
    }),

  addCredits: protectedProcedure
    .input(
      z.object({
        amount: z.number().int().min(1),
        description: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert balance
      const [existing] = await db
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, ctx.user.id));

      if (existing) {
        await db
          .update(creditBalances)
          .set({
            balance: (existing.balance ?? 0) + input.amount,
            lastUpdated: new Date(),
          })
          .where(eq(creditBalances.userId, ctx.user.id));
      } else {
        await db
          .insert(creditBalances)
          .values({ userId: ctx.user.id, balance: input.amount });
      }

      const [transaction] = await db
        .insert(creditTransactions)
        .values({
          userId: ctx.user.id,
          type: "credit",
          amount: input.amount,
          description: input.description,
        })
        .returning();

      return transaction;
    }),
});
