import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { AudioScriptGenJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createAudioScriptGenWorker(): Worker {
  return new Worker<AudioScriptGenJobData>(
    QUEUE_NAMES.AUDIO_SCRIPT_GEN,
    async (job) => {
      const { projectId, userId, presentationId, slideIds, stageConfig } =
        job.data;
      const startedAt = new Date();
      console.warn(
        `[AudioScriptGen] Processing job ${job.id} for project ${projectId}, presentationId=${presentationId}, slideCount=${slideIds.length}, provider=${stageConfig?.provider ?? "default"}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(
            `[AudioScriptGen] Skipping job ${job.id}: ${e.message}`
          );
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement AI narration script generation
        // - Fetch slide content for each slideId
        // - Use LLM to generate narration script per slide
        // - Apply tone/energy settings from stageConfig
        // - Generate timing hints for TTS synchronization
        // - Store narration scripts in database
        console.warn(
          `[AudioScriptGen] Stub: would generate narration scripts for ${slideIds.length} slides in presentation ${presentationId}, tone=${stageConfig?.tone ?? "professional"}, energy=${stageConfig?.energy ?? "medium"}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "AUDIO_SCRIPT_GEN"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[AudioScriptGen] Completed for project ${projectId}, ${slideIds.length} scripts generated (${durationMs}ms)`
        );

        return { success: true, projectId, slideCount: slideIds.length };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[AudioScriptGen] Failed for project ${projectId} after ${durationMs}ms:`,
          errorMessage
        );
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );
}
