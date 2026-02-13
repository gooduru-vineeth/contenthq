import { db } from "@contenthq/db/client";
import { projects, scenes, stories, projectFlowConfigs, flows, ingestedContent, generationJobs, sceneVisuals, sceneVideos } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  addIngestionJob,
  addStoryWritingJob,
  addSceneGenerationJob,
  addVisualGenerationJob,
  addVideoGenerationJob,
  addTTSGenerationJob,
  addAudioMixingJob,
  addVideoAssemblyJob,
} from "@contenthq/queue";
import type { PipelineStage, FullStageConfigs } from "@contenthq/shared";
import { STAGE_PROGRESS_PERCENT } from "@contenthq/shared";
import { FlowEngine } from "./flow-engine";
import { pipelineConfigService } from "./pipeline-config.service";

export class PipelineOrchestrator {
  private flowEngine = new FlowEngine();

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

    console.warn(`[Pipeline] Starting pipeline for project ${projectId}, userId=${userId}, inputType=${project.inputType ?? "url"}, sourceUrl=${project.inputContent?.substring(0, 100) ?? "none"}`);

    // Freeze the pipeline config so it stays immutable during this run
    const frozenResult = await pipelineConfigService.freezeConfig(projectId);
    if (frozenResult) {
      console.warn(`[Pipeline] Froze pipeline config for project ${projectId} (mode=${frozenResult.mode})`);
    }

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
    for (const scene of sceneList) {
      if (scene.imagePrompt) {
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
          imagePrompt: scene.imagePrompt,
        });

        console.warn(`[Pipeline] VISUAL_GENERATION job queued for scene ${scene.id} (index=${scene.index})`);
      }
    }

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

    // Check frozen config for video generation enablement (fall back to project flag)
    const frozenConfig = await pipelineConfigService.getFrozenConfig(projectId);
    const videoEnabled = frozenConfig?.videoGeneration?.enabled ?? project.enableVideoGeneration;

    if (videoEnabled) {
      console.warn(`[Pipeline] Video generation enabled for project ${projectId}, queuing VIDEO_GENERATION for ${activeScenes.length} scene(s)`);
      const videoStageConfig = frozenConfig?.videoGeneration;
      // Queue VIDEO_GENERATION jobs for each non-failed scene
      for (const scene of activeScenes) {
        // Check for media overrides on this scene
        const overrides = await pipelineConfigService.getMediaOverrides(
          projectId,
          "VIDEO_GENERATION",
          scene.index
        );
        const mediaOverrideUrl = overrides.length > 0 ? overrides[0].url ?? undefined : undefined;

        // Fetch the verified image URL from sceneVisuals
        const [visual] = await db
          .select()
          .from(sceneVisuals)
          .where(eq(sceneVisuals.sceneId, scene.id));

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
            },
          }),
          ...(mediaOverrideUrl && { mediaOverrideUrl }),
        });

        console.warn(`[Pipeline] VIDEO_GENERATION job queued for scene ${scene.id} (index=${scene.index}), imageUrl=${imageUrl ? "present" : "missing"}${mediaOverrideUrl ? ", mediaOverride=present" : ""}`);
      }

      await db
        .update(projects)
        .set({
          status: "generating_video",
          progressPercent: STAGE_PROGRESS_PERCENT["VIDEO_GENERATION"] ?? 55,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      console.warn(`[Pipeline] Project ${projectId} status set to "generating_video"`);
    } else {
      // Skip video generation — use frozen config to find next enabled stage
      const nextStage = this.getNextEnabledStage("VIDEO_GENERATION" as PipelineStage, frozenConfig);
      console.warn(`[Pipeline] Video generation disabled for project ${projectId}, next enabled stage: ${nextStage ?? "none"}`);
      await this.queueTTSForScenes(projectId, userId, activeScenes, project.voiceProfileId);
    }
  }

  async advanceAfterVideoGeneration(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(
      `[Pipeline] Advancing after video generation for ${projectId}`
    );

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      console.error(`[Pipeline] Project ${projectId} not found during advanceAfterVideoGeneration, aborting`);
      return;
    }

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
      return; // Not all scenes done yet, wait
    }

    const activeScenes = sceneList.filter(s => s.status !== "failed");
    console.warn(`[Pipeline] All videos generated for project ${projectId}: ${activeScenes.length} active, ${failedCount} failed. Proceeding to TTS.`);
    await this.queueTTSForScenes(projectId, userId, activeScenes, project.voiceProfileId);
  }

  private async queueTTSForScenes(
    projectId: string,
    userId: string,
    activeScenes: { id: string; narrationScript: string | null }[],
    voiceProfileId: string | null
  ): Promise<void> {
    const scenesWithNarration = activeScenes.filter((s) => s.narrationScript);
    const scenesWithoutNarration = activeScenes.length - scenesWithNarration.length;
    console.warn(`[Pipeline] Queuing TTS for project ${projectId}: ${scenesWithNarration.length} scene(s) with narration, ${scenesWithoutNarration} without, voiceId=${voiceProfileId ?? "alloy"}, provider=openai`);

    for (const scene of activeScenes) {
      if (scene.narrationScript) {
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
          narrationScript: scene.narrationScript,
          voiceId: voiceProfileId ?? "alloy",
          provider: "openai",
        });

        console.warn(`[Pipeline] TTS_GENERATION job queued for scene ${scene.id} (scriptLength=${scene.narrationScript.length} chars)`);
      }
    }

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

    for (const scene of activeScenesForMixing) {
      // Look up actual voiceover URL from sceneVideos (stored by TTS worker)
      const [sceneVideo] = await db
        .select()
        .from(sceneVideos)
        .where(eq(sceneVideos.sceneId, scene.id));

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
    }

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
      return; // Not all scenes done yet, wait
    }

    // Queue final video assembly with non-failed scenes only
    const activeScenesForAssembly = sceneList.filter(s => s.status !== "failed");
    console.warn(`[Pipeline] All audio mixed for project ${projectId}: ${activeScenesForAssembly.length} active, ${failedCount} failed. Queuing VIDEO_ASSEMBLY.`);

    await db.insert(generationJobs).values({
      userId,
      projectId,
      jobType: "VIDEO_ASSEMBLY",
      status: "queued",
    });

    await addVideoAssemblyJob({
      projectId,
      userId,
      sceneIds: activeScenesForAssembly.map((s) => s.id),
    });

    await db
      .update(projects)
      .set({
        status: "assembling",
        progressPercent: 88,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    console.warn(`[Pipeline] VIDEO_ASSEMBLY job queued for project ${projectId} with ${activeScenesForAssembly.length} scene(s), status set to "assembling" (88%)`);
  }

  async checkAndAdvancePipeline(
    projectId: string,
    userId: string,
    completedStage: string
  ): Promise<void> {
    console.warn(`[Pipeline] checkAndAdvancePipeline called: stage=${completedStage}, projectId=${projectId}, userId=${userId}`);

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
        // Caption generation completes before final assembly
        // The caption worker advances to VIDEO_ASSEMBLY
        console.warn(`[Pipeline] CAPTION_GENERATION completed for project ${projectId}, advancing to assembly`);
        await this.advanceAfterAudioMixing(projectId, userId);
        break;
      default:
        console.error(
          `[Pipeline] Unknown stage: ${completedStage} for ${projectId}`
        );
    }
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
