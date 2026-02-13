import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { VideoAssemblyJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { projects, scenes, sceneVideos, sceneVisuals, sceneAudioMixes, generationJobs } from "@contenthq/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { videoService } from "@contenthq/video";
import { storage, getOutputPath, getSceneVideoPath, getVideoContentType } from "@contenthq/storage";

export function createVideoAssemblyWorker(): Worker {
  return new Worker<VideoAssemblyJobData>(
    QUEUE_NAMES.VIDEO_ASSEMBLY,
    async (job) => {
      const { projectId, userId, sceneIds, stageConfig, captionConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[VideoAssembly] Processing job ${job.id} for project ${projectId}, sceneCount=${sceneIds?.length ?? 0}, hasStageConfig=${!!stageConfig}, hasCaptionConfig=${!!captionConfig}`);

      // Apply stageConfig overrides for assembly
      const outputResolution = stageConfig?.resolution ?? "1920x1080";
      const [resWidth, resHeight] = outputResolution.split("x").map(Number);
      const assemblyWidth = resWidth || 1920;
      const assemblyHeight = resHeight || 1080;
      const _assemblyFps = stageConfig?.fps ?? 30;

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

        console.warn(`[VideoAssembly] Fetched ${sceneList.length} scene(s) for assembly, project ${projectId}`);
        await job.updateProgress(20);

        // Download all scene videos and audio from R2
        const assemblyScenes = [];
        for (const scene of sceneList) {
          const [video] = await db
            .select()
            .from(sceneVideos)
            .where(eq(sceneVideos.sceneId, scene.id));

          const [audio] = await db
            .select()
            .from(sceneAudioMixes)
            .where(eq(sceneAudioMixes.sceneId, scene.id));

          if (!audio?.mixedAudioUrl) {
            console.warn(`[VideoAssembly] Skipping scene ${scene.id}: missing audio`);
            continue;
          }

          let videoUrl = video?.videoUrl ?? null;
          let videoBuffer: Buffer | null = null;

          // Fallback: generate video from scene image when videoUrl is missing
          // This handles the path where enableVideoGeneration is false and the
          // video generation stage was skipped.
          if (!videoUrl) {
            const [visual] = await db
              .select()
              .from(sceneVisuals)
              .where(eq(sceneVisuals.sceneId, scene.id));

            if (!visual?.imageUrl) {
              console.warn(`[VideoAssembly] Skipping scene ${scene.id}: no video or image available`);
              continue;
            }

            console.warn(`[VideoAssembly] Generating video from image for scene ${scene.id}`);
            const duration = scene.duration ?? 5;
            const videoResult = await videoService.generateSceneVideo({
              imageUrl: visual.imageUrl,
              duration,
              width: assemblyWidth,
              height: assemblyHeight,
            });

            // Upload generated video to R2
            const videoKey = getSceneVideoPath(userId, projectId, scene.id, `video.${videoResult.format}`);
            const uploadResult = await storage.uploadFileWithRetry(
              videoKey,
              videoResult.videoBuffer,
              getVideoContentType(videoResult.format),
            );
            videoUrl = uploadResult.url;
            videoBuffer = videoResult.videoBuffer;

            // Update or insert sceneVideos record with the generated videoUrl
            if (video) {
              await db
                .update(sceneVideos)
                .set({ videoUrl, storageKey: videoKey, duration, updatedAt: new Date() })
                .where(eq(sceneVideos.id, video.id));
            } else {
              await db.insert(sceneVideos).values({
                sceneId: scene.id,
                videoUrl,
                storageKey: videoKey,
                duration,
              });
            }

            console.warn(`[VideoAssembly] Generated fallback video for scene ${scene.id}: key=${videoKey}`);
          }

          console.warn(`[VideoAssembly] Downloading media for scene ${scene.id}`);

          // Download video (skip if we already have the buffer from generation)
          if (!videoBuffer) {
            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
              console.warn(`[VideoAssembly] Failed to download video for scene ${scene.id}`);
              continue;
            }
            videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          }

          const audioResponse = await fetch(audio.mixedAudioUrl);
          if (!audioResponse.ok) {
            console.warn(`[VideoAssembly] Failed to download audio for scene ${scene.id}`);
            continue;
          }

          assemblyScenes.push({
            videoBuffer,
            audioBuffer: Buffer.from(await audioResponse.arrayBuffer()),
            duration: scene.duration ?? video?.duration ?? 5,
          });
        }

        if (assemblyScenes.length === 0) {
          throw new Error("No valid scenes to assemble");
        }

        await job.updateProgress(50);

        // Assemble final video with FFmpeg
        console.warn(`[VideoAssembly] Assembling ${assemblyScenes.length} scene(s) for project ${projectId}`);
        const result = await videoService.assembleProject({
          scenes: assemblyScenes,
          width: assemblyWidth,
          height: assemblyHeight,
        });

        await job.updateProgress(80);

        // Upload final video to R2
        const outputKey = getOutputPath(userId, projectId, `final-video.${result.format}`);
        const uploadResult = await storage.uploadFileWithRetry(outputKey, result.videoBuffer, getVideoContentType(result.format));
        const finalVideoUrl = uploadResult.url;

        console.warn(`[VideoAssembly] Uploaded final video for project ${projectId}: key=${outputKey}`);

        await job.updateProgress(90);

        // Mark project as completed
        await db
          .update(projects)
          .set({
            status: "completed",
            progressPercent: 100,
            finalVideoUrl,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[VideoAssembly] Completed for project ${projectId}: ${assemblyScenes.length} scenes assembled, finalVideoUrl=${finalVideoUrl.substring(0, 80)} (${durationMs}ms)`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              sceneCount: assemblyScenes.length,
              finalVideoUrl,
              log: {
                stage: "VIDEO_ASSEMBLY",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Assembled ${assemblyScenes.length} scenes into final video`,
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

        return { success: true, sceneCount: assemblyScenes.length };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VideoAssembly] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

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
