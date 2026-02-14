import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { TTSGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneVideos, scenes, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { storage, getSceneAudioPath, getAudioContentType } from "@contenthq/storage";
import { formatFileSize } from "@contenthq/ai";
import type { TTSProvider } from "@contenthq/tts";
import { creditService, type CostBreakdownOpts } from "../services/credit.service";
import { costCalculationService } from "../services/cost-calculation.service";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createTTSGenerationWorker(): Worker {
  return new Worker<TTSGenerationJobData>(
    QUEUE_NAMES.TTS_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, narrationScript, voiceId, provider, mediaOverrideUrl, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[TTS] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, provider=${provider}, voiceId=${voiceId}, scriptLength=${narrationScript?.length ?? 0} chars, hasOverride=${!!mediaOverrideUrl}, hasStageConfig=${!!stageConfig}`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[TTS] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "TTS_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

        await job.updateProgress(10);

        // Check for media override - skip TTS generation if user provided voiceover
        if (mediaOverrideUrl) {
          console.warn(`[TTS] Using media override for scene ${sceneId}: ${mediaOverrideUrl.substring(0, 80)}`);
          const overrideResponse = await fetch(mediaOverrideUrl);
          if (!overrideResponse.ok) throw new Error(`Failed to fetch TTS override: ${overrideResponse.statusText}`);
          const overrideBuffer = Buffer.from(await overrideResponse.arrayBuffer());
          const overrideFormat = stageConfig?.format ?? "mp3";
          const overrideKey = getSceneAudioPath(userId, projectId, sceneId, `voiceover-override.${overrideFormat}`);
          const overrideUpload = await storage.uploadFileWithRetry(overrideKey, overrideBuffer, getAudioContentType(overrideFormat));

          await db.transaction(async (tx) => {
            const existing = await tx.select().from(sceneVideos).where(eq(sceneVideos.sceneId, sceneId));
            if (existing.length > 0) {
              await tx.update(sceneVideos).set({ voiceoverUrl: overrideUpload.url, storageKey: overrideKey, ttsProvider: "override", updatedAt: new Date() }).where(eq(sceneVideos.sceneId, sceneId));
            } else {
              await tx.insert(sceneVideos).values({ sceneId, voiceoverUrl: overrideUpload.url, storageKey: overrideKey, ttsProvider: "override" });
            }
          });

          await db.update(scenes).set({ status: "video_generated", updatedAt: new Date() }).where(eq(scenes.id, sceneId));

          const completedAt = new Date();
          await db.update(generationJobs).set({
            status: "completed", progressPercent: 100,
            result: { override: true, log: { stage: "TTS_GENERATION", status: "completed", startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), durationMs: completedAt.getTime() - startedAt.getTime(), details: `Used voiceover override for scene ${sceneId}` } },
            updatedAt: new Date(),
          }).where(and(eq(generationJobs.projectId, projectId), eq(generationJobs.jobType, "TTS_GENERATION"), eq(generationJobs.status, "processing")));

          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "TTS_GENERATION");
          return { success: true, override: true };
        }

        // Apply stageConfig overrides for TTS quality/speed/format
        const _ttsSpeed = stageConfig?.speed;
        const _ttsPitch = stageConfig?.pitch;

        // Dynamic import to avoid requiring TTS package at startup
        const { generateSpeech } = await import("@contenthq/tts");

        console.warn(`[TTS] Calling generateSpeech for scene ${sceneId} (provider=${provider}, voiceId=${voiceId})`);
        const result = await generateSpeech({
          text: narrationScript,
          voiceId,
          provider: provider as TTSProvider,
        });

        console.warn(`[TTS] Speech generated for scene ${sceneId}: duration=${result.duration}s, format=${result.format}, audioFileSize=${formatFileSize(result.audioBuffer.length)}`);
        await job.updateProgress(70);

        // Upload voiceover to R2
        const voiceoverKey = getSceneAudioPath(userId, projectId, sceneId, `voiceover.${result.format}`);
        const uploadResult = await storage.uploadFileWithRetry(voiceoverKey, result.audioBuffer, getAudioContentType(result.format));
        const voiceoverUrl = uploadResult.url;

        // Update scene video record (wrapped in transaction to handle race conditions)
        await db.transaction(async (tx) => {
          const existing = await tx
            .select()
            .from(sceneVideos)
            .where(eq(sceneVideos.sceneId, sceneId));

          if (existing.length > 0) {
            await tx
              .update(sceneVideos)
              .set({
                voiceoverUrl,
                storageKey: voiceoverKey,
                ttsProvider: provider,
                ttsVoiceId: voiceId,
                duration: result.duration,
                updatedAt: new Date(),
              })
              .where(eq(sceneVideos.sceneId, sceneId));
          } else {
            await tx.insert(sceneVideos).values({
              sceneId,
              voiceoverUrl,
              storageKey: voiceoverKey,
              ttsProvider: provider,
              ttsVoiceId: voiceId,
              duration: result.duration,
            });
          }
        });

        // Write audio duration to scenes table for downstream stages
        await db
          .update(scenes)
          .set({ audioDuration: result.duration, updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        // Update scene status to video_generated (Fix 5)
        await db
          .update(scenes)
          .set({ status: "video_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        // Update project status to generating_tts
        await db
          .update(projects)
          .set({ status: "generating_tts", progressPercent: 62, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        // Deduct credits for TTS generation with cost breakdown
        try {
          const credits = costCalculationService.getOperationCredits("TTS_GENERATION", { provider });
          const costData: CostBreakdownOpts = {
            billedCostCredits: String(credits),
            costBreakdown: {
              stage: "TTS_GENERATION",
              provider,
              voiceId,
              characterCount: narrationScript?.length ?? 0,
              audioDuration: result.duration,
              format: result.format,
            },
          };
          await creditService.deductCredits(userId, credits, `TTS generation for scene ${sceneId}`, {
            projectId,
            operationType: "TTS_GENERATION",
            provider,
            jobId: job.id,
            costBreakdown: costData,
          });
        } catch (err) {
          console.warn(`[TTS] Credit deduction failed (non-fatal):`, err);
        }

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[TTS] Completed for scene ${sceneId}: audioDuration=${result.duration}s, voiceoverKey=${voiceoverKey}, fileSize=${formatFileSize(result.audioBuffer.length)} (${durationMs}ms)`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              duration: result.duration,
              log: {
                stage: "TTS_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Generated TTS for scene ${sceneId} (${result.duration}s)`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "TTS_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        // Advance pipeline to next stage
        console.warn(`[TTS] Advancing pipeline after TTS for scene ${sceneId}`);
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "TTS_GENERATION");

        return { success: true, duration: result.duration };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[TTS] Failed for scene ${sceneId} after ${durationMs}ms:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "TTS_GENERATION",
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
              eq(generationJobs.jobType, "TTS_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        // Mark project as failed
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
