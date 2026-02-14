import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { RemotionCompositionJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createRemotionCompositionWorker(): Worker {
  return new Worker<RemotionCompositionJobData>(
    QUEUE_NAMES.REMOTION_COMPOSITION,
    async (job) => {
      const { projectId, userId, sceneId, compositionSpec } = job.data;
      const startedAt = new Date();
      console.warn(
        `[RemotionComposition] Processing job ${job.id} for project ${projectId}, sceneId=${sceneId}, templateId=${compositionSpec.templateId ?? "none"}, fps=${compositionSpec.fps ?? 30}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(
            `[RemotionComposition] Skipping job ${job.id}: ${e.message}`
          );
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement Remotion React composition creation
        // - Fetch scene data (visuals, audio, captions, motion specs)
        // - Map scene data to Remotion component props
        // - Generate React composition specification
        // - Validate composition against Remotion constraints
        // - Store composition spec in database for rendering stage
        console.warn(
          `[RemotionComposition] Stub: would create Remotion composition for scene ${sceneId}, dimensions=${compositionSpec.width ?? 1920}x${compositionSpec.height ?? 1080}, duration=${compositionSpec.durationInFrames ?? "auto"} frames`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "REMOTION_COMPOSITION"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[RemotionComposition] Completed for project ${projectId}, scene ${sceneId} (${durationMs}ms)`
        );

        return { success: true, projectId, sceneId };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[RemotionComposition] Failed for project ${projectId}, scene ${sceneId} after ${durationMs}ms:`,
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
