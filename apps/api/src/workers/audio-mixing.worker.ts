import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { AudioMixingJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { sceneAudioMixes, scenes, sceneVideos, musicTracks, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { videoService } from "@contenthq/video";
import { storage, getSceneAudioPath, getAudioContentType } from "@contenthq/storage";
import { formatFileSize } from "@contenthq/ai";
import { creditService } from "../services/credit.service";
import { costCalculationService } from "../services/cost-calculation.service";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createAudioMixingWorker(): Worker {
  return new Worker<AudioMixingJobData>(
    QUEUE_NAMES.AUDIO_MIXING,
    async (job) => {
      const { projectId, sceneId, userId, musicTrackId, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[AudioMix] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, musicTrackId=${musicTrackId ?? "none"}, hasStageConfig=${!!stageConfig}`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[AudioMix] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      // Apply stageConfig overrides for volume and mixing
      const cfgVoiceoverVolume = stageConfig?.voiceoverVolume ?? 100;
      const cfgMusicVolume = stageConfig?.musicVolume ?? (musicTrackId ? 30 : 0);
      const cfgMusicDucking = stageConfig?.musicDuckingEnabled ?? true;

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

        // Download voiceover from R2 (stored by TTS worker)
        const [sceneVideo] = await db
          .select()
          .from(sceneVideos)
          .where(eq(sceneVideos.sceneId, sceneId));

        if (!sceneVideo?.voiceoverUrl) {
          throw new Error(`No voiceover found for scene ${sceneId}`);
        }

        console.warn(`[AudioMix] Downloading voiceover for scene ${sceneId}: url=${sceneVideo.voiceoverUrl.substring(0, 80)}`);
        const voiceoverResponse = await fetch(sceneVideo.voiceoverUrl);
        if (!voiceoverResponse.ok) {
          throw new Error(`Failed to download voiceover: ${voiceoverResponse.statusText}`);
        }
        const voiceoverBuffer = Buffer.from(await voiceoverResponse.arrayBuffer());

        await job.updateProgress(30);

        // Optionally download music track
        let musicBuffer: Buffer | undefined;
        if (musicTrackId) {
          const [track] = await db
            .select()
            .from(musicTracks)
            .where(eq(musicTracks.id, musicTrackId));

          if (track?.url) {
            console.warn(`[AudioMix] Downloading music track for scene ${sceneId}: trackId=${musicTrackId}, trackName="${track.name ?? "unknown"}"`);
            const musicResponse = await fetch(track.url);
            if (musicResponse.ok) {
              musicBuffer = Buffer.from(await musicResponse.arrayBuffer());
            }
          }
        }

        await job.updateProgress(50);

        // Mix audio with FFmpeg
        console.warn(`[AudioMix] Mixing audio for scene ${sceneId}: voiceoverSize=${formatFileSize(voiceoverBuffer.length)}, musicSize=${musicBuffer ? formatFileSize(musicBuffer.length) : "none"}, voiceoverVolume=${cfgVoiceoverVolume}, musicVolume=${cfgMusicVolume}, ducking=${cfgMusicDucking}`);
        const mixResult = await videoService.mixSceneAudio({
          voiceoverBuffer,
          musicBuffer,
          voiceoverVolume: cfgVoiceoverVolume,
          musicVolume: cfgMusicVolume,
        });

        await job.updateProgress(70);

        // Upload mixed audio to R2
        const mixedKey = getSceneAudioPath(userId, projectId, sceneId, `mixed-audio.${mixResult.format}`);
        const uploadResult = await storage.uploadFileWithRetry(mixedKey, mixResult.audioBuffer, getAudioContentType(mixResult.format));
        const mixedAudioUrl = uploadResult.url;

        console.warn(`[AudioMix] Uploaded mixed audio for scene ${sceneId}: key=${mixedKey}, outputSize=${formatFileSize(mixResult.audioBuffer.length)}, format=${mixResult.format}`);

        // Check if a record already exists for idempotency
        const existing = await db
          .select()
          .from(sceneAudioMixes)
          .where(eq(sceneAudioMixes.sceneId, sceneId));

        if (existing.length > 0) {
          await db
            .update(sceneAudioMixes)
            .set({
              mixedAudioUrl,
              storageKey: uploadResult.key,
              voiceoverVolume: cfgVoiceoverVolume,
              musicVolume: cfgMusicVolume,
              musicDuckingEnabled: cfgMusicDucking,
              updatedAt: new Date(),
            })
            .where(eq(sceneAudioMixes.id, existing[0].id));
        } else {
          await db.insert(sceneAudioMixes).values({
            sceneId,
            mixedAudioUrl,
            storageKey: uploadResult.key,
            voiceoverVolume: cfgVoiceoverVolume,
            musicVolume: cfgMusicVolume,
            musicDuckingEnabled: cfgMusicDucking,
          });
        }

        // Update scene status to audio_mixed
        await db
          .update(scenes)
          .set({ status: "audio_mixed", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(100);

        // Deduct credits for audio mixing with cost breakdown
        try {
          const credits = costCalculationService.getOperationCredits("AUDIO_MIXING");
          await creditService.deductCredits(userId, credits, `Audio mixing for scene ${sceneId}`, {
            projectId,
            operationType: "AUDIO_MIXING",
            jobId: job.id,
            costBreakdown: {
              billedCostCredits: String(credits),
              costBreakdown: { stage: "AUDIO_MIXING" },
            },
          });
        } catch (err) {
          console.warn(`[AudioMix] Credit deduction failed (non-fatal):`, err);
        }

        // Update project status
        await db
          .update(projects)
          .set({ status: "mixing_audio", progressPercent: 75, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[AudioMix] Completed for scene ${sceneId}: mixedAudioUrl=${mixedAudioUrl.substring(0, 80)}, outputSize=${formatFileSize(mixResult.audioBuffer.length)}, format=${mixResult.format}, voiceoverVolume=${cfgVoiceoverVolume}, musicVolume=${cfgMusicVolume} (${durationMs}ms)`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              sceneId,
              log: {
                stage: "AUDIO_MIXING",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Mixed audio for scene ${sceneId}`,
              },
            },
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
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[AudioMix] Failed for scene ${sceneId} after ${durationMs}ms:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "AUDIO_MIXING",
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
              eq(generationJobs.jobType, "AUDIO_MIXING"),
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
