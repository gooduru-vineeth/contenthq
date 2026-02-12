import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { VideoGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { scenes, sceneVideos, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { videoService } from "@contenthq/video";
import type { MotionSpec } from "@contenthq/video";
import { storage, getSceneVideoPath, getVideoContentType } from "@contenthq/storage";

export function createVideoGenerationWorker(): Worker {
  return new Worker<VideoGenerationJobData>(
    QUEUE_NAMES.VIDEO_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, imageUrl, motionSpec } = job.data;
      const startedAt = new Date();
      console.warn(`[VideoGeneration] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, imageUrl=${imageUrl ? "present" : "missing"}, hasMotionSpec=${!!motionSpec}`);

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

        // Get scene for duration info
        const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
        const duration = scene?.duration ?? 5;

        // Generate video from image using FFmpeg
        console.warn(`[VideoGeneration] Generating scene video for ${sceneId}: duration=${duration}s, imageUrl=${imageUrl?.substring(0, 80)}`);
        const videoResult = await videoService.generateSceneVideo({
          imageUrl,
          duration,
          motionSpec: motionSpec as unknown as MotionSpec | undefined,
          width: 1920,
          height: 1080,
        });

        await job.updateProgress(60);

        // Upload to R2
        const videoKey = getSceneVideoPath(userId, projectId, sceneId, `video.${videoResult.format}`);
        const uploadResult = await storage.uploadFileWithRetry(videoKey, videoResult.videoBuffer, getVideoContentType(videoResult.format));
        const videoUrl = uploadResult.url;

        console.warn(`[VideoGeneration] Uploaded video for scene ${sceneId}: key=${videoKey}`);

        // Store video URL in sceneVideos table
        await db.insert(sceneVideos).values({
          sceneId,
          videoUrl,
          storageKey: videoKey,
          duration,
        });

        // Update scene status to video_generated
        await db
          .update(scenes)
          .set({ status: "video_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(80);

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[VideoGeneration] Completed for scene ${sceneId}, videoUrl=${videoUrl.substring(0, 80)} (${durationMs}ms)`);

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
        console.warn(`[VideoGeneration] Advancing pipeline after video generation for scene ${sceneId}`);
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "VIDEO_GENERATION");

        return { success: true, videoUrl };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VideoGeneration] Failed for scene ${sceneId} after ${durationMs}ms:`, errorMessage);

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
