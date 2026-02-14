import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { RemotionRenderJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createRemotionRenderWorker(): Worker {
  return new Worker<RemotionRenderJobData>(
    QUEUE_NAMES.REMOTION_RENDER,
    async (job) => {
      const { projectId, userId, compositionId, renderConfig } = job.data;
      const startedAt = new Date();
      console.warn(
        `[RemotionRender] Processing job ${job.id} for project ${projectId}, compositionId=${compositionId}, codec=${renderConfig.codec ?? "h264"}, quality=${renderConfig.quality ?? 80}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(
            `[RemotionRender] Skipping job ${job.id}: ${e.message}`
          );
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement Remotion rendering via @remotion/renderer
        // - Load composition spec from database
        // - Bundle Remotion project with composition
        // - Call renderMedia() with codec, quality, fps settings
        // - Monitor render progress and update job progress
        // - Upload rendered MP4/WebM to storage (R2)
        // - Store render output metadata in database
        console.warn(
          `[RemotionRender] Stub: would render composition ${compositionId} via @remotion/renderer, format=${renderConfig.outputFormat ?? "mp4"}, fps=${renderConfig.fps ?? 30}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "REMOTION_RENDER"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[RemotionRender] Completed for project ${projectId}, composition ${compositionId} (${durationMs}ms)`
        );

        return { success: true, projectId, compositionId };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[RemotionRender] Failed for project ${projectId}, composition ${compositionId} after ${durationMs}ms:`,
          errorMessage
        );
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    }
  );
}
