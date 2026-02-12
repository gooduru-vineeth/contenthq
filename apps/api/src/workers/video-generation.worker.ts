import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { VideoGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { scenes, sceneVideos, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";

export function createVideoGenerationWorker(): Worker {
  return new Worker<VideoGenerationJobData>(
    QUEUE_NAMES.VIDEO_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, imageUrl: _imageUrl, motionSpec: _motionSpec } = job.data;
      const startedAt = new Date();
      console.warn(`[VideoGeneration] Processing job ${job.id} for scene ${sceneId}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VIDEO_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

        // Update project status to generating_video
        await db
          .update(projects)
          .set({ status: "generating_video", progressPercent: 55, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // TODO: In production, call an AI video generation API (e.g. Runway, Pika)
        // using the verified imageUrl and motionSpec. For now, store a placeholder.
        const videoUrl = `projects/${projectId}/scenes/${sceneId}/video.mp4`;

        await job.updateProgress(60);

        // Store video URL in sceneVideos table
        await db.insert(sceneVideos).values({
          sceneId,
          videoUrl,
        });

        // Update scene status to video_generated
        await db
          .update(scenes)
          .set({ status: "video_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(80);

        const completedAt = new Date();
        console.warn(`[VideoGeneration] Completed for scene ${sceneId}`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              videoUrl,
              log: {
                stage: "VIDEO_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Generated video for scene ${sceneId}`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VIDEO_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        await job.updateProgress(100);

        // Advance pipeline
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "VIDEO_GENERATION");

        return { success: true, videoUrl };
      } catch (error) {
        const completedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VideoGeneration] Failed for scene ${sceneId}:`, error);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "VIDEO_GENERATION",
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
              eq(generationJobs.jobType, "VIDEO_GENERATION"),
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
      concurrency: 3,
    }
  );
}
