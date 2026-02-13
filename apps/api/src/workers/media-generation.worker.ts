import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { MediaGenerationJobData } from "@contenthq/queue";
import { mediaProviderRegistry, truncateForLog, formatFileSize } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { generatedMedia } from "@contenthq/db/schema";
import { storage } from "@contenthq/storage";
import { eq } from "drizzle-orm";

export function createMediaGenerationWorker(): Worker {
  return new Worker<MediaGenerationJobData>(
    QUEUE_NAMES.MEDIA_GENERATION,
    async (job) => {
      const {
        generatedMediaId,
        prompt,
        mediaType,
        model,
        provider: _provider,
        aspectRatio,
        quality,
        style,
        duration,
        count,
        referenceImageUrl,
        editOptions,
        userId,
      } = job.data;

      console.warn(
        `[MediaGeneration] Processing job ${job.id} for media ${generatedMediaId}: model=${model}, mediaType=${mediaType}, prompt="${truncateForLog(prompt, 200)}", aspectRatio=${aspectRatio ?? "default"}, quality=${quality ?? "default"}, style=${style ?? "default"}, duration=${duration ?? "N/A"}, count=${count ?? 1}, hasReferenceImage=${!!referenceImageUrl}, isEdit=${!!editOptions}`
      );

      let provider: ReturnType<typeof mediaProviderRegistry.getProviderForModel>;

      try {
        await job.updateProgress(10);

        provider = mediaProviderRegistry.getProviderForModel(model);
        if (!provider) {
          throw new Error(`No provider found for model: ${model}`);
        }

        let result;

        if (editOptions) {
          // Edit an existing image
          if (!provider.editImage) {
            throw new Error(
              `Provider ${provider.name} does not support image editing`
            );
          }
          result = await provider.editImage({
            image: editOptions.sourceImageUrl,
            prompt,
            model,
            strength: editOptions.strength,
            count: 1,
          });
        } else if (mediaType === "video") {
          // Generate video
          if (!provider.generateVideo) {
            throw new Error(
              `Provider ${provider.name} does not support video generation`
            );
          }
          result = await provider.generateVideo({
            prompt,
            model,
            aspectRatio: aspectRatio as
              | "1:1"
              | "16:9"
              | "9:16"
              | "4:3"
              | "3:4"
              | "21:9",
            duration,
            referenceImageUrl,
          });
        } else {
          // Generate image
          if (!provider.generateImage) {
            throw new Error(
              `Provider ${provider.name} does not support image generation`
            );
          }
          result = await provider.generateImage({
            prompt,
            model,
            aspectRatio: aspectRatio as
              | "1:1"
              | "16:9"
              | "9:16"
              | "4:3"
              | "3:4"
              | "21:9",
            quality: quality as "standard" | "hd",
            style: style as "natural" | "vivid" | undefined,
            count,
          });
        }

        await job.updateProgress(60);

        console.warn(`[MediaGeneration] Generation complete for media ${generatedMediaId}: hasImages=${!!(result.images && result.images.length > 0)}, hasVideo=${!!result.videoUrl}, generationTimeMs=${result.generationTimeMs}`);

        let mediaUrl: string;
        let storageKey: string;
        let mimeType: string;
        let fileSize: number;
        let width: number | undefined;
        let height: number | undefined;
        let revisedPrompt: string | undefined;

        if (result.images && result.images.length > 0) {
          // Image result: upload base64 to storage
          const image = result.images[0];
          const buffer = Buffer.from(image.base64, "base64");
          mimeType = image.mediaType || "image/png";
          const ext = mimeType === "image/png" ? "png" : "jpg";
          storageKey = `generated-media/${userId}/${generatedMediaId}.${ext}`;

          const uploadResult = await storage.uploadFileWithRetry(
            storageKey,
            buffer,
            mimeType
          );
          mediaUrl = uploadResult.url;
          fileSize = buffer.length;
          revisedPrompt = image.revisedPrompt;

          // Resolve dimensions from provider
          const dims = provider.getDimensions(
            model,
            aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9"
          );
          width = dims.width;
          height = dims.height;
        } else if (result.videoUrl) {
          // Video result: fetch and upload
          storageKey = `generated-media/${userId}/${generatedMediaId}.mp4`;
          mimeType = "video/mp4";

          const videoResponse = await fetch(result.videoUrl);
          if (!videoResponse.ok) {
            throw new Error(
              `Failed to fetch generated video: ${videoResponse.statusText}`
            );
          }
          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

          const uploadResult = await storage.uploadFileWithRetry(
            storageKey,
            videoBuffer,
            mimeType
          );
          mediaUrl = uploadResult.url;
          fileSize = videoBuffer.length;
        } else {
          throw new Error("Provider returned no image or video data");
        }

        await job.updateProgress(80);

        // Update the generated media record with results
        await db
          .update(generatedMedia)
          .set({
            mediaUrl,
            storageKey,
            status: "completed",
            generationTimeMs: result.generationTimeMs,
            width: width ?? null,
            height: height ?? null,
            fileSize,
            mimeType,
            revisedPrompt: revisedPrompt ?? null,
            updatedAt: new Date(),
          })
          .where(eq(generatedMedia.id, generatedMediaId));

        await job.updateProgress(100);
        console.warn(
          `[MediaGeneration] Completed media ${generatedMediaId}: provider=${provider.name}, model=${model}, mediaType=${mediaType}, fileSize=${formatFileSize(fileSize)}, storageKey=${storageKey}, dimensions=${width ?? "?"}x${height ?? "?"}, revisedPrompt="${truncateForLog(revisedPrompt, 150)}", generationTimeMs=${result.generationTimeMs}`
        );

        return { success: true, generatedMediaId, mediaUrl };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `[MediaGeneration] Failed for media ${generatedMediaId}: provider=${provider?.name ?? "unknown"}, model=${model}, mediaType=${mediaType}, prompt="${truncateForLog(prompt, 100)}"`,
          error
        );

        // Update DB record with failure status
        await db
          .update(generatedMedia)
          .set({
            status: "failed",
            errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(generatedMedia.id, generatedMediaId));

        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
