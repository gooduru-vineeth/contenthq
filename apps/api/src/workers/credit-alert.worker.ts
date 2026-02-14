import { Worker, Queue } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import {
  creditBalances,
  creditAlerts,
  bonusCredits,
} from "@contenthq/db/schema";
import { eq, and, lt, sql, isNotNull } from "drizzle-orm";

export function createCreditAlertWorker(): Worker {
  const connection = getRedisConnection();

  // Add repeatable job: every hour
  const queue = new Queue(QUEUE_NAMES.CREDIT_ALERT, { connection });
  queue
    .add(
      "check-credit-alerts",
      {},
      {
        repeat: { pattern: "0 * * * *" }, // Every hour
        jobId: "credit-alert-repeatable",
      }
    )
    .catch((err) => {
      console.error("[CreditAlertWorker] Failed to add repeatable job:", err);
    });

  const worker = new Worker(
    QUEUE_NAMES.CREDIT_ALERT,
    async (job) => {
      console.warn(
        `[CreditAlertWorker] Running credit alert check (job ${job.id})`
      );

      const now = new Date();
      const twentyFourHoursAgo = new Date(
        now.getTime() - 24 * 60 * 60 * 1000
      );
      let alertsCreated = 0;
      let alertsResolved = 0;

      // 1. Check low balance alerts
      // Find users with a threshold set and balance below it
      const usersWithThresholds = await db
        .select()
        .from(creditBalances)
        .where(isNotNull(creditBalances.lowBalanceThreshold));

      for (const bal of usersWithThresholds) {
        const currentBalance = (bal.balance ?? 0) + (bal.bonusBalance ?? 0);
        const threshold = bal.lowBalanceThreshold!;

        if (currentBalance < threshold) {
          // Check if we already notified in the last 24 hours
          const recentlyNotified =
            bal.lowBalanceNotifiedAt &&
            bal.lowBalanceNotifiedAt > twentyFourHoursAgo;

          if (!recentlyNotified) {
            await db.insert(creditAlerts).values({
              userId: bal.userId,
              type: "low_balance",
              threshold,
              currentBalance,
              notified: true,
              notifiedAt: now,
            });

            await db
              .update(creditBalances)
              .set({ lowBalanceNotifiedAt: now })
              .where(eq(creditBalances.userId, bal.userId));

            alertsCreated++;
          }
        } else {
          // Resolve any open low_balance alerts for this user
          const resolved = await db
            .update(creditAlerts)
            .set({ resolved: true, resolvedAt: now })
            .where(
              and(
                eq(creditAlerts.userId, bal.userId),
                eq(creditAlerts.type, "low_balance"),
                eq(creditAlerts.resolved, false)
              )
            )
            .returning();

          alertsResolved += resolved.length;
        }
      }

      // 2. Check depleted balances (balance = 0)
      const depletedUsers = await db
        .select()
        .from(creditBalances)
        .where(
          and(
            sql`${creditBalances.balance} + ${creditBalances.bonusBalance} <= 0`
          )
        );

      for (const bal of depletedUsers) {
        const recentlyNotified =
          bal.lowBalanceNotifiedAt &&
          bal.lowBalanceNotifiedAt > twentyFourHoursAgo;

        if (!recentlyNotified) {
          await db.insert(creditAlerts).values({
            userId: bal.userId,
            type: "balance_depleted",
            threshold: 0,
            currentBalance: 0,
            notified: true,
            notifiedAt: now,
          });

          await db
            .update(creditBalances)
            .set({ lowBalanceNotifiedAt: now })
            .where(eq(creditBalances.userId, bal.userId));

          alertsCreated++;
        }
      }

      // 3. Check bonus credits expiring within 7 days
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000
      );

      const expiringBonuses = await db
        .select()
        .from(bonusCredits)
        .where(
          and(
            eq(bonusCredits.isExpired, false),
            lt(bonusCredits.expiresAt, sevenDaysFromNow),
            isNotNull(bonusCredits.expiresAt),
            sql`${bonusCredits.remainingAmount} > 0`
          )
        );

      for (const bonus of expiringBonuses) {
        // Check if we already created an alert for this bonus
        const [existing] = await db
          .select()
          .from(creditAlerts)
          .where(
            and(
              eq(creditAlerts.userId, bonus.userId),
              eq(creditAlerts.type, "bonus_expiring"),
              eq(creditAlerts.resolved, false)
            )
          );

        if (!existing) {
          await db.insert(creditAlerts).values({
            userId: bonus.userId,
            type: "bonus_expiring",
            currentBalance: bonus.remainingAmount,
            notified: true,
            notifiedAt: now,
          });

          alertsCreated++;
        }
      }

      console.warn(
        `[CreditAlertWorker] Created ${alertsCreated} alerts, resolved ${alertsResolved}`
      );

      return { alertsCreated, alertsResolved };
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[CreditAlertWorker] Job ${job?.id} failed:`,
      err.message
    );
  });

  return worker;
}
