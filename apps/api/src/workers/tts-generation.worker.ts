import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { TTSGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneVideos } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export function createTTSGenerationWorker(): Worker {
  return new Worker<TTSGenerationJobData>(
    QUEUE_NAMES.TTS_GENERATION,
    async (job) => {
      const { projectId, sceneId, narrationScript, voiceId, provider } = job.data;
      console.warn(`[TTS] Processing job ${job.id} for scene ${sceneId}`);

      try {
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

        // Update scene video record
        const existing = await db
          .select()
          .from(sceneVideos)
          .where(eq(sceneVideos.sceneId, sceneId));

        if (existing.length > 0) {
          await db
            .update(sceneVideos)
            .set({
              voiceoverUrl: voiceoverKey,
              ttsProvider: provider,
              ttsVoiceId: voiceId,
              updatedAt: new Date(),
            })
            .where(eq(sceneVideos.sceneId, sceneId));
        } else {
          await db.insert(sceneVideos).values({
            sceneId,
            voiceoverUrl: voiceoverKey,
            ttsProvider: provider,
            ttsVoiceId: voiceId,
          });
        }

        await job.updateProgress(100);
        console.warn(`[TTS] Completed for scene ${sceneId}, duration: ${result.duration}s`);
        return { success: true, duration: result.duration };
      } catch (error) {
        console.error(`[TTS] Failed for scene ${sceneId}:`, error);
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
