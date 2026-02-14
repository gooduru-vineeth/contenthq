import { db } from "@contenthq/db/client";
import { pipelineConfigs, pipelineMediaOverrides } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import {
  fullStageConfigsSchema,
  type FullStageConfigs,
  type PipelineStage,
  PIPELINE_STAGE_ORDER,
} from "@contenthq/shared";

/** Maps PipelineStage enum values to stageConfigs keys */
const STAGE_TO_CONFIG_KEY: Record<string, keyof FullStageConfigs> = {
  INGESTION: "ingestion",
  STORY_WRITING: "storyWriting",
  SCENE_GENERATION: "sceneGeneration",
  VISUAL_GENERATION: "visualGeneration",
  VISUAL_VERIFICATION: "visualVerification",
  VIDEO_GENERATION: "videoGeneration",
  TTS_GENERATION: "tts",
  AUDIO_MIXING: "audioMixing",
  CAPTION_GENERATION: "captionGeneration",
  VIDEO_ASSEMBLY: "assembly",
  PPT_INGESTION: "pptIngestion",
  PPT_GENERATION: "aiPresentationGen",
  SLIDE_RENDERING: "slideRendering",
  AUDIO_SCRIPT_GEN: "audioScriptGen",
  REMOTION_COMPOSITION: "remotionComposition",
  REMOTION_RENDER: "remotionRender",
  MOTION_CANVAS_SCENE: "motionCanvasScene",
  MOTION_CANVAS_RENDER: "motionCanvasRender",
};

export const pipelineConfigService = {
  async getOrCreateDefault(projectId: string, userId: string) {
    const [existing] = await db
      .select()
      .from(pipelineConfigs)
      .where(eq(pipelineConfigs.projectId, projectId));

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(pipelineConfigs)
      .values({
        projectId,
        userId,
        mode: "simple",
        stageConfigs: {},
      })
      .returning();

    return created;
  },

  async upsert(
    projectId: string,
    userId: string,
    mode: string,
    stageConfigs: FullStageConfigs
  ) {
    // Validate stageConfigs with Zod schema
    const validated = fullStageConfigsSchema.parse(stageConfigs);

    const [result] = await db
      .insert(pipelineConfigs)
      .values({
        projectId,
        userId,
        mode,
        stageConfigs: validated as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pipelineConfigs.projectId,
        set: {
          mode,
          stageConfigs: validated as Record<string, unknown>,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  },

  async freezeConfig(projectId: string) {
    const [config] = await db
      .select()
      .from(pipelineConfigs)
      .where(eq(pipelineConfigs.projectId, projectId));

    if (!config) {
      return null;
    }

    const [frozen] = await db
      .update(pipelineConfigs)
      .set({
        frozenConfig: config.stageConfigs,
        frozenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pipelineConfigs.projectId, projectId))
      .returning();

    return frozen;
  },

  async getFrozenConfig(
    projectId: string
  ): Promise<FullStageConfigs | null> {
    const [config] = await db
      .select()
      .from(pipelineConfigs)
      .where(eq(pipelineConfigs.projectId, projectId));

    if (!config?.frozenConfig) {
      return null;
    }

    return config.frozenConfig as unknown as FullStageConfigs;
  },

  async getStageConfig(projectId: string, stage: string) {
    const frozen = await this.getFrozenConfig(projectId);
    if (!frozen) {
      return undefined;
    }

    const configKey = STAGE_TO_CONFIG_KEY[stage];
    if (!configKey) {
      return undefined;
    }

    return frozen[configKey];
  },

  async getMediaOverrides(
    projectId: string,
    stage: string,
    sceneIndex?: number
  ) {
    const conditions = [
      eq(pipelineMediaOverrides.projectId, projectId),
      eq(pipelineMediaOverrides.stage, stage),
    ];

    if (sceneIndex !== undefined) {
      conditions.push(
        eq(pipelineMediaOverrides.sceneIndex, sceneIndex)
      );
    }

    return await db
      .select()
      .from(pipelineMediaOverrides)
      .where(and(...conditions));
  },

  mapSimpleToAdvanced(input: {
    tone?: string;
    visualStyle?: string;
    ttsProvider?: string;
    ttsVoiceId?: string;
    enableCaptions?: boolean;
    enableVideoGeneration?: boolean;
    voiceProfileId?: string;
    musicTrackId?: string;
  }): FullStageConfigs {
    const configs: FullStageConfigs = {};

    if (input.tone) {
      configs.storyWriting = { enabled: true, tone: input.tone };
    }

    if (input.visualStyle) {
      configs.sceneGeneration = {
        enabled: true,
        visualStyle: input.visualStyle as "photorealistic" | "digital_art" | "anime" | "oil_painting" | "watercolor" | "3d_render" | "cinematic" | "minimalist" | "cartoon" | "sketch",
      };
    }

    if (input.ttsProvider || input.ttsVoiceId || input.voiceProfileId) {
      configs.tts = {
        enabled: true,
        ...(input.ttsProvider && { provider: input.ttsProvider as "openai" | "elevenlabs" | "google" | "gemini" | "sarvam" | "inworld" }),
        ...(input.ttsVoiceId && { voiceId: input.ttsVoiceId }),
        ...(input.voiceProfileId && { voiceProfileId: input.voiceProfileId }),
      };
    }

    if (input.enableCaptions !== undefined) {
      configs.captionGeneration = {
        enabled: input.enableCaptions,
      };
    }

    if (input.enableVideoGeneration !== undefined) {
      configs.videoGeneration = {
        enabled: input.enableVideoGeneration,
      };
    }

    if (input.musicTrackId) {
      configs.audioMixing = {
        enabled: true,
        musicTrackId: input.musicTrackId,
      };
    }

    return configs;
  },

  /**
   * Given the current stage and the frozen config, find the next
   * enabled stage in PIPELINE_STAGE_ORDER.
   * Returns null if no more stages remain.
   */
  getNextEnabledStage(
    currentStage: PipelineStage,
    frozenConfig: FullStageConfigs | null
  ): PipelineStage | null {
    const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStage);
    if (currentIndex === -1) {
      return null;
    }

    for (let i = currentIndex + 1; i < PIPELINE_STAGE_ORDER.length; i++) {
      const stage = PIPELINE_STAGE_ORDER[i];
      const configKey = STAGE_TO_CONFIG_KEY[stage];

      // If no frozen config, all stages are enabled by default
      if (!frozenConfig || !configKey) {
        return stage;
      }

      const stageConfig = frozenConfig[configKey];

      // If no stage config entry, treat as enabled (default)
      if (!stageConfig) {
        return stage;
      }

      // Skip explicitly disabled stages
      if (stageConfig.enabled === false) {
        continue;
      }

      return stage;
    }

    return null;
  },
};
