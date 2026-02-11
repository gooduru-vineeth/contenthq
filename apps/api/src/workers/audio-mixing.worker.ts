import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { AudioMixingJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneAudioMixes, projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export function createAudioMixingWorker(): Worker {
  return new Worker<AudioMixingJobData>(
    QUEUE_NAMES.AUDIO_MIXING,
    async (job) => {
      const { projectId, sceneId, musicTrackId } = job.data;
      console.warn(`[AudioMix] Processing job ${job.id} for scene ${sceneId}`);

      try {
        await job.updateProgress(10);

        // In production, download voiceover and music from storage, mix with FFmpeg
        // For now, create the audio mix record with defaults
        const mixedAudioKey = `projects/${projectId}/scenes/${sceneId}/mixed-audio.mp3`;

        await db.insert(sceneAudioMixes).values({
          sceneId,
          mixedAudioUrl: mixedAudioKey,
          voiceoverVolume: 100,
          musicVolume: musicTrackId ? 30 : 0,
          musicDuckingEnabled: true,
        });

        await job.updateProgress(100);

        // Update project status
        await db
          .update(projects)
          .set({ status: "mixing_audio", progressPercent: 75, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        console.warn(`[AudioMix] Completed for scene ${sceneId}`);
        return { success: true };
      } catch (error) {
        console.error(`[AudioMix] Failed for scene ${sceneId}:`, error);
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
