import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { VideoGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { scenes, sceneVideos, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { videoService } from "@contenthq/video";
import type { MotionSpec } from "@contenthq/video";
import { pickRandomMotion, mapLegacyMotionSpec } from "@contenthq/video";
import type { MotionType } from "@contenthq/video";
import { storage, getSceneVideoPath, getVideoContentType } from "@contenthq/storage";
import { mediaProviderRegistry, truncateForLog, formatFileSize } from "@contenthq/ai";

export function createVideoGenerationWorker(): Worker {
  return new Worker<VideoGenerationJobData>(
    QUEUE_NAMES.VIDEO_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, imageUrl, motionSpec, mediaOverrideUrl, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[VideoGeneration] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, imageUrl=${imageUrl ? "present" : "missing"}, hasMotionSpec=${!!motionSpec}, hasOverride=${!!mediaOverrideUrl}, hasStageConfig=${!!stageConfig}`);

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

        // Check for media override - skip video generation if user provided video
        if (mediaOverrideUrl) {
          console.warn(`[VideoGeneration] Using media override for scene ${sceneId}: ${mediaOverrideUrl.substring(0, 80)}`);
          const overrideResponse = await fetch(mediaOverrideUrl);
          if (!overrideResponse.ok) throw new Error(`Failed to fetch video override: ${overrideResponse.statusText}`);
          const overrideBuffer = Buffer.from(await overrideResponse.arrayBuffer());
          const overrideKey = getSceneVideoPath(userId, projectId, sceneId, "video-override.mp4");
          const overrideUpload = await storage.uploadFileWithRetry(overrideKey, overrideBuffer, "video/mp4");

          await db.insert(sceneVideos).values({ sceneId, videoUrl: overrideUpload.url, storageKey: overrideKey, duration: stageConfig?.durationPerScene ?? 5 });
          await db.update(scenes).set({ status: "video_generated", updatedAt: new Date() }).where(eq(scenes.id, sceneId));

          const completedAt = new Date();
          await db.update(generationJobs).set({
            status: "completed", progressPercent: 100,
            result: { videoUrl: overrideUpload.url, override: true, log: { stage: "VIDEO_GENERATION", status: "completed", startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), durationMs: completedAt.getTime() - startedAt.getTime(), details: `Used video override for scene ${sceneId}` } },
            updatedAt: new Date(),
          }).where(and(eq(generationJobs.projectId, projectId), eq(generationJobs.jobType, "VIDEO_GENERATION"), eq(generationJobs.status, "processing")));

          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "VIDEO_GENERATION");
          return { success: true, videoUrl: overrideUpload.url, override: true };
        }

        // Get scene for duration info, apply stageConfig override
        const [scene] = await db.select().from(scenes).where(eq(scenes.id, sceneId));
        const duration = stageConfig?.durationPerScene ?? scene?.duration ?? 5;

        // AI video provider branch: use configured provider/model if set
        if (stageConfig?.provider && stageConfig?.model) {
          const aiProvider = mediaProviderRegistry.getProviderForModel(stageConfig.model);
          if (!aiProvider) {
            throw new Error(`No media provider found for model: ${stageConfig.model}`);
          }
          if (!aiProvider.generateVideo) {
            throw new Error(`Provider ${aiProvider.name} does not support video generation`);
          }

          const prompt = job.data.scenePrompt
            || scene?.imagePrompt
            || scene?.visualDescription
            || scene?.narrationScript
            || `Generate a cinematic video for this scene`;

          console.warn(`[VideoGeneration] Using AI provider "${aiProvider.name}" model="${stageConfig.model}" for scene ${sceneId}: duration=${duration}s, prompt="${truncateForLog(prompt, 200)}", hasReferenceImage=${!!(imageUrl)}`);

          const aiResult = await aiProvider.generateVideo({
            prompt,
            model: stageConfig.model,
            aspectRatio: "16:9",
            duration,
            referenceImageUrl: imageUrl || undefined,
          });

          await job.updateProgress(60);

          if (!aiResult.videoUrl) {
            throw new Error("AI video provider returned no video URL");
          }

          // Fetch and upload to R2
          const videoResponse = await fetch(aiResult.videoUrl);
          if (!videoResponse.ok) {
            throw new Error(`Failed to fetch AI-generated video: ${videoResponse.statusText}`);
          }
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          const videoKey = getSceneVideoPath(userId, projectId, sceneId, "video.mp4");
          const uploadResult = await storage.uploadFileWithRetry(videoKey, videoBuffer, "video/mp4");
          const videoUrl = uploadResult.url;

          console.warn(`[VideoGeneration] Uploaded AI video for scene ${sceneId}: key=${videoKey}, fileSize=${formatFileSize(videoBuffer.length)}, generationTimeMs=${aiResult.generationTimeMs}`);

          await db.insert(sceneVideos).values({ sceneId, videoUrl, storageKey: videoKey, duration });
          await db.update(scenes).set({ status: "video_generated", updatedAt: new Date() }).where(eq(scenes.id, sceneId));

          await job.updateProgress(80);

          const completedAt = new Date();
          await db.update(generationJobs).set({
            status: "completed",
            progressPercent: 100,
            result: {
              videoUrl,
              provider: aiProvider.name,
              model: stageConfig.model,
              log: {
                stage: "VIDEO_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `AI video generated for scene ${sceneId} via ${aiProvider.name}/${stageConfig.model}`,
              },
            },
            updatedAt: new Date(),
          }).where(and(eq(generationJobs.projectId, projectId), eq(generationJobs.jobType, "VIDEO_GENERATION"), eq(generationJobs.status, "processing")));

          await job.updateProgress(100);
          console.warn(`[VideoGeneration] Advancing pipeline after AI video generation for scene ${sceneId}`);
          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "VIDEO_GENERATION");
          return { success: true, videoUrl, provider: aiProvider.name };
        }

        // FFmpeg fallback: generate video from static image
        console.warn(`[VideoGeneration] Generating scene video via FFmpeg for ${sceneId}: duration=${duration}s, resolution=1920x1080, motionSpecType=${motionSpec ? typeof motionSpec : "none"}, imageUrl=${imageUrl?.substring(0, 80)}`);

        // Resolve motion spec based on assignment mode
        let effectiveMotion: MotionSpec | undefined;
        const motionAssignment = stageConfig?.motionAssignment ?? "system_random";
        const motionSpeed = stageConfig?.motionSpeed ?? 0.5;

        if (motionAssignment === "system_random") {
          // Query previous scene's motionSpec to avoid consecutive repeats
          let previousMotionType: MotionType | undefined;
          if (scene) {
            const prevScenes = await db
              .select()
              .from(scenes)
              .where(and(eq(scenes.projectId, projectId), eq(scenes.status, "video_generated")));
            if (prevScenes.length > 0) {
              const lastScene = prevScenes[prevScenes.length - 1];
              const prevSpec = lastScene.motionSpec as Record<string, unknown> | null;
              if (prevSpec?.type) {
                previousMotionType = prevSpec.type as MotionType;
              }
            }
          }
          effectiveMotion = pickRandomMotion(previousMotionType);
          effectiveMotion.speed = motionSpeed;
        } else if (motionAssignment === "ai_random") {
          // Use motionSpec from job data (populated from scene DB record by AI)
          if (motionSpec && typeof motionSpec === "object" && Object.keys(motionSpec).length > 0) {
            const mapped = mapLegacyMotionSpec(motionSpec as { type?: string; direction?: string });
            effectiveMotion = { type: mapped, speed: (motionSpec as Record<string, unknown>).speed as number ?? motionSpeed };
          } else {
            effectiveMotion = pickRandomMotion();
            effectiveMotion.speed = motionSpeed;
          }
        } else {
          // "manual" mode - use stageConfig.motionType as uniform default
          const manualType = (stageConfig?.motionType ?? "kenburns_in") as MotionType;
          effectiveMotion = { type: manualType, speed: motionSpeed };
        }

        console.warn(`[VideoGeneration] Resolved motion: type=${effectiveMotion.type}, speed=${effectiveMotion.speed}, assignment=${motionAssignment}`);

        const videoResult = await videoService.generateSceneVideo({
          imageUrl,
          duration,
          motionSpec: effectiveMotion,
          width: 1920,
          height: 1080,
        });

        // Write resolved motionSpec back to scene for auditing
        if (effectiveMotion) {
          await db.update(scenes).set({ motionSpec: effectiveMotion, updatedAt: new Date() }).where(eq(scenes.id, sceneId));
        }

        await job.updateProgress(60);

        // Upload to R2
        const videoKey = getSceneVideoPath(userId, projectId, sceneId, `video.${videoResult.format}`);
        const uploadResult = await storage.uploadFileWithRetry(videoKey, videoResult.videoBuffer, getVideoContentType(videoResult.format));
        const videoUrl = uploadResult.url;

        console.warn(`[VideoGeneration] Uploaded video for scene ${sceneId}: key=${videoKey}, fileSize=${formatFileSize(videoResult.videoBuffer.length)}, format=${videoResult.format}`);

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
