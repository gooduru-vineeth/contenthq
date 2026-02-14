import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { SpeechGenerationJobData } from "@contenthq/queue";
import { creditService } from "../services/credit.service";
import { costCalculationService } from "../services/cost-calculation.service";

export function createSpeechGenerationWorker(): Worker {
  return new Worker<SpeechGenerationJobData>(
    QUEUE_NAMES.SPEECH_GENERATION,
    async (job) => {
      const { speechGenerationId, userId, provider, model } = job.data;
      console.warn(
        `[SpeechGen] Processing job ${job.id} for generation ${speechGenerationId}`
      );

      try {
        await job.updateProgress(10);

        const { speechGenerationService } = await import(
          "../services/speech-generation.service"
        );

        await job.updateProgress(50);

        const result =
          await speechGenerationService.processGeneration(speechGenerationId);

        // Deduct credits for speech generation
        try {
          const credits = costCalculationService.getOperationCredits("SPEECH_GENERATION", { provider: result.provider ?? provider, model });
          await creditService.deductCredits(userId, credits, `Speech generation ${speechGenerationId}`, {
            operationType: "SPEECH_GENERATION",
            provider: result.provider ?? provider,
            model,
            jobId: job.id,
          });
        } catch (err) {
          console.warn(`[SpeechGen] Credit deduction failed (non-fatal):`, err);
        }

        await job.updateProgress(100);
        console.warn(
          `[SpeechGen] Completed generation ${speechGenerationId}: duration=${result.duration}s, provider=${result.provider ?? "unknown"}, format=${result.format ?? "unknown"}`
        );
        return { success: true, speechGenerationId };
      } catch (error) {
        console.error(
          `[SpeechGen] Failed generation ${speechGenerationId}:`,
          error
        );
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
