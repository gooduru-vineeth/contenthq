import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { IngestionJobData } from "@contenthq/queue";
import { ingestionService } from "@contenthq/ingestion";
import { db } from "@contenthq/db/client";
import { ingestedContent, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createIngestionWorker(): Worker {
  return new Worker<IngestionJobData>(
    QUEUE_NAMES.INGESTION,
    async (job) => {
      const { projectId, userId, sourceUrl } = job.data;
      const startedAt = new Date();
      console.warn(`[Ingestion] Processing job ${job.id} for project ${projectId}, userId=${userId}, sourceUrl=${sourceUrl?.substring(0, 100)}`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[Ingestion] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        // Mark generationJob as processing
        console.warn(`[Ingestion] Marking generationJob as processing for project ${projectId}`);
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "INGESTION"),
              eq(generationJobs.status, "queued")
            )
          );

        // Update project status
        await db
          .update(projects)
          .set({ status: "ingesting", progressPercent: 0, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Extract content
        console.warn(`[Ingestion] Starting content extraction from ${sourceUrl?.substring(0, 100)} for project ${projectId}`);
        const result = await ingestionService.ingest(sourceUrl);
        console.warn(`[Ingestion] Content extracted for project ${projectId}: platform=${result.sourcePlatform}, title="${result.title?.substring(0, 80)}", bodyLength=${result.body?.length ?? 0} chars, engagementScore=${result.engagementScore ?? "N/A"}`);
        await job.updateProgress(70);

        // Store in database
        console.warn(`[Ingestion] Storing ingested content in database for project ${projectId}`);
        await db.insert(ingestedContent).values({
          projectId,
          sourceUrl: result.sourceUrl,
          sourcePlatform: result.sourcePlatform,
          title: result.title,
          body: result.body,
          summary: result.summary,
          engagementScore: result.engagementScore,
        });

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[Ingestion] Completed for project ${projectId}: "${result.title}" (${durationMs}ms)`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              title: result.title,
              log: {
                stage: "INGESTION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Ingested "${result.title}"`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "INGESTION"),
              eq(generationJobs.status, "processing")
            )
          );

        // Advance pipeline to next stage
        console.warn(`[Ingestion] Advancing pipeline after ingestion for project ${projectId}`);
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "INGESTION");

        return { success: true, title: result.title };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Ingestion] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "INGESTION",
                status: "failed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                error: errorMessage,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "INGESTION"),
              eq(generationJobs.status, "processing")
            )
          );

        await db
          .update(projects)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projects.id, projectId));
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
