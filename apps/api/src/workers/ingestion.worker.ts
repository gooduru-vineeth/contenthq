import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { IngestionJobData } from "@contenthq/queue";
import { ingestionService } from "@contenthq/ingestion";
import { db } from "@contenthq/db/client";
import { ingestedContent, projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export function createIngestionWorker(): Worker {
  return new Worker<IngestionJobData>(
    QUEUE_NAMES.INGESTION,
    async (job) => {
      const { projectId, sourceUrl } = job.data;
      console.warn(`[Ingestion] Processing job ${job.id} for project ${projectId}`);

      try {
        // Update project status
        await db
          .update(projects)
          .set({ status: "ingesting", updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Extract content
        const result = await ingestionService.ingest(sourceUrl);
        await job.updateProgress(70);

        // Store in database
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
        console.warn(`[Ingestion] Completed for project ${projectId}: "${result.title}"`);

        return { success: true, title: result.title };
      } catch (error) {
        console.error(`[Ingestion] Failed for project ${projectId}:`, error);
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
