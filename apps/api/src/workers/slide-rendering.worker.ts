import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { SlideRenderingJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createSlideRenderingWorker(): Worker {
  return new Worker<SlideRenderingJobData>(
    QUEUE_NAMES.SLIDE_RENDERING,
    async (job) => {
      const { projectId, userId, slideId, slideIndex, slidevConfig } = job.data;
      const startedAt = new Date();
      console.warn(
        `[SlideRendering] Processing job ${job.id} for project ${projectId}, slideId=${slideId}, slideIndex=${slideIndex}, theme=${slidevConfig?.theme ?? "default"}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(
            `[SlideRendering] Skipping job ${job.id}: ${e.message}`
          );
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement Slidev + Puppeteer slide rendering
        // - Generate Slidev markdown from slide data
        // - Launch Puppeteer browser instance
        // - Navigate to Slidev dev server with slide content
        // - Capture high-resolution screenshot of rendered slide
        // - Upload rendered image to storage (R2)
        // - Store render metadata in database
        console.warn(
          `[SlideRendering] Stub: would render slide ${slideIndex} (${slideId}) via Slidev+Puppeteer for project ${projectId}, dimensions=${slidevConfig?.width ?? 1920}x${slidevConfig?.height ?? 1080}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "SLIDE_RENDERING"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[SlideRendering] Completed slide ${slideIndex} for project ${projectId} (${durationMs}ms)`
        );

        return { success: true, projectId, slideId, slideIndex };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[SlideRendering] Failed for project ${projectId}, slide ${slideIndex} after ${durationMs}ms:`,
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
