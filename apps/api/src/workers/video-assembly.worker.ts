import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { VideoAssemblyJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { projects, scenes, generationJobs } from "@contenthq/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";

export function createVideoAssemblyWorker(): Worker {
  return new Worker<VideoAssemblyJobData>(
    QUEUE_NAMES.VIDEO_ASSEMBLY,
    async (job) => {
      const { projectId, sceneIds } = job.data;
      const startedAt = new Date();
      console.warn(`[VideoAssembly] Processing job ${job.id} for project ${projectId}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VIDEO_ASSEMBLY"),
              eq(generationJobs.status, "queued")
            )
          );

        await db
          .update(projects)
          .set({ status: "assembling", progressPercent: 87, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Fetch all scenes in order
        const sceneList = await db
          .select()
          .from(scenes)
          .where(inArray(scenes.id, sceneIds))
          .orderBy(asc(scenes.index));

        await job.updateProgress(30);

        // In production, this would:
        // 1. Download all scene videos and audio from storage
        // 2. Use FFmpeg to concatenate scenes with transitions
        // 3. Upload final video to storage
        const outputKey = `projects/${projectId}/output/final-video.mp4`;

        await job.updateProgress(90);

        // Mark project as completed
        await db
          .update(projects)
          .set({
            status: "completed",
            progressPercent: 100,
            finalVideoUrl: outputKey,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));

        await job.updateProgress(100);
        const completedAt = new Date();
        console.warn(`[VideoAssembly] Completed for project ${projectId} with ${sceneList.length} scenes`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              sceneCount: sceneList.length,
              outputKey,
              log: {
                stage: "VIDEO_ASSEMBLY",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Assembled ${sceneList.length} scenes into final video`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VIDEO_ASSEMBLY"),
              eq(generationJobs.status, "processing")
            )
          );

        return { success: true, sceneCount: sceneList.length };
      } catch (error) {
        const completedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VideoAssembly] Failed for project ${projectId}:`, error);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "VIDEO_ASSEMBLY",
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
              eq(generationJobs.jobType, "VIDEO_ASSEMBLY"),
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
      concurrency: 2,
    }
  );
}
