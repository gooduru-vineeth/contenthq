import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { GenericStageJobData } from "@contenthq/queue";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createPptGenerationWorker(): Worker {
  return new Worker<GenericStageJobData>(
    QUEUE_NAMES.PPT_GENERATION,
    async (job) => {
      const { projectId, userId, stageId, templateId, payload } = job.data;
      const startedAt = new Date();
      console.warn(
        `[PptGeneration] Processing job ${job.id} for project ${projectId}, stageId=${stageId}, templateId=${templateId}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[PptGeneration] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await job.updateProgress(10);

        // TODO: Implement AI-powered slide structure generation
        // - Analyze ingested presentation content
        // - Generate improved slide structure using LLM
        // - Create slide layouts, text content, speaker notes
        // - Produce visual style recommendations
        console.warn(
          `[PptGeneration] Stub: would generate slide structure for project ${projectId}, payload keys: ${Object.keys(payload).join(", ")}`
        );

        await job.updateProgress(80);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(
          projectId,
          userId,
          "PPT_GENERATION"
        );

        await job.updateProgress(100);
        const durationMs = Date.now() - startedAt.getTime();
        console.warn(
          `[PptGeneration] Completed for project ${projectId} (${durationMs}ms)`
        );

        return { success: true, projectId };
      } catch (error) {
        const durationMs = Date.now() - startedAt.getTime();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[PptGeneration] Failed for project ${projectId} after ${durationMs}ms:`,
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
