import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { TTSGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneVideos, scenes, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { storage, getSceneAudioPath, getAudioContentType } from "@contenthq/storage";

export function createTTSGenerationWorker(): Worker {
  return new Worker<TTSGenerationJobData>(
    QUEUE_NAMES.TTS_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, narrationScript, voiceId, provider } = job.data;
      const startedAt = new Date();
      console.warn(`[TTS] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, provider=${provider}, voiceId=${voiceId}, scriptLength=${narrationScript?.length ?? 0} chars`);

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

        // Dynamic import to avoid requiring TTS package at startup
        const { generateSpeech } = await import("@contenthq/tts");

        console.warn(`[TTS] Calling generateSpeech for scene ${sceneId} (provider=${provider}, voiceId=${voiceId})`);
        const result = await generateSpeech({
          text: narrationScript,
          voiceId,
          provider: provider as "openai" | "elevenlabs" | "google",
        });

        console.warn(`[TTS] Speech generated for scene ${sceneId}: duration=${result.duration}s, format=${result.format}`);
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
            });
          }
        });

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

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[TTS] Completed for scene ${sceneId}: audioDuration=${result.duration}s, voiceoverKey=${voiceoverKey} (${durationMs}ms)`);

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
