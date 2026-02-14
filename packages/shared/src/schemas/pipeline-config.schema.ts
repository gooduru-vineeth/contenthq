import { z } from "zod";

// ─── Base Stage Config ──────────────────────────────────────────────

const baseStageConfigSchema = z.object({
  enabled: z.boolean().default(true),
  customInstructions: z.string().optional(),
  maxRetries: z.number().int().min(0).max(10).default(3),
});

// ─── Ingestion Stage ────────────────────────────────────────────────

export const ingestionStageConfigSchema = baseStageConfigSchema.extend({
  sourceType: z
    .enum(["url", "topic", "rss", "youtube"])
    .optional(),
  extractImages: z.boolean().default(true),
  maxContentLength: z.number().int().min(100).max(100000).optional(),
});

// ─── Story Writing Stage ────────────────────────────────────────────

export const storyWritingStageConfigSchema = baseStageConfigSchema.extend({
  provider: z.string().optional(),
  model: z.string().optional(),
  tone: z.string().optional(),
  narrativeStructure: z
    .enum([
      "linear",
      "hero_journey",
      "problem_solution",
      "listicle",
      "documentary",
    ])
    .default("linear"),
  targetSceneCount: z.number().int().min(1).max(50).optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  agentId: z.string().optional(),
});

// ─── Scene Generation Stage ─────────────────────────────────────────

export const sceneGenerationStageConfigSchema = baseStageConfigSchema.extend({
  provider: z.string().optional(),
  model: z.string().optional(),
  visualStyle: z
    .enum([
      "photorealistic",
      "digital_art",
      "anime",
      "oil_painting",
      "watercolor",
      "3d_render",
      "cinematic",
      "minimalist",
      "cartoon",
      "sketch",
    ])
    .default("photorealistic"),
  imagePromptStyle: z.string().optional(),
  agentId: z.string().optional(),
});

// ─── Visual Generation Stage ────────────────────────────────────────

export const visualGenerationStageConfigSchema = baseStageConfigSchema.extend({
  provider: z.string().optional(),
  model: z.string().optional(),
  imageSize: z.string().default("1024x1024"),
  quality: z.enum(["standard", "hd"]).default("standard"),
  batchCount: z.number().int().min(1).max(4).default(1),
  stylePreset: z.string().optional(),
});

// ─── Visual Verification Stage ──────────────────────────────────────

export const visualVerificationStageConfigSchema =
  baseStageConfigSchema.extend({
    threshold: z.number().min(0).max(100).default(60),
    autoRetryCount: z.number().int().min(0).max(5).default(2),
    verificationModel: z.string().optional(),
  });

// ─── Video Generation Stage ─────────────────────────────────────────

export const videoGenerationStageConfigSchema = baseStageConfigSchema.extend({
  provider: z.string().optional(),
  model: z.string().optional(),
  motionType: z
    .enum(["zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down", "kenburns_in", "kenburns_out", "static"])
    .default("kenburns_in"),
  motionAssignment: z.enum(["system_random", "ai_random", "manual"]).default("system_random"),
  motionSpeed: z.number().min(0.1).max(1.0).default(0.5),
  durationPerScene: z.number().min(1).max(30).default(5),
});

// ─── TTS Stage ──────────────────────────────────────────────────────

export const ttsStageConfigSchema = baseStageConfigSchema.extend({
  provider: z
    .enum(["openai", "elevenlabs", "google", "gemini", "sarvam", "inworld"])
    .optional(),
  model: z.string().optional(),
  voiceId: z.string().optional(),
  voiceProfileId: z.string().optional(),
  quality: z.enum(["standard", "premium", "ultra"]).default("standard"),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
  format: z.enum(["mp3", "wav", "ogg", "opus"]).default("mp3"),
});

// ─── Audio Mixing Stage ─────────────────────────────────────────────

export const audioMixingStageConfigSchema = baseStageConfigSchema.extend({
  musicTrackId: z.string().optional(),
  voiceoverVolume: z.number().min(0).max(100).default(100),
  musicVolume: z.number().min(0).max(100).default(30),
  musicDuckingEnabled: z.boolean().default(true),
  fadeInMs: z.number().int().min(0).max(5000).default(500),
  fadeOutMs: z.number().int().min(0).max(5000).default(1000),
  musicLoop: z.boolean().default(true),
});

// ─── Caption Generation Stage (NEW) ─────────────────────────────────

export const captionGenerationStageConfigSchema = baseStageConfigSchema.extend({
  enabled: z.boolean().default(false),
  font: z.string().default("Arial"),
  fontSize: z.number().int().min(8).max(72).default(24),
  fontColor: z.string().default("#FFFFFF"),
  backgroundColor: z.string().default("#00000080"),
  position: z
    .enum([
      "top-left",
      "top-center",
      "top-right",
      "middle-left",
      "middle-center",
      "middle-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ])
    .default("bottom-center"),
  highlightMode: z
    .enum(["none", "highlight", "fill", "karaoke"])
    .default("none"),
  highlightColor: z.string().default("#FFD700"),
  wordsPerLine: z.number().int().min(1).max(10).default(4),
  useWordLevelTiming: z.boolean().default(true),
  animationStyle: z.string().default("none"),
});

// ─── Assembly Stage ─────────────────────────────────────────────────

export const assemblyStageConfigSchema = baseStageConfigSchema.extend({
  transitions: z
    .enum(["fade", "cut", "dissolve", "wipe"])
    .default("fade"),
  transitionType: z.enum(["fade", "fadeblack", "fadewhite", "dissolve", "wipeleft", "wiperight", "slideleft", "slideright", "circleopen", "circleclose", "radial", "smoothleft", "smoothright", "zoomin", "none"]).default("fade"),
  transitionAssignment: z.enum(["system_random", "ai_random", "manual", "uniform"]).default("uniform"),
  transitionDuration: z.number().min(0.1).max(2.0).default(0.5),
  outputFormat: z.enum(["mp4", "webm", "mov"]).default("mp4"),
  resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
  fps: z.number().int().min(24).max(60).default(30),
  watermarkEnabled: z.boolean().default(false),
  watermarkText: z.string().optional(),
  watermarkPosition: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right"])
    .optional(),
  watermarkOpacity: z.number().min(0).max(1).default(0.5),
  brandingIntroUrl: z.string().optional(),
  brandingOutroUrl: z.string().optional(),
});

// ─── PPT Ingestion Stage ───────────────────────────────────────────
export const pptIngestionStageConfigSchema = baseStageConfigSchema.extend({
  inputType: z.enum(["pptx", "pdf", "google_slides", "keynote", "url"]).optional(),
  extractNotes: z.boolean().default(true),
  extractImages: z.boolean().default(true),
  maxSlides: z.number().int().min(1).max(200).optional(),
});

// ─── AI Presentation Generation Stage ──────────────────────────────
export const aiPresentationGenStageConfigSchema = baseStageConfigSchema.extend({
  provider: z.string().optional(),
  model: z.string().optional(),
  templateId: z.string().optional(),
  slideCount: z.number().int().min(1).max(100).default(10),
  includeNotesScript: z.boolean().default(true),
  temperature: z.number().min(0).max(2).default(0.7),
});

// ─── Slide Rendering Stage ─────────────────────────────────────────
export const slideRenderingStageConfigSchema = baseStageConfigSchema.extend({
  format: z.enum(["png", "jpg", "webp"]).default("png"),
  quality: z.number().int().min(1).max(100).default(90),
  width: z.number().int().min(320).max(3840).default(1920),
  height: z.number().int().min(240).max(2160).default(1080),
  theme: z.string().optional(),
});

// ─── Audio Script Generation Stage ─────────────────────────────────
export const audioScriptGenStageConfigSchema = baseStageConfigSchema.extend({
  provider: z.string().optional(),
  model: z.string().optional(),
  energy: z.enum(["low", "medium", "high"]).default("medium"),
  tone: z.string().optional(),
  maxWordsPerSlide: z.number().int().min(10).max(500).default(150),
});

// ─── Remotion Composition Stage ────────────────────────────────────
export const remotionCompositionStageConfigSchema = baseStageConfigSchema.extend({
  templateId: z.string().optional(),
  compositionProps: z.record(z.unknown()).optional(),
  durationInFrames: z.number().int().min(1).optional(),
  fps: z.number().int().min(1).max(120).default(30),
  width: z.number().int().min(320).max(3840).default(1920),
  height: z.number().int().min(240).max(2160).default(1080),
});

// ─── Remotion Render Stage ─────────────────────────────────────────
export const remotionRenderStageConfigSchema = baseStageConfigSchema.extend({
  codec: z.enum(["h264", "h265", "vp8", "vp9", "prores"]).default("h264"),
  quality: z.number().int().min(1).max(100).default(80),
  fps: z.number().int().min(1).max(120).default(30),
  outputFormat: z.enum(["mp4", "webm", "mov"]).default("mp4"),
});

// ─── Motion Canvas Scene Stage ─────────────────────────────────────
export const motionCanvasSceneStageConfigSchema = baseStageConfigSchema.extend({
  templateId: z.string().optional(),
  animationSpeed: z.number().min(0.1).max(5.0).default(1.0),
  resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
});

// ─── Motion Canvas Render Stage ────────────────────────────────────
export const motionCanvasRenderStageConfigSchema = baseStageConfigSchema.extend({
  codec: z.enum(["h264", "h265", "vp8", "vp9"]).default("h264"),
  quality: z.number().int().min(1).max(100).default(80),
  fps: z.number().int().min(1).max(120).default(60),
  outputFormat: z.enum(["mp4", "webm"]).default("mp4"),
});

// ─── Full Pipeline Stage Configs ────────────────────────────────────

export const fullStageConfigsSchema = z.object({
  ingestion: ingestionStageConfigSchema.optional(),
  storyWriting: storyWritingStageConfigSchema.optional(),
  sceneGeneration: sceneGenerationStageConfigSchema.optional(),
  visualGeneration: visualGenerationStageConfigSchema.optional(),
  visualVerification: visualVerificationStageConfigSchema.optional(),
  videoGeneration: videoGenerationStageConfigSchema.optional(),
  tts: ttsStageConfigSchema.optional(),
  audioMixing: audioMixingStageConfigSchema.optional(),
  captionGeneration: captionGenerationStageConfigSchema.optional(),
  assembly: assemblyStageConfigSchema.optional(),
  pptIngestion: pptIngestionStageConfigSchema.optional(),
  aiPresentationGen: aiPresentationGenStageConfigSchema.optional(),
  slideRendering: slideRenderingStageConfigSchema.optional(),
  audioScriptGen: audioScriptGenStageConfigSchema.optional(),
  remotionComposition: remotionCompositionStageConfigSchema.optional(),
  remotionRender: remotionRenderStageConfigSchema.optional(),
  motionCanvasScene: motionCanvasSceneStageConfigSchema.optional(),
  motionCanvasRender: motionCanvasRenderStageConfigSchema.optional(),
});

// ─── Pipeline Config Schema ─────────────────────────────────────────

export const pipelineModeSchema = z.enum(["simple", "advanced"]);

export const upsertPipelineConfigSchema = z.object({
  projectId: z.string().min(1),
  mode: pipelineModeSchema.default("simple"),
  stageConfigs: fullStageConfigsSchema.optional(),
});

export const freezePipelineConfigSchema = z.object({
  projectId: z.string().min(1),
});

// ─── Media Override Schema ──────────────────────────────────────────

export const overrideTypeSchema = z.enum([
  "scene_image",
  "scene_video",
  "voiceover_audio",
  "background_music",
  "branding_intro",
  "branding_outro",
]);

export const createMediaOverrideSchema = z.object({
  projectId: z.string().min(1),
  stage: z.string().min(1),
  sceneIndex: z.number().int().min(0).optional(),
  overrideType: overrideTypeSchema,
  mediaAssetId: z.string().optional(),
  url: z.string().url().optional(),
  storageKey: z.string().optional(),
});

export const deleteMediaOverrideSchema = z.object({
  id: z.string().min(1),
});

export const getUploadUrlSchema = z.object({
  projectId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

// ─── Variation Schema ───────────────────────────────────────────────

export const createVariationSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  stageOverrides: fullStageConfigsSchema.optional(),
});

export const updateVariationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  stageOverrides: fullStageConfigsSchema.optional(),
});

export const deleteVariationSchema = z.object({
  id: z.string().min(1),
});

export const startVariationRunSchema = z.object({
  variationId: z.string().min(1),
});

export const submitEvaluationSchema = z.object({
  variationId: z.string().min(1),
  scores: z.record(z.string(), z.number().min(0).max(100)),
});

// ─── Type Exports ───────────────────────────────────────────────────

export type PipelineMode = z.infer<typeof pipelineModeSchema>;

// Use z.input for FullStageConfigs so partial objects (without defaults) are valid
export type FullStageConfigs = z.input<typeof fullStageConfigsSchema>;
export type FullStageConfigsOutput = z.infer<typeof fullStageConfigsSchema>;

export type UpsertPipelineConfigInput = z.infer<
  typeof upsertPipelineConfigSchema
>;
export type FreezePipelineConfigInput = z.infer<
  typeof freezePipelineConfigSchema
>;

// Input types allow partial construction (fields with defaults are optional)
export type IngestionStageConfig = z.input<typeof ingestionStageConfigSchema>;
export type StoryWritingStageConfig = z.input<
  typeof storyWritingStageConfigSchema
>;
export type SceneGenerationStageConfig = z.input<
  typeof sceneGenerationStageConfigSchema
>;
export type VisualGenerationStageConfig = z.input<
  typeof visualGenerationStageConfigSchema
>;
export type VisualVerificationStageConfig = z.input<
  typeof visualVerificationStageConfigSchema
>;
export type VideoGenerationStageConfig = z.input<
  typeof videoGenerationStageConfigSchema
>;
export type TtsStageConfig = z.input<typeof ttsStageConfigSchema>;
export type AudioMixingStageConfig = z.input<
  typeof audioMixingStageConfigSchema
>;
export type CaptionGenerationStageConfig = z.input<
  typeof captionGenerationStageConfigSchema
>;
export type AssemblyStageConfig = z.input<typeof assemblyStageConfigSchema>;
export type PptIngestionStageConfig = z.input<typeof pptIngestionStageConfigSchema>;
export type AiPresentationGenStageConfig = z.input<typeof aiPresentationGenStageConfigSchema>;
export type SlideRenderingStageConfig = z.input<typeof slideRenderingStageConfigSchema>;
export type AudioScriptGenStageConfig = z.input<typeof audioScriptGenStageConfigSchema>;
export type RemotionCompositionStageConfig = z.input<typeof remotionCompositionStageConfigSchema>;
export type RemotionRenderStageConfig = z.input<typeof remotionRenderStageConfigSchema>;
export type MotionCanvasSceneStageConfig = z.input<typeof motionCanvasSceneStageConfigSchema>;
export type MotionCanvasRenderStageConfig = z.input<typeof motionCanvasRenderStageConfigSchema>;

export type OverrideType = z.infer<typeof overrideTypeSchema>;
export type CreateMediaOverrideInput = z.infer<
  typeof createMediaOverrideSchema
>;
export type CreateVariationInput = z.infer<typeof createVariationSchema>;
export type UpdateVariationInput = z.infer<typeof updateVariationSchema>;
export type SubmitEvaluationInput = z.infer<typeof submitEvaluationSchema>;
