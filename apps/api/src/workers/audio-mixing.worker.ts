import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { AudioMixingJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneAudioMixes, scenes, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";

export function createAudioMixingWorker(): Worker {
  return new Worker<AudioMixingJobData>(
    QUEUE_NAMES.AUDIO_MIXING,
    async (job) => {
      const { projectId, sceneId, userId, musicTrackId } = job.data;
      console.warn(`[AudioMix] Processing job ${job.id} for scene ${sceneId}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "AUDIO_MIXING"),
              eq(generationJobs.status, "queued")
            )
          );

        await job.updateProgress(10);

        // In production, download voiceover and music from storage, mix with FFmpeg
        // For now, create the audio mix record with defaults
        const mixedAudioKey = `projects/${projectId}/scenes/${sceneId}/mixed-audio.mp3`;

        // Check if a record already exists for idempotency
        const existing = await db
          .select()
          .from(sceneAudioMixes)
          .where(eq(sceneAudioMixes.sceneId, sceneId));

        if (existing.length > 0) {
          await db
            .update(sceneAudioMixes)
            .set({
              mixedAudioUrl: mixedAudioKey,
              voiceoverVolume: 100,
              musicVolume: musicTrackId ? 30 : 0,
              musicDuckingEnabled: true,
              updatedAt: new Date(),
            })
            .where(eq(sceneAudioMixes.id, existing[0].id));
        } else {
          await db.insert(sceneAudioMixes).values({
            sceneId,
            mixedAudioUrl: mixedAudioKey,
            voiceoverVolume: 100,
            musicVolume: musicTrackId ? 30 : 0,
            musicDuckingEnabled: true,
          });
        }

        // Update scene status to audio_mixed (Fix 5)
        await db
          .update(scenes)
          .set({ status: "audio_mixed", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(100);

        // Update project status
        await db
          .update(projects)
          .set({ status: "mixing_audio", progressPercent: 75, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        console.warn(`[AudioMix] Completed for scene ${sceneId}`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: { sceneId },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "AUDIO_MIXING"),
              eq(generationJobs.status, "processing")
            )
          );

        // Advance pipeline to next stage
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "AUDIO_MIXING");

        return { success: true };
      } catch (error) {
        console.error(`[AudioMix] Failed for scene ${sceneId}:`, error);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({ status: "failed", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "AUDIO_MIXING"),
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
