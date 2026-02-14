import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { PptIngestionJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createPptIngestionWorker(): Worker {
  return new Worker<PptIngestionJobData>(
    QUEUE_NAMES.PPT_INGESTION,
    async (job) => {
      const { projectId, userId, inputType, inputFileId, inputUrl } = job.data;
      const startedAt = new Date();
      console.warn(
        `[PptIngestion] Processing job ${job.id} for project ${projectId}, inputType=${inputType}, inputFileId=${inputFileId ?? "none"}, inputUrl=${inputUrl?.substring(0, 100) ?? "none"}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[PptIngestion] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement actual presentation parsing logic
        // - PPTX: Parse XML structure, extract slides, text, images
        // - PDF: Extract pages, text content, embedded images
        // - Google Slides: Use Google Slides API to fetch presentation data
        // - Keynote: Convert to intermediate format, extract slides
        // - URL: Download remote presentation file first
        console.warn(
          `[PptIngestion] Stub: would parse ${inputType} presentation for project ${projectId}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "PPT_INGESTION"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[PptIngestion] Completed for project ${projectId} (${durationMs}ms)`
        );

        return { success: true, projectId };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[PptIngestion] Failed for project ${projectId} after ${durationMs}ms:`,
          errorMessage
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
