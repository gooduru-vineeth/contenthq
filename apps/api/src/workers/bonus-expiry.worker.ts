import { Worker, Queue } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import { bonusCreditService } from "../services/bonus-credit.service";

export function createBonusExpiryWorker(): Worker {
  const connection = getRedisConnection();

  // Add repeatable job on first creation
  const queue = new Queue(QUEUE_NAMES.BONUS_EXPIRY, { connection });
  queue
    .add(
      "expire-bonuses",
      {},
      {
        repeat: { pattern: "0 * * * *" }, // Every hour
        jobId: "bonus-expiry-repeatable",
      }
    )
    .catch((err) => {
      console.error("[BonusExpiryWorker] Failed to add repeatable job:", err);
    });

  const worker = new Worker(
    QUEUE_NAMES.BONUS_EXPIRY,
    async (job) => {
      console.warn(`[BonusExpiryWorker] Running bonus expiry check (job ${job.id})`);

      const result = await bonusCreditService.expireBonusCredits();

      if (result.expired > 0) {
        console.warn(
          `[BonusExpiryWorker] Expired ${result.expired} bonus credit(s)`
        );
      }

      return result;
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[BonusExpiryWorker] Job ${job?.id} failed:`,
      err.message
    );
  });

  return worker;
}
