export const PipelineStage = {
  INGESTION: "INGESTION",
  STORY_WRITING: "STORY_WRITING",
  SCENE_GENERATION: "SCENE_GENERATION",
  VISUAL_GENERATION: "VISUAL_GENERATION",
  VISUAL_VERIFICATION: "VISUAL_VERIFICATION",
  VIDEO_GENERATION: "VIDEO_GENERATION",
  TTS_GENERATION: "TTS_GENERATION",
  AUDIO_MIXING: "AUDIO_MIXING",
  VIDEO_ASSEMBLY: "VIDEO_ASSEMBLY",
} as const;
export type PipelineStage = (typeof PipelineStage)[keyof typeof PipelineStage];

export const ProjectStatus = {
  DRAFT: "draft",
  INGESTING: "ingesting",
  WRITING: "writing",
  GENERATING_SCENES: "generating_scenes",
  VERIFYING: "verifying",
  GENERATING_VIDEO: "generating_video",
  MIXING_AUDIO: "mixing_audio",
  ASSEMBLING: "assembling",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const SceneStatus = {
  OUTLINED: "outlined",
  SCRIPTED: "scripted",
  VISUAL_GENERATED: "visual_generated",
  VISUAL_VERIFIED: "visual_verified",
  VIDEO_GENERATED: "video_generated",
  AUDIO_MIXED: "audio_mixed",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type SceneStatus = (typeof SceneStatus)[keyof typeof SceneStatus];

export const JobStatus = {
  PENDING: "pending",
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const AIProviderType = {
  LLM: "llm",
  IMAGE: "image",
  VIDEO: "video",
  TTS: "tts",
  MUSIC: "music",
  VISION: "vision",
  EMBEDDING: "embedding",
} as const;
export type AIProviderType = (typeof AIProviderType)[keyof typeof AIProviderType];

export const MediaType = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  THUMBNAIL: "thumbnail",
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];
