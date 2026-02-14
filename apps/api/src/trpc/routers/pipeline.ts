import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  projects,
  generationJobs,
  pipelineConfigs,
  stories,
  scenes,
  sceneVisuals,
  sceneVideos,
  ingestedContent,
  voiceProfiles,
} from "@contenthq/db/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import {
  addIngestionJob,
  addStoryWritingJob,
  addSceneGenerationJob,
  addVisualGenerationJob,
  addVisualVerificationJob,
  addVideoGenerationJob,
  addTTSGenerationJob,
  addAudioMixingJob,
  addVideoAssemblyJob,
  addCaptionGenerationJob,
} from "@contenthq/queue";
import { startPipelineSchema, retryStageSchema } from "@contenthq/shared";

export const pipelineRouter = router({
  start: protectedProcedure
    .input(startPipelineSchema)
    .mutation(async ({ ctx, input }) => {
      console.warn(`[PipelineRouter] start called: projectId=${input.projectId}, userId=${ctx.user.id}`);
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );

      if (!project) {
        console.error(`[PipelineRouter] Project ${input.projectId} not found for userId=${ctx.user.id}`);
        throw new Error("Project not found");
      }

      // Freeze pipeline config for this run
      const [config] = await db
        .select()
        .from(pipelineConfigs)
        .where(eq(pipelineConfigs.projectId, input.projectId));
      if (config) {
        await db
          .update(pipelineConfigs)
          .set({
            frozenConfig: config.stageConfigs,
            frozenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pipelineConfigs.id, config.id));
      }

      await db
        .update(projects)
        .set({
          status: "ingesting",
          progressPercent: 0,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));

      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          jobType: "INGESTION",
          status: "queued",
        })
        .returning();

      await addIngestionJob({
        projectId: input.projectId,
        userId: ctx.user.id,
        sourceUrl: project.inputContent || "",
        sourceType: project.inputType || "url",
      });

      console.warn(`[PipelineRouter] Pipeline started for project ${input.projectId}, jobId=${job.id}, inputType=${project.inputType ?? "url"}`);
      return { jobId: job.id };
    }),

  getStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );

      if (!project) throw new Error("Project not found");

      const jobs = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.projectId, input.projectId))
        .orderBy(desc(generationJobs.createdAt));

      return {
        status: project.status,
        progressPercent: project.progressPercent,
        jobs,
      };
    }),

  retryStage: protectedProcedure
    .input(retryStageSchema)
    .mutation(async ({ ctx, input }) => {
      console.warn(`[PipelineRouter] retryStage called: projectId=${input.projectId}, stage=${input.stage}, userId=${ctx.user.id}`);
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) {
        console.error(`[PipelineRouter] Project ${input.projectId} not found for retry, userId=${ctx.user.id}`);
        throw new Error("Project not found");
      }

      // Insert generation job record
      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          jobType: input.stage,
          status: "queued",
        })
        .returning();

      // Load pipeline config for stage-specific settings
      const [config] = await db
        .select()
        .from(pipelineConfigs)
        .where(eq(pipelineConfigs.projectId, input.projectId));
      const stageConfigs = (config?.frozenConfig ?? config?.stageConfigs ?? {}) as Record<string, unknown>;

      // Status mapping: stage → project processing status
      const stageStatusMap = {
        INGESTION: "ingesting",
        STORY_WRITING: "writing",
        SCENE_GENERATION: "generating_scenes",
        VISUAL_GENERATION: "generating_visuals",
        VISUAL_VERIFICATION: "verifying",
        VIDEO_GENERATION: "generating_video",
        TTS_GENERATION: "generating_tts",
        AUDIO_MIXING: "mixing_audio",
        CAPTION_GENERATION: "generating_captions",
        VIDEO_ASSEMBLY: "assembling",
      } as const;

      // Update project status
      const newStatus = stageStatusMap[input.stage];
      if (newStatus) {
        await db
          .update(projects)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(projects.id, input.projectId));
      }

      // Queue the appropriate BullMQ job based on stage
      switch (input.stage) {
        case "INGESTION": {
          await addIngestionJob({
            projectId: input.projectId,
            userId: ctx.user.id,
            sourceUrl: project.inputContent || "",
            sourceType: project.inputType || "url",
          });
          break;
        }

        case "STORY_WRITING": {
          const ingested = await db
            .select()
            .from(ingestedContent)
            .where(eq(ingestedContent.projectId, input.projectId));
          const sw = stageConfigs.storyWriting as Record<string, unknown> | undefined;
          await addStoryWritingJob({
            projectId: input.projectId,
            userId: ctx.user.id,
            ingestedContentIds: ingested.map((i) => i.id),
            tone: project.tone || "professional",
            targetDuration: project.targetDuration || 60,
            stageConfig: sw ? {
              provider: sw.provider as string | undefined,
              model: sw.model as string | undefined,
              narrativeStructure: sw.narrativeStructure as string | undefined,
              temperature: sw.temperature as number | undefined,
              agentId: sw.agentId as string | undefined,
              customInstructions: sw.customInstructions as string | undefined,
            } : undefined,
          });
          break;
        }

        case "SCENE_GENERATION": {
          const [story] = await db
            .select()
            .from(stories)
            .where(eq(stories.projectId, input.projectId));
          if (!story) throw new Error("No story found for this project");
          const sg = stageConfigs.sceneGeneration as Record<string, unknown> | undefined;
          await addSceneGenerationJob({
            projectId: input.projectId,
            storyId: story.id,
            userId: ctx.user.id,
            stageConfig: sg ? {
              provider: sg.provider as string | undefined,
              model: sg.model as string | undefined,
              visualStyle: sg.visualStyle as string | undefined,
              imagePromptStyle: sg.imagePromptStyle as string | undefined,
              agentId: sg.agentId as string | undefined,
            } : undefined,
          });
          break;
        }

        case "VISUAL_GENERATION": {
          const scenesForVis = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const vg = stageConfigs.visualGeneration as Record<string, unknown> | undefined;
          for (const scene of scenesForVis) {
            await addVisualGenerationJob({
              projectId: input.projectId,
              sceneId: scene.id,
              userId: ctx.user.id,
              imagePrompt: scene.imagePrompt || scene.visualDescription || "",
              stageConfig: vg ? {
                provider: vg.provider as string | undefined,
                model: vg.model as string | undefined,
                imageSize: vg.imageSize as string | undefined,
                quality: vg.quality as string | undefined,
                stylePreset: vg.stylePreset as string | undefined,
              } : undefined,
            });
          }
          break;
        }

        case "VISUAL_VERIFICATION": {
          const scenesForVerify = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const sceneIdsForVerify = scenesForVerify.map((s) => s.id);
          const visuals = sceneIdsForVerify.length > 0
            ? await db
                .select()
                .from(sceneVisuals)
                .where(inArray(sceneVisuals.sceneId, sceneIdsForVerify))
            : [];
          for (const scene of scenesForVerify) {
            const visual = visuals.find((v) => v.sceneId === scene.id);
            if (visual?.imageUrl) {
              await addVisualVerificationJob({
                projectId: input.projectId,
                sceneId: scene.id,
                userId: ctx.user.id,
                imageUrl: visual.imageUrl,
                visualDescription: scene.visualDescription || "",
              });
            }
          }
          break;
        }

        case "VIDEO_GENERATION": {
          const scenesForVideo = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const sceneIdsForVideo = scenesForVideo.map((s) => s.id);
          const visualsForVideo = sceneIdsForVideo.length > 0
            ? await db
                .select()
                .from(sceneVisuals)
                .where(inArray(sceneVisuals.sceneId, sceneIdsForVideo))
            : [];
          const vidGen = stageConfigs.videoGeneration as Record<string, unknown> | undefined;
          for (const scene of scenesForVideo) {
            const visual = visualsForVideo.find((v) => v.sceneId === scene.id);
            if (visual?.imageUrl) {
              await addVideoGenerationJob({
                projectId: input.projectId,
                sceneId: scene.id,
                userId: ctx.user.id,
                imageUrl: visual.imageUrl,
                motionSpec: (scene.motionSpec as Record<string, unknown>) || {},
                scenePrompt: scene.visualDescription || undefined,
                stageConfig: vidGen ? {
                  provider: vidGen.provider as string | undefined,
                  model: vidGen.model as string | undefined,
                  motionType: vidGen.motionType as string | undefined,
                  durationPerScene: vidGen.durationPerScene as number | undefined,
                } : undefined,
              });
            }
          }
          break;
        }

        case "TTS_GENERATION": {
          const scenesForTts = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const ttsConfig = stageConfigs.tts as Record<string, unknown> | undefined;

          // Resolve TTS provider: voice profile → pipeline config → default
          let ttsProvider = (ttsConfig?.provider as string) || "openai";
          let ttsVoiceId = (ttsConfig?.voiceId as string) || "alloy";
          if (project.voiceProfileId) {
            const [vp] = await db
              .select()
              .from(voiceProfiles)
              .where(eq(voiceProfiles.id, project.voiceProfileId))
              .limit(1);
            if (vp) {
              ttsProvider = vp.provider;
              ttsVoiceId = vp.providerVoiceId;
            }
          }

          for (const scene of scenesForTts) {
            if (scene.narrationScript) {
              await addTTSGenerationJob({
                projectId: input.projectId,
                sceneId: scene.id,
                userId: ctx.user.id,
                narrationScript: scene.narrationScript,
                voiceId: ttsVoiceId,
                provider: ttsProvider,
                stageConfig: ttsConfig ? {
                  model: ttsConfig.model as string | undefined,
                  quality: ttsConfig.quality as string | undefined,
                  speed: ttsConfig.speed as number | undefined,
                  pitch: ttsConfig.pitch as number | undefined,
                  format: ttsConfig.format as string | undefined,
                } : undefined,
              });
            }
          }
          break;
        }

        case "AUDIO_MIXING": {
          const scenesForMix = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const sceneIdsForMix = scenesForMix.map((s) => s.id);
          const videosForMix = sceneIdsForMix.length > 0
            ? await db
                .select()
                .from(sceneVideos)
                .where(inArray(sceneVideos.sceneId, sceneIdsForMix))
            : [];
          const mixConfig = stageConfigs.audioMixing as Record<string, unknown> | undefined;
          for (const scene of scenesForMix) {
            const video = videosForMix.find((v) => v.sceneId === scene.id);
            if (video?.voiceoverUrl) {
              await addAudioMixingJob({
                projectId: input.projectId,
                sceneId: scene.id,
                userId: ctx.user.id,
                voiceoverUrl: video.voiceoverUrl,
                musicTrackId: (mixConfig?.musicTrackId as string) || project.musicTrackId || null,
                stageConfig: mixConfig ? {
                  musicVolume: mixConfig.musicVolume as number | undefined,
                  voiceoverVolume: mixConfig.voiceoverVolume as number | undefined,
                  fadeInMs: mixConfig.fadeInMs as number | undefined,
                  fadeOutMs: mixConfig.fadeOutMs as number | undefined,
                  musicLoop: mixConfig.musicLoop as boolean | undefined,
                  musicDuckingEnabled: mixConfig.musicDuckingEnabled as boolean | undefined,
                } : undefined,
              });
            }
          }
          break;
        }

        case "CAPTION_GENERATION": {
          const scenesForCaptions = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const sceneIdsForCaptions = scenesForCaptions.map((s) => s.id);
          const videosForCaptions = sceneIdsForCaptions.length > 0
            ? await db
                .select()
                .from(sceneVideos)
                .where(inArray(sceneVideos.sceneId, sceneIdsForCaptions))
            : [];
          const capConfig = stageConfigs.captionGeneration as Record<string, unknown> | undefined;
          for (const scene of scenesForCaptions) {
            const video = videosForCaptions.find((v) => v.sceneId === scene.id);
            if (scene.narrationScript && video?.voiceoverUrl) {
              await addCaptionGenerationJob({
                projectId: input.projectId,
                sceneId: scene.id,
                userId: ctx.user.id,
                narrationScript: scene.narrationScript,
                audioUrl: video.voiceoverUrl,
                stageConfig: capConfig ? {
                  font: capConfig.font as string | undefined,
                  fontSize: capConfig.fontSize as number | undefined,
                  fontColor: capConfig.fontColor as string | undefined,
                  backgroundColor: capConfig.backgroundColor as string | undefined,
                  position: capConfig.position as string | undefined,
                  highlightMode: capConfig.highlightMode as string | undefined,
                  highlightColor: capConfig.highlightColor as string | undefined,
                  wordsPerLine: capConfig.wordsPerLine as number | undefined,
                  useWordLevelTiming: capConfig.useWordLevelTiming as boolean | undefined,
                } : undefined,
              });
            }
          }
          break;
        }

        case "VIDEO_ASSEMBLY": {
          const scenesForAssembly = await db
            .select()
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(asc(scenes.index));
          const asmConfig = stageConfigs.assembly as Record<string, unknown> | undefined;
          await addVideoAssemblyJob({
            projectId: input.projectId,
            userId: ctx.user.id,
            sceneIds: scenesForAssembly.map((s) => s.id),
            stageConfig: asmConfig ? {
              transitions: asmConfig.transitions as string | undefined,
              outputFormat: asmConfig.outputFormat as string | undefined,
              resolution: asmConfig.resolution as string | undefined,
              fps: asmConfig.fps as number | undefined,
              watermarkEnabled: asmConfig.watermarkEnabled as boolean | undefined,
              watermarkText: asmConfig.watermarkText as string | undefined,
              brandingIntroUrl: asmConfig.brandingIntroUrl as string | undefined,
              brandingOutroUrl: asmConfig.brandingOutroUrl as string | undefined,
            } : undefined,
          });
          break;
        }
      }

      console.warn(`[PipelineRouter] Retry queued for project ${input.projectId}, stage=${input.stage}, jobId=${job.id}`);
      return { jobId: job.id };
    }),

  cancel: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.warn(`[PipelineRouter] cancel called: projectId=${input.projectId}, userId=${ctx.user.id}`);
      await db
        .update(projects)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );

      // Remove queued/delayed BullMQ jobs so workers don't pick them up
      const { removeJobsByProjectId } = await import("@contenthq/queue");
      await removeJobsByProjectId(input.projectId);

      console.warn(`[PipelineRouter] Pipeline cancelled for project ${input.projectId}`);
      return { success: true };
    }),
});
