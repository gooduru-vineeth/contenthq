import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { VideoAssemblyJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { projects, scenes, sceneVideos, sceneVisuals, sceneAudioMixes, projectAudio, projectAudioTranscripts, musicTracks, generationJobs } from "@contenthq/db/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { videoService } from "@contenthq/video";
import { storage, getOutputPath, getSceneVideoPath, getVideoContentType, getAudioContentType } from "@contenthq/storage";
import { formatFileSize } from "@contenthq/ai";
import type { TransitionSpec, TransitionType } from "@contenthq/video";
import { pickRandomTransition, mapAiTransitionName } from "@contenthq/video";
import { creditService } from "../services/credit.service";
import { costCalculationService } from "../services/cost-calculation.service";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createVideoAssemblyWorker(): Worker {
  return new Worker<VideoAssemblyJobData>(
    QUEUE_NAMES.VIDEO_ASSEMBLY,
    async (job) => {
      const { projectId, userId, sceneIds, stageConfig, captionConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[VideoAssembly] Processing job ${job.id} for project ${projectId}, sceneCount=${sceneIds?.length ?? 0}, hasStageConfig=${!!stageConfig}, hasCaptionConfig=${!!captionConfig}`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[VideoAssembly] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      // Apply stageConfig overrides for assembly
      const outputResolution = stageConfig?.resolution ?? "1920x1080";
      const [resWidth, resHeight] = outputResolution.split("x").map(Number);
      const assemblyWidth = resWidth || 1920;
      const assemblyHeight = resHeight || 1080;
      const _assemblyFps = stageConfig?.fps ?? 30;

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VIDEO_ASSEMBLY"),
              eq(generationJobs.status, "queued")
            )
          );

        await db
          .update(projects)
          .set({ status: "assembling", progressPercent: 87, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // NEW PATH: Audio-first assembly (when projectAudioId is present)
        if (job.data.projectAudioId) {
          const { projectAudioId, musicTrackId } = job.data;
          console.warn(`[VideoAssembly] Audio-first path: projectAudioId=${projectAudioId}`);

          // Fetch project audio
          const [audio] = await db.select().from(projectAudio).where(eq(projectAudio.id, projectAudioId));
          if (!audio?.audioUrl) throw new Error(`Project audio ${projectAudioId} not found or has no URL`);

          // Download project audio
          const audioResponse = await fetch(audio.audioUrl);
          if (!audioResponse.ok) throw new Error(`Failed to download project audio: ${audioResponse.statusText}`);
          let audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

          await job.updateProgress(20);

          // Mix background music if musicTrackId provided
          if (musicTrackId) {
            console.warn(`[VideoAssembly] Mixing background music (trackId=${musicTrackId})`);
            try {
              const [musicTrack] = await db.select().from(musicTracks).where(eq(musicTracks.id, musicTrackId));
              if (!musicTrack?.url) throw new Error(`Music track ${musicTrackId} not found`);
              const musicResp = await fetch(musicTrack.url);
              if (!musicResp.ok) throw new Error(`Failed to download music track: ${musicResp.statusText}`);
              const musicBuffer = Buffer.from(await musicResp.arrayBuffer()) as Buffer<ArrayBuffer>;
              const mixResult = await videoService.mixSceneAudio({
                voiceoverBuffer: audioBuffer,
                musicBuffer: musicBuffer,
                voiceoverVolume: 100,
                musicVolume: 15,
              });
              audioBuffer = mixResult.audioBuffer as Buffer<ArrayBuffer>;

              // Upload mixed audio
              const mixedKey = getOutputPath(userId, projectId, `narration-mixed.${audio.format ?? "mp3"}`);
              const mixedUpload = await storage.uploadFileWithRetry(mixedKey, audioBuffer, getAudioContentType(audio.format ?? "mp3"));

              await db.update(projectAudio).set({
                mixedAudioUrl: mixedUpload.url,
                mixedAudioStorageKey: mixedKey,
                updatedAt: new Date(),
              }).where(eq(projectAudio.id, projectAudioId));
            } catch (err) {
              console.warn(`[VideoAssembly] Music mixing failed (non-fatal, using plain audio):`, err);
            }
          }

          await job.updateProgress(30);

          // Fetch scenes in order
          const sceneList = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, projectId))
            .orderBy(asc(scenes.index));

          // Generate caption segments from transcript words
          const subtitleSegments: Array<{
            text: string;
            startTime: number;
            endTime: number;
            wordTimings?: Array<{ word: string; start: number; end: number }>;
          }> = [];

          const [transcript] = await db
            .select()
            .from(projectAudioTranscripts)
            .where(eq(projectAudioTranscripts.projectId, projectId));

          if (transcript?.words) {
            const words = transcript.words as Array<{ word: string; startMs: number; endMs: number }>;
            // Group words into subtitle segments (4-5 words per line)
            const wordsPerLine = captionConfig?.wordsPerLine ?? 4;
            for (let i = 0; i < words.length; i += wordsPerLine) {
              const group = words.slice(i, i + wordsPerLine);
              subtitleSegments.push({
                text: group.map((w) => w.word).join(" "),
                startTime: group[0].startMs / 1000,
                endTime: group[group.length - 1].endMs / 1000,
                wordTimings: group.map((w) => ({
                  word: w.word,
                  start: w.startMs / 1000,
                  end: w.endMs / 1000,
                })),
              });
            }
            console.warn(`[VideoAssembly] Generated ${subtitleSegments.length} caption segments from transcript`);
          }

          await job.updateProgress(40);

          // Build scene video buffers
          const assemblyScenes: Array<{ videoBuffer: Buffer; duration: number; transition?: TransitionSpec }> = [];
          for (const scene of sceneList) {
            const [video] = await db.select().from(sceneVideos).where(eq(sceneVideos.sceneId, scene.id));
            let videoUrl = video?.videoUrl ?? null;
            let videoBuffer: Buffer | null = null;

            if (!videoUrl) {
              const [visual] = await db.select().from(sceneVisuals).where(eq(sceneVisuals.sceneId, scene.id));
              if (!visual?.imageUrl) {
                console.warn(`[VideoAssembly] Skipping scene ${scene.id}: no video or image`);
                continue;
              }

              const duration = scene.duration ?? 5;
              const videoResult = await videoService.generateSceneVideo({
                imageUrl: visual.imageUrl,
                duration,
                width: assemblyWidth,
                height: assemblyHeight,
              });

              const videoKey = getSceneVideoPath(userId, projectId, scene.id, `video.${videoResult.format}`);
              const uploadResult = await storage.uploadFileWithRetry(videoKey, videoResult.videoBuffer, getVideoContentType(videoResult.format));
              videoUrl = uploadResult.url;
              videoBuffer = videoResult.videoBuffer;
            }

            if (!videoBuffer) {
              const resp = await fetch(videoUrl);
              if (!resp.ok) continue;
              videoBuffer = Buffer.from(await resp.arrayBuffer());
            }

            // Resolve transition
            const transitionDuration = stageConfig?.transitionDuration ?? 0.5;
            const defaultTransitionType = (stageConfig?.transitionType ?? "fade") as TransitionType;
            let transition: TransitionSpec;
            if (assemblyScenes.length === sceneList.length - 1) {
              transition = { type: "none" };
            } else if (scene.transitions) {
              transition = { type: mapAiTransitionName(scene.transitions), duration: transitionDuration };
            } else {
              transition = { type: defaultTransitionType, duration: transitionDuration };
            }

            assemblyScenes.push({
              videoBuffer,
              duration: scene.duration ?? (scene.endMs && scene.startMs ? (scene.endMs - scene.startMs) / 1000 : 5),
              transition,
            });
          }

          if (assemblyScenes.length === 0) throw new Error("No valid scenes to assemble");

          await job.updateProgress(60);

          // Assemble video (without per-scene audio - we'll overlay the single project audio)
          console.warn(`[VideoAssembly] Assembling ${assemblyScenes.length} scene(s) with single audio track`);
          const transitionDuration = stageConfig?.transitionDuration ?? 0.5;
          const defaultTransitionType = (stageConfig?.transitionType ?? "fade") as TransitionType;

          const result = await videoService.assembleProject({
            scenes: assemblyScenes.map((s) => ({ ...s, audioBuffer: Buffer.alloc(0) })),
            defaultTransition: { type: defaultTransitionType, duration: transitionDuration },
            width: assemblyWidth,
            height: assemblyHeight,
          });

          await job.updateProgress(70);

          // Overlay single project audio onto assembled video
          // Mux assembled video with single project audio using FFmpeg
          const { tmpdir } = await import("os");
          const { join: pathJoin } = await import("path");
          const { mkdtemp, writeFile: fsWrite, readFile: fsRead, rm: fsRm } = await import("fs/promises");
          const { promisify } = await import("util");
          const { execFile: execFileCb } = await import("child_process");
          const muxExec = promisify(execFileCb);
          const muxDir = await mkdtemp(pathJoin(tmpdir(), "va-mux-"));
          const muxVidFile = pathJoin(muxDir, "video.mp4");
          const muxAudFile = pathJoin(muxDir, `audio.${audio.format ?? "mp3"}`);
          const muxOutFile = pathJoin(muxDir, "output.mp4");
          await fsWrite(muxVidFile, result.videoBuffer);
          await fsWrite(muxAudFile, audioBuffer);
          await muxExec("ffmpeg", ["-i", muxVidFile, "-i", muxAudFile, "-c:v", "copy", "-c:a", "aac", "-shortest", "-y", muxOutFile]);
          let finalVideoBuffer: Buffer = await fsRead(muxOutFile);
          await fsRm(muxDir, { recursive: true, force: true }).catch(() => {});

          // Embed subtitles if configured
          if (captionConfig?.animationStyle && captionConfig.animationStyle !== "none" && subtitleSegments.length > 0) {
            const { embedSubtitles } = await import("@contenthq/video");
            console.warn(`[VideoAssembly] Embedding ${subtitleSegments.length} subtitle segments with style "${captionConfig.animationStyle}"`);
            finalVideoBuffer = await embedSubtitles(finalVideoBuffer, subtitleSegments, {
              font: captionConfig.font ?? "Arial",
              fontSize: captionConfig.fontSize ?? 24,
              fontColor: captionConfig.fontColor ?? "#FFFFFF",
              backgroundColor: captionConfig.backgroundColor ?? "#00000080",
              position: captionConfig.position ?? "bottom-center",
              animationStyle: captionConfig.animationStyle,
              highlightColor: captionConfig.highlightColor ?? "#FFD700",
              wordsPerLine: captionConfig.wordsPerLine ?? 4,
            });
          }

          await job.updateProgress(80);

          // Upload final video
          const outputKey = getOutputPath(userId, projectId, `final-video.${result.format}`);
          const uploadResult = await storage.uploadFileWithRetry(outputKey, finalVideoBuffer, getVideoContentType(result.format));
          const finalVideoUrl = uploadResult.url;

          console.warn(`[VideoAssembly] Uploaded final video: key=${outputKey}, size=${formatFileSize(finalVideoBuffer.length)}`);

          // Deduct credits
          try {
            const credits = costCalculationService.getOperationCredits("VIDEO_ASSEMBLY");
            await creditService.deductCredits(userId, credits, `Video assembly for project ${projectId}`, {
              projectId, operationType: "VIDEO_ASSEMBLY", jobId: job.id,
              costBreakdown: { billedCostCredits: String(credits), costBreakdown: { stage: "VIDEO_ASSEMBLY" } },
            });
          } catch (err) {
            console.warn(`[VideoAssembly] Credit deduction failed (non-fatal):`, err);
          }

          // Mark project as completed
          await db.update(projects).set({ status: "completed", progressPercent: 100, finalVideoUrl, updatedAt: new Date() }).where(eq(projects.id, projectId));

          await job.updateProgress(100);
          const completedAt = new Date();
          const durationMs = completedAt.getTime() - startedAt.getTime();
          console.warn(`[VideoAssembly] Audio-first assembly completed for project ${projectId}: ${assemblyScenes.length} scenes (${durationMs}ms)`);

          await db.update(generationJobs).set({
            status: "completed", progressPercent: 100,
            result: {
              sceneCount: assemblyScenes.length, finalVideoUrl,
              log: { stage: "VIDEO_ASSEMBLY", status: "completed", startedAt: startedAt.toISOString(), completedAt: completedAt.toISOString(), durationMs, details: `Audio-first: assembled ${assemblyScenes.length} scenes` },
            },
            updatedAt: new Date(),
          }).where(and(eq(generationJobs.projectId, projectId), eq(generationJobs.jobType, "VIDEO_ASSEMBLY"), eq(generationJobs.status, "processing")));

          return { success: true, sceneCount: assemblyScenes.length };
        }

        // LEGACY PATH: Per-scene assembly
        // Fetch all scenes in order
        const sceneList = await db
          .select()
          .from(scenes)
          .where(inArray(scenes.id, sceneIds))
          .orderBy(asc(scenes.index));

        console.warn(`[VideoAssembly] Fetched ${sceneList.length} scene(s) for assembly, project ${projectId}`);
        await job.updateProgress(20);

        // Download all scene videos and audio from R2
        const assemblyScenes: Array<{ videoBuffer: Buffer; audioBuffer: Buffer; duration: number; transition?: TransitionSpec }> = [];
        for (const scene of sceneList) {
          const [video] = await db
            .select()
            .from(sceneVideos)
            .where(eq(sceneVideos.sceneId, scene.id));

          const [audio] = await db
            .select()
            .from(sceneAudioMixes)
            .where(eq(sceneAudioMixes.sceneId, scene.id));

          if (!audio?.mixedAudioUrl) {
            console.warn(`[VideoAssembly] Skipping scene ${scene.id}: missing audio`);
            continue;
          }

          let videoUrl = video?.videoUrl ?? null;
          let videoBuffer: Buffer | null = null;

          // Fallback: generate video from scene image when videoUrl is missing
          // This handles the path where enableVideoGeneration is false and the
          // video generation stage was skipped.
          if (!videoUrl) {
            const [visual] = await db
              .select()
              .from(sceneVisuals)
              .where(eq(sceneVisuals.sceneId, scene.id));

            if (!visual?.imageUrl) {
              console.warn(`[VideoAssembly] Skipping scene ${scene.id}: no video or image available`);
              continue;
            }

            console.warn(`[VideoAssembly] Generating video from image for scene ${scene.id}`);
            const duration = scene.duration ?? 5;
            const videoResult = await videoService.generateSceneVideo({
              imageUrl: visual.imageUrl,
              duration,
              width: assemblyWidth,
              height: assemblyHeight,
            });

            // Upload generated video to R2
            const videoKey = getSceneVideoPath(userId, projectId, scene.id, `video.${videoResult.format}`);
            const uploadResult = await storage.uploadFileWithRetry(
              videoKey,
              videoResult.videoBuffer,
              getVideoContentType(videoResult.format),
            );
            videoUrl = uploadResult.url;
            videoBuffer = videoResult.videoBuffer;

            // Update or insert sceneVideos record with the generated videoUrl
            if (video) {
              await db
                .update(sceneVideos)
                .set({ videoUrl, storageKey: videoKey, duration, updatedAt: new Date() })
                .where(eq(sceneVideos.id, video.id));
            } else {
              await db.insert(sceneVideos).values({
                sceneId: scene.id,
                videoUrl,
                storageKey: videoKey,
                duration,
              });
            }

            console.warn(`[VideoAssembly] Generated fallback video for scene ${scene.id}: key=${videoKey}`);
          }

          console.warn(`[VideoAssembly] Downloading media for scene ${scene.id}`);

          // Download video (skip if we already have the buffer from generation)
          if (!videoBuffer) {
            const videoResponse = await fetch(videoUrl);
            if (!videoResponse.ok) {
              console.warn(`[VideoAssembly] Failed to download video for scene ${scene.id}`);
              continue;
            }
            videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          }

          const audioResponse = await fetch(audio.mixedAudioUrl);
          if (!audioResponse.ok) {
            console.warn(`[VideoAssembly] Failed to download audio for scene ${scene.id}`);
            continue;
          }

          assemblyScenes.push({
            videoBuffer,
            audioBuffer: Buffer.from(await audioResponse.arrayBuffer()),
            // PREFER audio.duration (accurate) over scene.duration (estimated)
            duration: audio.duration ?? scene.duration ?? video?.duration ?? 5,
          });
        }

        // Resolve transitions for each scene based on assignment mode
        const transitionAssignment = stageConfig?.transitionAssignment ?? "uniform";
        const transitionDuration = stageConfig?.transitionDuration ?? 0.5;
        const defaultTransitionType = (stageConfig?.transitionType ?? stageConfig?.transitions ?? "fade") as TransitionType;

        let previousTransitionType: TransitionType | undefined;
        const resolvedTransitions: TransitionSpec[] = [];

        for (let i = 0; i < assemblyScenes.length; i++) {
          let transition: TransitionSpec;

          if (i === assemblyScenes.length - 1) {
            // Last scene has no transition to next
            transition = { type: "none" };
          } else if (transitionAssignment === "uniform") {
            transition = { type: defaultTransitionType, duration: transitionDuration };
          } else if (transitionAssignment === "system_random") {
            transition = pickRandomTransition(previousTransitionType);
            transition.duration = transitionDuration;
            previousTransitionType = transition.type;
          } else if (transitionAssignment === "ai_random") {
            // Read transition from scene DB record
            const sceneRecord = sceneList[i];
            if (sceneRecord?.transitions) {
              const mappedType = mapAiTransitionName(sceneRecord.transitions);
              transition = { type: mappedType, duration: transitionDuration };
            } else {
              transition = pickRandomTransition(previousTransitionType);
              transition.duration = transitionDuration;
            }
            previousTransitionType = transition.type;
          } else {
            // "manual" mode - use default
            transition = { type: defaultTransitionType, duration: transitionDuration };
          }

          resolvedTransitions.push(transition);
          assemblyScenes[i].transition = transition;
        }

        console.warn(`[VideoAssembly] Resolved transitions: assignment=${transitionAssignment}, types=[${resolvedTransitions.map(t => t.type).join(",")}]`);

        if (assemblyScenes.length === 0) {
          throw new Error("No valid scenes to assemble");
        }

        await job.updateProgress(50);

        // Assemble final video with FFmpeg
        console.warn(`[VideoAssembly] Assembling ${assemblyScenes.length} scene(s) for project ${projectId}: resolution=${assemblyWidth}x${assemblyHeight}`);
        const result = await videoService.assembleProject({
          scenes: assemblyScenes,
          defaultTransition: { type: defaultTransitionType, duration: transitionDuration },
          width: assemblyWidth,
          height: assemblyHeight,
        });

        await job.updateProgress(70);

        // Embed subtitles if caption config is present with a non-"none" animation style
        let finalVideoBuffer = result.videoBuffer;

        if (captionConfig?.animationStyle && captionConfig.animationStyle !== "none") {
          const { embedSubtitles } = await import("@contenthq/video");

          // Query caption data from completed CAPTION_GENERATION jobs
          const captionJobs = await db
            .select()
            .from(generationJobs)
            .where(
              and(
                eq(generationJobs.projectId, projectId),
                eq(generationJobs.jobType, "CAPTION_GENERATION"),
                eq(generationJobs.status, "completed")
              )
            );

          if (captionJobs.length > 0) {
            // Aggregate caption segments with cumulative time offsets
            const subtitleSegments: Array<{
              text: string;
              startTime: number;
              endTime: number;
              wordTimings?: Array<{ word: string; start: number; end: number }>;
            }> = [];
            let cumulativeOffset = 0;

            // Build audio mix map for accurate duration lookup
            const allAudioMixes = sceneIds.length > 0
              ? await db.select().from(sceneAudioMixes).where(inArray(sceneAudioMixes.sceneId, sceneIds))
              : [];
            const audioMixMap = new Map(allAudioMixes.map((a) => [a.sceneId, a]));

            for (const scene of sceneList) {
              const captionJob = captionJobs.find((j) => {
                const r = j.result as Record<string, unknown>;
                return r?.sceneId === scene.id;
              });

              if (captionJob) {
                const captionResult = captionJob.result as Record<string, unknown>;
                const captions = (captionResult?.captions ?? []) as Array<{
                  text: string;
                  startTime: number;
                  endTime: number;
                  wordTimings?: Array<{ word: string; start: number; end: number }>;
                }>;

                for (const cap of captions) {
                  subtitleSegments.push({
                    text: cap.text,
                    startTime: cap.startTime / 1000 + cumulativeOffset,
                    endTime: cap.endTime / 1000 + cumulativeOffset,
                    wordTimings: cap.wordTimings?.map((w) => ({
                      word: w.word,
                      start: w.start / 1000 + cumulativeOffset,
                      end: w.end / 1000 + cumulativeOffset,
                    })),
                  });
                }
              }
              const sceneAudioMix = audioMixMap.get(scene.id);
              cumulativeOffset += sceneAudioMix?.duration ?? scene.audioDuration ?? scene.duration ?? 5;
            }

            if (subtitleSegments.length > 0) {
              console.warn(
                `[VideoAssembly] Embedding ${subtitleSegments.length} subtitle segments with style "${captionConfig.animationStyle}"`
              );
              finalVideoBuffer = await embedSubtitles(finalVideoBuffer, subtitleSegments, {
                font: captionConfig.font ?? "Arial",
                fontSize: captionConfig.fontSize ?? 24,
                fontColor: captionConfig.fontColor ?? "#FFFFFF",
                backgroundColor: captionConfig.backgroundColor ?? "#00000080",
                position: captionConfig.position ?? "bottom-center",
                animationStyle: captionConfig.animationStyle,
                highlightColor: captionConfig.highlightColor ?? "#FFD700",
                wordsPerLine: captionConfig.wordsPerLine ?? 4,
              });
            }
          }
        }

        await job.updateProgress(80);

        // Upload final video to R2
        const outputKey = getOutputPath(userId, projectId, `final-video.${result.format}`);
        const uploadResult = await storage.uploadFileWithRetry(outputKey, finalVideoBuffer, getVideoContentType(result.format));
        const finalVideoUrl = uploadResult.url;

        console.warn(`[VideoAssembly] Uploaded final video for project ${projectId}: key=${outputKey}, fileSize=${formatFileSize(finalVideoBuffer.length)}, format=${result.format}`);

        await job.updateProgress(90);

        // Deduct credits for video assembly with cost breakdown
        try {
          const credits = costCalculationService.getOperationCredits("VIDEO_ASSEMBLY");
          await creditService.deductCredits(userId, credits, `Video assembly for project ${projectId}`, {
            projectId,
            operationType: "VIDEO_ASSEMBLY",
            jobId: job.id,
            costBreakdown: {
              billedCostCredits: String(credits),
              costBreakdown: { stage: "VIDEO_ASSEMBLY" },
            },
          });
        } catch (err) {
          console.warn(`[VideoAssembly] Credit deduction failed (non-fatal):`, err);
        }

        // Mark project as completed
        await db
          .update(projects)
          .set({
            status: "completed",
            progressPercent: 100,
            finalVideoUrl,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(`[VideoAssembly] Completed for project ${projectId}: ${assemblyScenes.length} scenes assembled, resolution=${assemblyWidth}x${assemblyHeight}, outputSize=${formatFileSize(finalVideoBuffer.length)}, format=${result.format}, finalVideoUrl=${finalVideoUrl.substring(0, 80)} (${durationMs}ms)`);

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              sceneCount: assemblyScenes.length,
              finalVideoUrl,
              log: {
                stage: "VIDEO_ASSEMBLY",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Assembled ${assemblyScenes.length} scenes into final video`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VIDEO_ASSEMBLY"),
              eq(generationJobs.status, "processing")
            )
          );

        return { success: true, sceneCount: assemblyScenes.length };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VideoAssembly] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "VIDEO_ASSEMBLY",
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
              eq(generationJobs.jobType, "VIDEO_ASSEMBLY"),
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
      concurrency: 2,
    }
  );
}
