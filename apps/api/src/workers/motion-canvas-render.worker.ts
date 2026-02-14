import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { MotionCanvasRenderJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createMotionCanvasRenderWorker(): Worker {
  return new Worker<MotionCanvasRenderJobData>(
    QUEUE_NAMES.MOTION_CANVAS_RENDER,
    async (job) => {
      const { projectId, userId, sceneIds, renderConfig } = job.data;
      const startedAt = new Date();
      console.warn(
        `[MotionCanvasRender] Processing job ${job.id} for project ${projectId}, sceneCount=${sceneIds.length}, codec=${renderConfig.codec ?? "h264"}, quality=${renderConfig.quality ?? 80}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(
            `[MotionCanvasRender] Skipping job ${job.id}: ${e.message}`
          );
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement Motion Canvas rendering
        // - Load scene specs from database for all sceneIds
        // - Initialize Motion Canvas renderer with config
        // - Render each scene sequentially or in parallel
        // - Concatenate rendered scene outputs if multiple
        // - Upload final rendered video to storage (R2)
        // - Store render output metadata in database
        console.warn(
          `[MotionCanvasRender] Stub: would render ${sceneIds.length} scene(s) via Motion Canvas, dimensions=${renderConfig.width ?? 1920}x${renderConfig.height ?? 1080}, format=${renderConfig.outputFormat ?? "mp4"}, fps=${renderConfig.fps ?? 30}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "MOTION_CANVAS_RENDER"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[MotionCanvasRender] Completed for project ${projectId}, ${sceneIds.length} scene(s) rendered (${durationMs}ms)`
        );

        return { success: true, projectId, sceneCount: sceneIds.length };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[MotionCanvasRender] Failed for project ${projectId} after ${durationMs}ms:`,
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
