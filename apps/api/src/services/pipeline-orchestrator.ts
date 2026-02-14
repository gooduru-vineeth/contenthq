import { db } from "@contenthq/db/client";
import { projects, scenes, stories, projectFlowConfigs, flows, ingestedContent, generationJobs, sceneVisuals, sceneVideos, sceneAudioMixes, voiceProfiles, pipelineRuns } from "@contenthq/db/schema";
import { eq, asc, inArray, and } from "drizzle-orm";
import {
  addIngestionJob,
  addStoryWritingJob,
  addSceneGenerationJob,
  addVisualGenerationJob,
  addVideoGenerationJob,
  addTTSGenerationJob,
  addAudioMixingJob,
  addCaptionGenerationJob,
  addVideoAssemblyJob,
} from "@contenthq/queue";
import type { PipelineStage, FullStageConfigs } from "@contenthq/shared";
import { STAGE_PROGRESS_PERCENT, DEFAULT_TEMPLATE_ID } from "@contenthq/shared";
import { FlowEngine } from "./flow-engine";
import { pipelineConfigService } from "./pipeline-config.service";
import { genericPipelineOrchestrator } from "./generic-pipeline-orchestrator";

export class PipelineOrchestrator {
  private flowEngine = new FlowEngine();

  /**
   * Determine if a project should use the generic orchestrator.
   * Projects with non-default template IDs use the generic orchestrator.
   * Legacy (null template) and "builtin-ai-video" use the legacy orchestrator.
   */
  private shouldUseGenericOrchestrator(
    pipelineTemplateId: string | null | undefined
  ): boolean {
    if (!pipelineTemplateId) return false;
    return pipelineTemplateId !== DEFAULT_TEMPLATE_ID;
  }

  /**
   * Check if a project has an active generic pipeline run.
   */
  private async hasActiveGenericRun(projectId: string): Promise<boolean> {
    const [run] = await db
      .select({ id: pipelineRuns.id })
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.projectId, projectId),
          eq(pipelineRuns.status, "running")
        )
      )
      .limit(1);
    return !!run;
  }

  /**
   * Walk PIPELINE_STAGE_ORDER from the current stage and return the
   * next stage whose config.enabled !== false. Returns null if done.
   */
  private getNextEnabledStage(
    currentStage: PipelineStage,
    frozenConfig: FullStageConfigs | null
  ): PipelineStage | null {
    return pipelineConfigService.getNextEnabledStage(currentStage, frozenConfig);
  }

  /**
   * Start pipeline via the flow engine (opt-in).
   * Used when a project has a project_flow_configs record.
   */
  async startPipelineWithFlow(
    projectId: string,
    userId: string,
    inputData: Record<string, unknown> = {}
  ): Promise<{ executionId: string } | null> {
    // Check if this project has a flow config
    const [config] = await db
      .select()
      .from(projectFlowConfigs)
      .where(eq(projectFlowConfigs.projectId, projectId));

    if (!config) {
      // No flow config — caller should fall back to startPipeline()
      return null;
    }

    // Verify the flow exists and is active
    const [flow] = await db
      .select()
      .from(flows)
      .where(eq(flows.id, config.flowId));

    if (!flow || flow.status !== "active") {
      console.warn(
        `[Pipeline] Flow ${config.flowId} not found or inactive for project ${projectId}, falling back to standard pipeline`
      );
      return null;
    }

    console.warn(
      `[Pipeline] Starting flow-based pipeline for project ${projectId} using flow "${flow.name}"`
    );

    const result = await this.flowEngine.executeFlow(
      config.flowId,
      projectId,
      userId,
      inputData
    );

    return { executionId: result.executionId };
  }

  async startPipeline(projectId: string, userId: string): Promise<void> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.error(`[Pipeline] Project ${projectId} not found, cannot start pipeline`);
      throw new Error("Project not found");
    }

    // Delegate to generic orchestrator for non-default pipeline templates
    if (this.shouldUseGenericOrchestrator(project.pipelineTemplateId)) {
      console.warn(`[Pipeline] Delegating to generic orchestrator for project ${projectId} (template=${project.pipelineTemplateId})`);
      await genericPipelineOrchestrator.startPipeline(projectId, userId);
      return;
    }

    console.warn(`[Pipeline] Starting pipeline for project ${projectId}, userId=${userId}, inputType=${project.inputType ?? "url"}, sourceUrl=${project.inputContent?.substring(0, 100) ?? "none"}`);

    // Freeze the pipeline config so it stays immutable during this run
    const frozenResult = await pipelineConfigService.freezeConfig(projectId);
    if (frozenResult) {
      console.warn(`[Pipeline] Froze pipeline config for project ${projectId} (mode=${frozenResult.mode})`);
    }

    // Also create a generic pipeline run for tracking purposes
    await genericPipelineOrchestrator.startPipeline(projectId, userId).catch((err) => {
      console.warn(`[Pipeline] Generic run tracking failed (non-critical): ${err.message}`);
    });

    await db
      .update(projects)
      .set({ status: "ingesting", progressPercent: 0, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    console.warn(`[Pipeline] Project ${projectId} status set to "ingesting", queuing INGESTION job`);

    await addIngestionJob({
      projectId,
      userId,
      sourceUrl: project.inputContent ?? "",
      sourceType: project.inputType ?? "url",
    });

    console.warn(`[Pipeline] INGESTION job queued for project ${projectId}`);
  }

  async advanceAfterIngestion(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after ingestion for ${projectId}`);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.error(`[Pipeline] Project ${projectId} not found during advanceAfterIngestion, aborting`);
      return;
    }

    // Fetch actual ingested content IDs (Fix 6)
    const content = await db
      .select({ id: ingestedContent.id })
      .from(ingestedContent)
      .where(eq(ingestedContent.projectId, projectId));

    console.warn(`[Pipeline] Found ${content.length} ingested content item(s) for project ${projectId}, queuing STORY_WRITING (tone=${project.tone ?? "professional"}, targetDuration=${project.targetDuration ?? 60}s)`);

    // Create generationJob record for the next stage
    await db.insert(generationJobs).values({
      userId,
      projectId,
      jobType: "STORY_WRITING",
      status: "queued",
    });

    await addStoryWritingJob({
      projectId,
      userId,
      ingestedContentIds: content.map((c) => c.id),
      tone: project.tone ?? "professional",
      targetDuration: project.targetDuration ?? 60,
    });

    console.warn(`[Pipeline] STORY_WRITING job queued for project ${projectId}`);
  }

  async advanceAfterStoryWriting(
    projectId: string,
    userId: string,
    storyId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after story writing for ${projectId}, storyId=${storyId}`);

    await db.insert(generationJobs).values({
      userId,
      projectId,
      jobType: "SCENE_GENERATION",
      status: "queued",
    });

    await addSceneGenerationJob({ projectId, storyId, userId });
    console.warn(`[Pipeline] SCENE_GENERATION job queued for project ${projectId}, storyId=${storyId}`);
  }

  async advanceAfterSceneGeneration(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(
      `[Pipeline] Advancing after scene generation for ${projectId}`
    );

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    const scenesWithPrompts = sceneList.filter((s) => s.imagePrompt);
    const scenesWithoutPrompts = sceneList.length - scenesWithPrompts.length;
    console.warn(`[Pipeline] Found ${sceneList.length} scene(s) for project ${projectId}: ${scenesWithPrompts.length} with image prompts, ${scenesWithoutPrompts} without`);

    // Queue visual generation for all scenes in parallel
    await Promise.all(
      sceneList
        .filter((scene) => scene.imagePrompt)
        .map(async (scene) => {
          await db.insert(generationJobs).values({
            userId,
            projectId,
            jobType: "VISUAL_GENERATION",
            status: "queued",
          });

          await addVisualGenerationJob({
            projectId,
            sceneId: scene.id,
            userId,
            imagePrompt: scene.imagePrompt!,
          });

          console.warn(`[Pipeline] VISUAL_GENERATION job queued for scene ${scene.id} (index=${scene.index})`);
        })
    );

    await db
      .update(projects)
      .set({
        status: "generating_visuals",
        progressPercent: 33,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.warn(`[Pipeline] Project ${projectId} status set to "generating_visuals" (33%), ${scenesWithPrompts.length} VISUAL_GENERATION job(s) queued`);
  }

  async advanceAfterVisualsApproved(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(
      `[Pipeline] Advancing after visuals approved for ${projectId}`
    );

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.error(`[Pipeline] Project ${projectId} not found during advanceAfterVisualsApproved, aborting`);
      return;
    }

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Check all scenes have reached visual_verified or visual_failed status
    const verifiedCount = sceneList.filter((s) => s.status === "visual_verified").length;
    const failedCount = sceneList.filter((s) => s.status === "failed").length;
    const pendingCount = sceneList.length - verifiedCount - failedCount;
    const allVerified = sceneList.every(
      (s) => s.status === "visual_verified" || s.status === "failed"
    );

    console.warn(`[Pipeline] Visual verification status for project ${projectId}: ${verifiedCount} verified, ${failedCount} failed, ${pendingCount} pending out of ${sceneList.length} total`);

    if (!allVerified) {
      console.warn(`[Pipeline] Not all scenes verified for project ${projectId}, waiting (${pendingCount} still pending)`);
      return; // Not all scenes done yet, wait
    }

    const activeScenes = sceneList.filter(s => s.status !== "failed");
    console.warn(`[Pipeline] All scenes verified for project ${projectId}: ${activeScenes.length} active, ${failedCount} failed`);

    // Audio-first: queue TTS immediately after visual verification
    await this.queueTTSForScenes(projectId, userId, activeScenes, project.voiceProfileId);
  }

  async advanceAfterVideoGeneration(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(
      `[Pipeline] Advancing after video generation for ${projectId}`
    );

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Check all scenes have reached video_generated or failed status
    const generatedCount = sceneList.filter((s) => s.status === "video_generated").length;
    const failedCount = sceneList.filter((s) => s.status === "failed").length;
    const pendingCount = sceneList.length - generatedCount - failedCount;
    const allDone = sceneList.every(
      (s) => s.status === "video_generated" || s.status === "failed"
    );

    console.warn(`[Pipeline] Video generation status for project ${projectId}: ${generatedCount} generated, ${failedCount} failed, ${pendingCount} pending out of ${sceneList.length} total`);

    if (!allDone) {
      console.warn(`[Pipeline] Not all videos generated for project ${projectId}, waiting (${pendingCount} still pending)`);
      return;
    }

    // Convergence check: video generation is done. Check if captions are also done.
    await this.tryQueueAssembly(projectId, userId, "VIDEO_GENERATION");
  }

  private async queueTTSForScenes(
    projectId: string,
    userId: string,
    activeScenes: { id: string; narrationScript: string | null }[],
    voiceProfileId: string | null
  ): Promise<void> {
    // Resolve TTS provider and voice: voice profile → frozen config → system default
    let resolvedProvider = "openai";
    let resolvedVoiceId = "alloy";

    if (voiceProfileId) {
      const [profile] = await db
        .select()
        .from(voiceProfiles)
        .where(eq(voiceProfiles.id, voiceProfileId))
        .limit(1);
      if (profile) {
        resolvedProvider = profile.provider;
        resolvedVoiceId = profile.providerVoiceId;
      }
    }

    if (!voiceProfileId || resolvedProvider === "openai") {
      // Check frozen pipeline config for TTS settings as fallback
      const frozenConfig = await pipelineConfigService.getFrozenConfig(projectId);
      const ttsConfig = frozenConfig?.tts;
      if (ttsConfig?.provider) {
        resolvedProvider = ttsConfig.provider;
      }
      if (ttsConfig?.voiceId) {
        resolvedVoiceId = ttsConfig.voiceId;
      }
    }

    const scenesWithNarration = activeScenes.filter((s) => s.narrationScript);
    const scenesWithoutNarration = activeScenes.length - scenesWithNarration.length;
    console.warn(`[Pipeline] Queuing TTS for project ${projectId}: ${scenesWithNarration.length} scene(s) with narration, ${scenesWithoutNarration} without, voiceId=${resolvedVoiceId}, provider=${resolvedProvider}`);

    await Promise.all(
      activeScenes
        .filter((scene) => scene.narrationScript)
        .map(async (scene) => {
          await db.insert(generationJobs).values({
            userId,
            projectId,
            jobType: "TTS_GENERATION",
            status: "queued",
          });

          await addTTSGenerationJob({
            projectId,
            sceneId: scene.id,
            userId,
            narrationScript: scene.narrationScript!,
            voiceId: resolvedVoiceId,
            provider: resolvedProvider,
          });

          console.warn(`[Pipeline] TTS_GENERATION job queued for scene ${scene.id} (scriptLength=${scene.narrationScript!.length} chars)`);
        })
    );

    await db
      .update(projects)
      .set({
        status: "generating_tts",
        progressPercent: 66,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.warn(`[Pipeline] Project ${projectId} status set to "generating_tts" (66%)`);
  }

  async advanceAfterTTS(projectId: string, userId: string): Promise<void> {
    console.warn(`[Pipeline] Advancing after TTS for ${projectId}`);

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Check all scenes have reached video_generated status (TTS complete)
    const doneCount = sceneList.filter((s) => s.status === "video_generated").length;
    const failedCount = sceneList.filter((s) => s.status === "failed").length;
    const pendingCount = sceneList.length - doneCount - failedCount;
    const allTTSDone = sceneList.every(
      (s) => s.status === "video_generated" || s.status === "failed"
    );

    console.warn(`[Pipeline] TTS status for project ${projectId}: ${doneCount} done, ${failedCount} failed, ${pendingCount} pending out of ${sceneList.length} total`);

    if (!allTTSDone) {
      console.warn(`[Pipeline] Not all TTS jobs done for project ${projectId}, waiting (${pendingCount} still pending)`);
      return; // Not all scenes done yet, wait
    }

    // Queue audio mixing for non-failed scenes only
    const activeScenesForMixing = sceneList.filter(s => s.status !== "failed");
    console.warn(`[Pipeline] All TTS done for project ${projectId}: ${activeScenesForMixing.length} active, ${failedCount} failed. Queuing AUDIO_MIXING.`);

    // Read frozen config for audio mixing settings
    const frozenConfig = await pipelineConfigService.getFrozenConfig(projectId);
    const audioMixingConfig = frozenConfig?.audioMixing;
    const musicTrackId = audioMixingConfig?.musicTrackId ?? null;

    // Batch fetch all sceneVideos upfront
    const activeSceneIds = activeScenesForMixing.map((s) => s.id);
    const allSceneVideos = activeSceneIds.length > 0
      ? await db.select().from(sceneVideos).where(inArray(sceneVideos.sceneId, activeSceneIds))
      : [];
    const sceneVideosBySceneId = new Map(allSceneVideos.map((sv) => [sv.sceneId, sv]));

    await Promise.all(
      activeScenesForMixing.map(async (scene) => {
        const sceneVideo = sceneVideosBySceneId.get(scene.id);

        await db.insert(generationJobs).values({
          userId,
          projectId,
          jobType: "AUDIO_MIXING",
          status: "queued",
        });

        await addAudioMixingJob({
          projectId,
          sceneId: scene.id,
          userId,
          voiceoverUrl: sceneVideo?.voiceoverUrl ?? "",
          musicTrackId,
          ...(audioMixingConfig && {
            stageConfig: {
              musicVolume: audioMixingConfig.musicVolume,
              voiceoverVolume: audioMixingConfig.voiceoverVolume,
              fadeInMs: audioMixingConfig.fadeInMs,
              fadeOutMs: audioMixingConfig.fadeOutMs,
              musicLoop: audioMixingConfig.musicLoop,
              musicDuckingEnabled: audioMixingConfig.musicDuckingEnabled,
            },
          }),
        });

        console.warn(`[Pipeline] AUDIO_MIXING job queued for scene ${scene.id} (index=${scene.index}), voiceoverUrl=${sceneVideo?.voiceoverUrl ? "present" : "missing"}, musicTrackId=${musicTrackId ?? "none"}`);
      })
    );

    await db
      .update(projects)
      .set({
        status: "mixing_audio",
        progressPercent: STAGE_PROGRESS_PERCENT["AUDIO_MIXING"] ?? 77,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.warn(`[Pipeline] Project ${projectId} status set to "mixing_audio"`);
  }

  async advanceAfterAudioMixing(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after audio mixing for ${projectId}`);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.error(`[Pipeline] Project ${projectId} not found during advanceAfterAudioMixing, aborting`);
      return;
    }

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Check all scenes have reached audio_mixed status
    const mixedCount = sceneList.filter((s) => s.status === "audio_mixed").length;
    const failedCount = sceneList.filter((s) => s.status === "failed").length;
    const pendingCount = sceneList.length - mixedCount - failedCount;
    const allMixed = sceneList.every(
      (s) => s.status === "audio_mixed" || s.status === "failed"
    );

    console.warn(`[Pipeline] Audio mixing status for project ${projectId}: ${mixedCount} mixed, ${failedCount} failed, ${pendingCount} pending out of ${sceneList.length} total`);

    if (!allMixed) {
      console.warn(`[Pipeline] Not all audio mixed for project ${projectId}, waiting (${pendingCount} still pending)`);
      return;
    }

    const activeScenes = sceneList.filter(s => s.status !== "failed");
    console.warn(`[Pipeline] All audio mixed for project ${projectId}: ${activeScenes.length} active, ${failedCount} failed.`);

    // Read frozen config
    const frozenConfig = await pipelineConfigService.getFrozenConfig(projectId);
    const videoEnabled = frozenConfig?.videoGeneration?.enabled ?? project.enableVideoGeneration;
    const captionConfig = frozenConfig?.captionGeneration;
    const captionsEnabled = captionConfig?.enabled && captionConfig.animationStyle !== "none";

    // Audio-first pipeline: after audio mixing, dispatch VIDEO_GENERATION and CAPTION_GENERATION in parallel

    // 1. Queue VIDEO_GENERATION (if enabled)
    if (videoEnabled) {
      console.warn(`[Pipeline] Queuing VIDEO_GENERATION for ${activeScenes.length} scene(s) (audio-first: audio duration drives video length)`);
      const videoStageConfig = frozenConfig?.videoGeneration;

      // Batch fetch all scene visuals and media overrides upfront
      const activeSceneIds = activeScenes.map((s) => s.id);
      const [allVisuals, allOverrides] = await Promise.all([
        activeSceneIds.length > 0
          ? db.select().from(sceneVisuals).where(inArray(sceneVisuals.sceneId, activeSceneIds))
          : Promise.resolve([]),
        pipelineConfigService.getMediaOverrides(projectId, "VIDEO_GENERATION"),
      ]);

      const visualsBySceneId = new Map(allVisuals.map((v) => [v.sceneId, v]));
      const overridesBySceneIndex = new Map<number, string | undefined>();
      for (const override of allOverrides) {
        if (override.sceneIndex !== null && !overridesBySceneIndex.has(override.sceneIndex)) {
          overridesBySceneIndex.set(override.sceneIndex, override.url ?? undefined);
        }
      }

      await Promise.all(
        activeScenes.map(async (scene) => {
          const mediaOverrideUrl = overridesBySceneIndex.get(scene.index);
          const visual = visualsBySceneId.get(scene.id);
          const imageUrl = visual?.imageUrl ?? "";

          await db.insert(generationJobs).values({
            userId,
            projectId,
            jobType: "VIDEO_GENERATION",
            status: "queued",
          });

          await addVideoGenerationJob({
            projectId,
            sceneId: scene.id,
            userId,
            imageUrl,
            motionSpec: (scene.motionSpec as Record<string, unknown>) ?? {},
            scenePrompt: scene.imagePrompt || scene.visualDescription || scene.narrationScript || "",
            ...(videoStageConfig && {
              stageConfig: {
                provider: videoStageConfig.provider,
                model: videoStageConfig.model,
                motionType: videoStageConfig.motionType,
                durationPerScene: videoStageConfig.durationPerScene,
                motionAssignment: videoStageConfig.motionAssignment,
                motionSpeed: videoStageConfig.motionSpeed,
              },
            }),
            ...(mediaOverrideUrl && { mediaOverrideUrl }),
          });

          console.warn(`[Pipeline] VIDEO_GENERATION job queued for scene ${scene.id} (index=${scene.index})`);
        })
      );
    }

    // 2. Queue CAPTION_GENERATION (if enabled) with audioDurationMs
    if (captionsEnabled) {
      console.warn(`[Pipeline] Queuing CAPTION_GENERATION for ${activeScenes.length} scene(s) with audio duration`);

      // Fetch audio mixes to get actual audio duration for captions
      const activeSceneIds = activeScenes.map((s) => s.id);
      const allAudioMixes = activeSceneIds.length > 0
        ? await db.select().from(sceneAudioMixes).where(inArray(sceneAudioMixes.sceneId, activeSceneIds))
        : [];
      const audioMixBySceneId = new Map(allAudioMixes.map((a) => [a.sceneId, a]));

      for (const scene of activeScenes) {
        const audioMix = audioMixBySceneId.get(scene.id);
        const audioDurationSec = audioMix?.duration ?? scene.audioDuration;
        const audioDurationMs = audioDurationSec ? Math.round(audioDurationSec * 1000) : undefined;

        await db.insert(generationJobs).values({
          userId,
          projectId,
          jobType: "CAPTION_GENERATION",
          status: "queued",
        });

        await addCaptionGenerationJob({
          projectId,
          sceneId: scene.id,
          userId,
          narrationScript: scene.narrationScript ?? "",
          audioUrl: audioMix?.mixedAudioUrl ?? "",
          audioDurationMs,
          stageConfig: {
            font: captionConfig!.font,
            fontSize: captionConfig!.fontSize,
            fontColor: captionConfig!.fontColor,
            backgroundColor: captionConfig!.backgroundColor,
            position: captionConfig!.position,
            highlightMode: captionConfig!.highlightMode,
            highlightColor: captionConfig!.highlightColor,
            wordsPerLine: captionConfig!.wordsPerLine,
            useWordLevelTiming: captionConfig!.useWordLevelTiming,
            animationStyle: captionConfig!.animationStyle,
          },
        });
      }

      console.warn(`[Pipeline] Dispatched ${activeScenes.length} caption jobs for project ${projectId}`);
    }

    // Update project status
    if (videoEnabled) {
      await db.update(projects).set({
        status: "generating_video",
        progressPercent: STAGE_PROGRESS_PERCENT["VIDEO_GENERATION"] ?? 70,
        updatedAt: new Date(),
      }).where(eq(projects.id, projectId));
    } else if (captionsEnabled) {
      await db.update(projects).set({
        status: "generating_captions",
        progressPercent: STAGE_PROGRESS_PERCENT["CAPTION_GENERATION"] ?? 80,
        updatedAt: new Date(),
      }).where(eq(projects.id, projectId));
    }

    // If neither video nor captions are enabled, go straight to assembly
    if (!videoEnabled && !captionsEnabled) {
      console.warn(`[Pipeline] Both video gen and captions disabled for project ${projectId}, proceeding to assembly`);
      await this.queueAssembly(projectId, userId, activeScenes);
    }

    console.warn(`[Pipeline] Post-audio-mixing dispatch complete for project ${projectId}: videoEnabled=${videoEnabled}, captionsEnabled=${captionsEnabled}`);
  }

  async advanceAfterCaptionGeneration(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after caption generation for ${projectId}`);

    // Convergence check: captions are done. Check if video gen is also done.
    await this.tryQueueAssembly(projectId, userId, "CAPTION_GENERATION");
  }

  /**
   * Convergence check: VIDEO_GENERATION and CAPTION_GENERATION run in parallel.
   * Assembly only starts when BOTH are complete (or when the disabled one is skipped).
   */
  private async tryQueueAssembly(
    projectId: string,
    userId: string,
    completedStage: "VIDEO_GENERATION" | "CAPTION_GENERATION"
  ): Promise<void> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return;

    const frozenConfig = await pipelineConfigService.getFrozenConfig(projectId);
    const videoEnabled = frozenConfig?.videoGeneration?.enabled ?? project.enableVideoGeneration;
    const captionConfig = frozenConfig?.captionGeneration;
    const captionsEnabled = captionConfig?.enabled && captionConfig.animationStyle !== "none";

    // Check video generation completion
    let videoComplete = !videoEnabled; // If disabled, treat as complete
    if (videoEnabled) {
      const videoJobs = await db.select({ id: generationJobs.id, status: generationJobs.status })
        .from(generationJobs)
        .where(and(
          eq(generationJobs.projectId, projectId),
          eq(generationJobs.jobType, "VIDEO_GENERATION"),
        ));
      videoComplete = videoJobs.length > 0 && videoJobs.every((j) => j.status === "completed" || j.status === "failed");
    }

    // Check caption generation completion
    let captionsComplete = !captionsEnabled; // If disabled, treat as complete
    if (captionsEnabled) {
      const captionJobs = await db.select({ id: generationJobs.id, status: generationJobs.status })
        .from(generationJobs)
        .where(and(
          eq(generationJobs.projectId, projectId),
          eq(generationJobs.jobType, "CAPTION_GENERATION"),
        ));
      captionsComplete = captionJobs.length > 0 && captionJobs.every((j) => j.status === "completed" || j.status === "failed");
    }

    console.warn(`[Pipeline] Convergence check for project ${projectId} (triggered by ${completedStage}): videoComplete=${videoComplete}, captionsComplete=${captionsComplete}`);

    if (!videoComplete || !captionsComplete) {
      console.warn(`[Pipeline] Not ready for assembly yet, waiting for ${!videoComplete ? "video generation" : "caption generation"}`);
      return;
    }

    // Both are done — queue assembly
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    const activeScenes = sceneList.filter(s => s.status !== "failed");
    console.warn(`[Pipeline] Both video gen and captions complete for project ${projectId}. Queuing assembly with ${activeScenes.length} scene(s).`);

    await this.queueAssembly(projectId, userId, activeScenes);
  }

  /**
   * Queue the final VIDEO_ASSEMBLY job.
   */
  private async queueAssembly(
    projectId: string,
    userId: string,
    activeScenes: { id: string }[]
  ): Promise<void> {
    const frozenConfig = await pipelineConfigService.getFrozenConfig(projectId);
    const captionConfig = frozenConfig?.captionGeneration;
    const assemblyConfig = frozenConfig?.assembly;

    await db.insert(generationJobs).values({
      userId,
      projectId,
      jobType: "VIDEO_ASSEMBLY",
      status: "queued",
    });

    await addVideoAssemblyJob({
      projectId,
      userId,
      sceneIds: activeScenes.map((s) => s.id),
      ...(assemblyConfig && {
        stageConfig: {
          transitions: assemblyConfig.transitions,
          transitionType: assemblyConfig.transitionType,
          transitionAssignment: assemblyConfig.transitionAssignment,
          transitionDuration: assemblyConfig.transitionDuration,
          outputFormat: assemblyConfig.outputFormat,
          resolution: assemblyConfig.resolution,
          fps: assemblyConfig.fps,
          watermarkEnabled: assemblyConfig.watermarkEnabled,
          watermarkText: assemblyConfig.watermarkText,
          brandingIntroUrl: assemblyConfig.brandingIntroUrl,
          brandingOutroUrl: assemblyConfig.brandingOutroUrl,
        },
      }),
      ...(captionConfig?.enabled && {
        captionConfig: {
          font: captionConfig.font,
          fontSize: captionConfig.fontSize,
          fontColor: captionConfig.fontColor,
          backgroundColor: captionConfig.backgroundColor,
          position: captionConfig.position,
          highlightMode: captionConfig.highlightMode,
          highlightColor: captionConfig.highlightColor,
          wordsPerLine: captionConfig.wordsPerLine,
          useWordLevelTiming: captionConfig.useWordLevelTiming,
          animationStyle: captionConfig.animationStyle,
        },
      }),
    });

    await db
      .update(projects)
      .set({
        status: "assembling",
        progressPercent: 90,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.warn(`[Pipeline] VIDEO_ASSEMBLY job queued for project ${projectId} with ${activeScenes.length} scene(s)`);
  }

  async checkAndAdvancePipeline(
    projectId: string,
    userId: string,
    completedStage: string
  ): Promise<void> {
    console.warn(`[Pipeline] checkAndAdvancePipeline called: stage=${completedStage}, projectId=${projectId}, userId=${userId}`);

    // Guard: stop advancing if the project was deleted or cancelled
    const [project] = await db
      .select({ id: projects.id, status: projects.status, pipelineTemplateId: projects.pipelineTemplateId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.warn(`[Pipeline] Project ${projectId} no longer exists, skipping pipeline advancement`);
      return;
    }

    if (project.status === "cancelled") {
      console.warn(`[Pipeline] Project ${projectId} is cancelled, skipping pipeline advancement`);
      return;
    }

    // Delegate to generic orchestrator for non-default pipeline templates
    if (this.shouldUseGenericOrchestrator(project.pipelineTemplateId)) {
      console.warn(`[Pipeline] Delegating checkAndAdvance to generic orchestrator for project ${projectId}`);
      // Map legacy stage names to DAG stage IDs
      const stageIdMap: Record<string, string> = {
        INGESTION: "ingestion",
        STORY_WRITING: "story-writing",
        SCENE_GENERATION: "scene-generation",
        VISUAL_GENERATION: "visual-generation",
        VISUAL_VERIFICATION: "visual-verification",
        VIDEO_GENERATION: "video-generation",
        TTS_GENERATION: "tts-generation",
        AUDIO_MIXING: "audio-mixing",
        CAPTION_GENERATION: "caption-generation",
        VIDEO_ASSEMBLY: "video-assembly",
        // New pipeline-specific stages pass through as-is
        PPT_INGESTION: "ppt-ingestion",
        PPT_GENERATION: "ppt-generation",
        SLIDE_RENDERING: "slide-rendering",
        AUDIO_SCRIPT_GEN: "audio-script-gen",
        REMOTION_COMPOSITION: "remotion-composition",
        REMOTION_RENDER: "remotion-render",
        MOTION_CANVAS_SCENE: "motion-canvas-scene",
        MOTION_CANVAS_RENDER: "motion-canvas-render",
      };
      const stageId = stageIdMap[completedStage] ?? completedStage;
      await genericPipelineOrchestrator.checkAndAdvancePipeline(
        projectId,
        userId,
        stageId
      );
      return;
    }

    // Also update generic pipeline run tracking (non-critical)
    const stageIdMapForTracking: Record<string, string> = {
      INGESTION: "ingestion",
      STORY_WRITING: "story-writing",
      SCENE_GENERATION: "scene-generation",
      VISUAL_GENERATION: "visual-generation",
      VISUAL_VERIFICATION: "visual-verification",
      VIDEO_GENERATION: "video-generation",
      TTS_GENERATION: "tts-generation",
      AUDIO_MIXING: "audio-mixing",
      CAPTION_GENERATION: "caption-generation",
      VIDEO_ASSEMBLY: "video-assembly",
    };
    const trackingStageId = stageIdMapForTracking[completedStage];
    if (trackingStageId) {
      genericPipelineOrchestrator
        .checkAndAdvancePipeline(projectId, userId, trackingStageId)
        .catch((err) => {
          console.warn(`[Pipeline] Generic tracking update failed (non-critical): ${err.message}`);
        });
    }

    switch (completedStage) {
      case "INGESTION":
        await this.advanceAfterIngestion(projectId, userId);
        break;
      case "STORY_WRITING":
        {
          const [story] = await db
            .select()
            .from(stories)
            .where(eq(stories.projectId, projectId));
          if (story) {
            await this.advanceAfterStoryWriting(projectId, userId, story.id);
          } else {
            console.error(`[Pipeline] No story found for project ${projectId} after STORY_WRITING stage completed`);
          }
        }
        break;
      case "SCENE_GENERATION":
        await this.advanceAfterSceneGeneration(projectId, userId);
        break;
      case "VISUAL_GENERATION":
        // Visual generation chains directly to verification inline (no-op here)
        console.warn(`[Pipeline] VISUAL_GENERATION completed for project ${projectId}, verification is handled inline by the worker`);
        break;
      case "VISUAL_VERIFICATION":
        await this.advanceAfterVisualsApproved(projectId, userId);
        break;
      case "VIDEO_GENERATION":
        await this.advanceAfterVideoGeneration(projectId, userId);
        break;
      case "TTS_GENERATION":
        await this.advanceAfterTTS(projectId, userId);
        break;
      case "AUDIO_MIXING":
        await this.advanceAfterAudioMixing(projectId, userId);
        break;
      case "CAPTION_GENERATION":
        await this.advanceAfterCaptionGeneration(projectId, userId);
        break;
      default:
        console.error(
          `[Pipeline] Unknown stage: ${completedStage} for ${projectId}`
        );
    }
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
