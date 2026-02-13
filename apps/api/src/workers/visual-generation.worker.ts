import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, addVisualVerificationJob } from "@contenthq/queue";
import type { VisualGenerationJobData } from "@contenthq/queue";
import { generateImage, executeAgent, truncateForLog, formatFileSize } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { storage, getSceneVisualPath } from "@contenthq/storage";

export function createVisualGenerationWorker(): Worker {
  return new Worker<VisualGenerationJobData>(
    QUEUE_NAMES.VISUAL_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, imagePrompt, agentId, mediaOverrideUrl, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[VisualGeneration] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, promptLength=${imagePrompt?.length ?? 0} chars, agentId=${agentId ?? "none"}, hasOverride=${!!mediaOverrideUrl}, hasStageConfig=${!!stageConfig}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VISUAL_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

        await job.updateProgress(10);

        // Check for media override - skip AI generation if user provided media
        if (mediaOverrideUrl) {
          console.warn(`[VisualGeneration] Using media override for scene ${sceneId}: ${mediaOverrideUrl.substring(0, 80)}`);
          const overrideResponse = await fetch(mediaOverrideUrl);
          if (!overrideResponse.ok) throw new Error(`Failed to fetch media override: ${overrideResponse.statusText}`);
          const overrideBuffer = Buffer.from(await overrideResponse.arrayBuffer());
          const overrideContentType = overrideResponse.headers.get("content-type") ?? "image/png";
          const overrideExt = overrideContentType.includes("png") ? "png" : overrideContentType.includes("webp") ? "webp" : "jpg";
          const overrideKey = getSceneVisualPath(userId, projectId, sceneId, `visual-override.${overrideExt}`);
          const overrideUpload = await storage.uploadFileWithRetry(overrideKey, overrideBuffer, overrideContentType);

          await db.insert(sceneVisuals).values({
            sceneId,
            imageUrl: overrideUpload.url,
            storageKey: overrideKey,
            prompt: imagePrompt,
          });

          await db.update(scenes).set({ status: "visual_generated", updatedAt: new Date() }).where(eq(scenes.id, sceneId));

          // Create verification job and queue it
          await db.insert(generationJobs).values({ userId, projectId, jobType: "VISUAL_VERIFICATION", status: "queued" });
          await addVisualVerificationJob({
            projectId, sceneId, userId,
            imageUrl: overrideUpload.url,
            visualDescription: imagePrompt,
          });

          const completedAt = new Date();
          await db.update(generationJobs).set({
            status: "completed", progressPercent: 100,
            result: { imageUrl: overrideUpload.url, override: true, log: { stage: "VISUAL_GENERATION", status: "completed", startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), durationMs: completedAt.getTime() - startedAt.getTime(), details: `Used media override for scene ${sceneId}` } },
            updatedAt: new Date(),
          }).where(and(eq(generationJobs.projectId, projectId), eq(generationJobs.jobType, "VISUAL_GENERATION"), eq(generationJobs.status, "processing")));

          return { success: true, imageUrl: overrideUpload.url, override: true };
        }

        // Read stageConfig for provider/model/quality overrides
        const imageSize = (stageConfig?.imageSize ?? "1024x1024") as "1024x1024" | "1792x1024" | "1024x1792";
        const imageQuality = (stageConfig?.quality ?? "standard") as "standard" | "hd";

        let imageUrl: string;

        if (agentId) {
          // New path: use agent executor
          console.warn(`[VisualGeneration] Using agent executor (agentId=${agentId}) for scene ${sceneId}`);
          const result = await executeAgent({
            agentId,
            variables: { prompt: imagePrompt },
            projectId,
            userId,
            db,
          });
          const resultData = result.data as { url: string };
          imageUrl = resultData.url;
          console.warn(`[VisualGeneration] Agent generated image for scene ${sceneId}: url=${imageUrl?.substring(0, 80)}, prompt="${truncateForLog(imagePrompt, 200)}"`);
        } else {
          // Existing path: generate image directly
          console.warn(`[VisualGeneration] Generating image directly for scene ${sceneId}: provider=openai, model=dall-e-3, size=${imageSize}, quality=${imageQuality}, prompt="${truncateForLog(imagePrompt, 200)}"`);
          const result = await generateImage({
            prompt: imagePrompt,
            size: imageSize,
            quality: imageQuality,
          });
          imageUrl = result.url;
          console.warn(`[VisualGeneration] Image generated for scene ${sceneId}: url=${imageUrl?.substring(0, 80)}`);
        }

        await job.updateProgress(60);

        // Download image from provider and re-upload to R2 (external URLs like DALL-E expire)
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error(`Failed to fetch generated image: ${imageResponse.statusText}`);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const contentType = imageResponse.headers.get("content-type") ?? "image/png";
        const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
        const storageKey = getSceneVisualPath(userId, projectId, sceneId, `visual.${ext}`);
        const r2Upload = await storage.uploadFileWithRetry(storageKey, imageBuffer, contentType);
        console.warn(`[VisualGeneration] Uploaded to R2: storageKey=${storageKey}, fileSize=${formatFileSize(imageBuffer.length)}, contentType=${contentType}`);
        const r2ImageUrl = r2Upload.url;

        // Fetch the scene to get visualDescription for verification
        const [scene] = await db
          .select()
          .from(scenes)
          .where(eq(scenes.id, sceneId));

        // Store generated visual in database with R2 URL
        await db.insert(sceneVisuals).values({
          sceneId,
          imageUrl: r2ImageUrl,
          storageKey,
          prompt: imagePrompt,
        });

        // Update scene status
        await db
          .update(scenes)
          .set({ status: "visual_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(80);

        // Create generationJob record for verification stage
        await db.insert(generationJobs).values({
          userId,
          projectId,
          jobType: "VISUAL_VERIFICATION",
          status: "queued",
        });

        // Queue visual verification with R2 URL
        await addVisualVerificationJob({
          projectId,
          sceneId,
          userId,
          imageUrl: r2ImageUrl,
          visualDescription: scene?.visualDescription ?? imagePrompt,
        });

        console.warn(`[VisualGeneration] Queued VISUAL_VERIFICATION for scene ${sceneId}`);

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[VisualGeneration] Completed for scene ${sceneId} (${durationMs}ms)`);

        // Update project status to generating_visuals
        await db
          .update(projects)
          .set({ status: "generating_visuals", updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              imageUrl: r2ImageUrl,
              log: {
                stage: "VISUAL_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Generated visual for scene ${sceneId}`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VISUAL_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        return { success: true, imageUrl: r2ImageUrl };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VisualGeneration] Failed for scene ${sceneId} after ${durationMs}ms: prompt="${truncateForLog(imagePrompt, 100)}", error:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "VISUAL_GENERATION",
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
              eq(generationJobs.jobType, "VISUAL_GENERATION"),
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
