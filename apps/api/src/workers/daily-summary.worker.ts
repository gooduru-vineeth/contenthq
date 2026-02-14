import { Worker, Queue } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import {
  creditTransactions,
  creditBalances,
  dailyUsageSummaries,
} from "@contenthq/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";

export function createDailySummaryWorker(): Worker {
  const connection = getRedisConnection();

  // Add repeatable job: daily at midnight UTC
  const queue = new Queue(QUEUE_NAMES.DAILY_SUMMARY, { connection });
  queue
    .add(
      "aggregate-daily-usage",
      {},
      {
        repeat: { pattern: "0 0 * * *" }, // Daily at 00:00 UTC
        jobId: "daily-summary-repeatable",
      }
    )
    .catch((err) => {
      console.error("[DailySummaryWorker] Failed to add repeatable job:", err);
    });

  const worker = new Worker(
    QUEUE_NAMES.DAILY_SUMMARY,
    async (job) => {
      // Aggregate the previous day's data
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const dateStr = yesterday.toISOString().split("T")[0]!;

      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

      console.warn(
        `[DailySummaryWorker] Aggregating usage for ${dateStr} (job ${job.id})`
      );

      // Get all users with balances
      const users = await db
        .select({ userId: creditBalances.userId })
        .from(creditBalances);

      let processed = 0;

      for (const { userId } of users) {
        try {
          // Get all usage transactions for this user on this day
          const transactions = await db
            .select()
            .from(creditTransactions)
            .where(
              and(
                eq(creditTransactions.userId, userId),
                eq(creditTransactions.type, "usage"),
                gte(creditTransactions.createdAt, dayStart),
                lt(creditTransactions.createdAt, dayEnd)
              )
            );

          if (transactions.length === 0) continue;

          const totalRequests = transactions.length;
          const totalCreditsUsed = transactions.reduce(
            (sum, t) => sum + Math.abs(t.amount),
            0
          );
          const totalCostUsd = transactions.reduce((sum, t) => {
            const cost = t.actualCostCredits
              ? parseFloat(t.actualCostCredits)
              : 0;
            return sum + cost;
          }, 0);

          // Build breakdowns
          const operationBreakdown: Record<
            string,
            { count: number; credits: number }
          > = {};
          const providerBreakdown: Record<
            string,
            { count: number; credits: number }
          > = {};
          const modelBreakdown: Record<
            string,
            { count: number; credits: number }
          > = {};

          for (const t of transactions) {
            const credits = Math.abs(t.amount);

            if (t.operationType) {
              const key = t.operationType;
              operationBreakdown[key] = operationBreakdown[key] ?? {
                count: 0,
                credits: 0,
              };
              operationBreakdown[key].count++;
              operationBreakdown[key].credits += credits;
            }

            if (t.provider) {
              const key = t.provider;
              providerBreakdown[key] = providerBreakdown[key] ?? {
                count: 0,
                credits: 0,
              };
              providerBreakdown[key].count++;
              providerBreakdown[key].credits += credits;
            }

            if (t.model) {
              const key = t.model;
              modelBreakdown[key] = modelBreakdown[key] ?? {
                count: 0,
                credits: 0,
              };
              modelBreakdown[key].count++;
              modelBreakdown[key].credits += credits;
            }
          }

          // Upsert daily summary
          await db
            .insert(dailyUsageSummaries)
            .values({
              userId,
              date: dateStr,
              totalRequests,
              totalCreditsUsed,
              totalCostUsd:
                totalCostUsd > 0 ? totalCostUsd.toFixed(4) : null,
              operationBreakdown:
                Object.keys(operationBreakdown).length > 0
                  ? operationBreakdown
                  : null,
              providerBreakdown:
                Object.keys(providerBreakdown).length > 0
                  ? providerBreakdown
                  : null,
              modelBreakdown:
                Object.keys(modelBreakdown).length > 0
                  ? modelBreakdown
                  : null,
            })
            .onConflictDoUpdate({
              target: [
                dailyUsageSummaries.userId,
                dailyUsageSummaries.date,
              ],
              set: {
                totalRequests: sql`excluded.total_requests`,
                totalCreditsUsed: sql`excluded.total_credits_used`,
                totalCostUsd: sql`excluded.total_cost_usd`,
                operationBreakdown: sql`excluded.operation_breakdown`,
                providerBreakdown: sql`excluded.provider_breakdown`,
                modelBreakdown: sql`excluded.model_breakdown`,
              },
            });

          processed++;
        } catch (err) {
          console.error(
            `[DailySummaryWorker] Failed to aggregate for user ${userId}:`,
            err
          );
        }
      }

      console.warn(
        `[DailySummaryWorker] Aggregated ${processed} user summaries for ${dateStr}`
      );

      return { date: dateStr, usersProcessed: processed };
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[DailySummaryWorker] Job ${job?.id} failed:`,
      err.message
    );
  });

  return worker;
}
