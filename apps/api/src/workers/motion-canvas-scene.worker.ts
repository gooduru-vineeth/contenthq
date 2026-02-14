import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { MotionCanvasSceneJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createMotionCanvasSceneWorker(): Worker {
  return new Worker<MotionCanvasSceneJobData>(
    QUEUE_NAMES.MOTION_CANVAS_SCENE,
    async (job) => {
      const { projectId, userId, sceneId, sceneSpec } = job.data;
      const startedAt = new Date();
      console.warn(
        `[MotionCanvasScene] Processing job ${job.id} for project ${projectId}, sceneId=${sceneId}, templateId=${sceneSpec.templateId ?? "none"}, duration=${sceneSpec.durationInSeconds ?? "auto"}s`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(
            `[MotionCanvasScene] Skipping job ${job.id}: ${e.message}`
          );
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement Motion Canvas animation scene generation
        // - Fetch scene data (visuals, text, motion specs)
        // - Generate Motion Canvas scene description
        // - Map animation properties to Motion Canvas API format
        // - Validate scene against Motion Canvas constraints
        // - Store scene spec in database for rendering stage
        console.warn(
          `[MotionCanvasScene] Stub: would generate Motion Canvas scene spec for scene ${sceneId}, animationProps=${sceneSpec.animationProps ? Object.keys(sceneSpec.animationProps).join(", ") : "none"}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "MOTION_CANVAS_SCENE"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[MotionCanvasScene] Completed for project ${projectId}, scene ${sceneId} (${durationMs}ms)`
        );

        return { success: true, projectId, sceneId };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[MotionCanvasScene] Failed for project ${projectId}, scene ${sceneId} after ${durationMs}ms:`,
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
