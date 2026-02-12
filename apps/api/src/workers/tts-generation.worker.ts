import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { TTSGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneVideos, scenes, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";

export function createTTSGenerationWorker(): Worker {
  return new Worker<TTSGenerationJobData>(
    QUEUE_NAMES.TTS_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, narrationScript, voiceId, provider } = job.data;
      console.warn(`[TTS] Processing job ${job.id} for scene ${sceneId}`);

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

        const result = await generateSpeech({
          text: narrationScript,
          voiceId,
          provider: provider as "openai" | "elevenlabs" | "google",
        });

        await job.updateProgress(70);

        // Store voiceover URL (in production, upload to R2 first)
        // For now, we store a placeholder and the buffer could be uploaded by the storage service
        const voiceoverKey = `projects/${projectId}/scenes/${sceneId}/voiceover.${result.format}`;

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
                voiceoverUrl: voiceoverKey,
                ttsProvider: provider,
                ttsVoiceId: voiceId,
                updatedAt: new Date(),
              })
              .where(eq(sceneVideos.sceneId, sceneId));
          } else {
            await tx.insert(sceneVideos).values({
              sceneId,
              voiceoverUrl: voiceoverKey,
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

        await job.updateProgress(100);
        console.warn(`[TTS] Completed for scene ${sceneId}, duration: ${result.duration}s`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: { duration: result.duration },
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
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "TTS_GENERATION");

        return { success: true, duration: result.duration };
      } catch (error) {
        console.error(`[TTS] Failed for scene ${sceneId}:`, error);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({ status: "failed", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "TTS_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
