import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { SpeechGenerationJobData } from "@contenthq/queue";

export function createSpeechGenerationWorker(): Worker {
  return new Worker<SpeechGenerationJobData>(
    QUEUE_NAMES.SPEECH_GENERATION,
    async (job) => {
      const { speechGenerationId } = job.data;
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

        await job.updateProgress(100);
        console.warn(
          `[SpeechGen] Completed generation ${speechGenerationId}, duration: ${result.duration}s`
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
