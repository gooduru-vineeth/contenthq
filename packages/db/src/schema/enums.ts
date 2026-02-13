import { pgEnum } from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "ingesting",
  "writing",
  "generating_scenes",
  "generating_visuals",
  "verifying",
  "generating_tts",
  "generating_video",
  "mixing_audio",
  "generating_captions",
  "assembling",
  "completed",
  "failed",
  "cancelled",
]);

export const sceneStatusEnum = pgEnum("scene_status", [
  "outlined",
  "scripted",
  "visual_generated",
  "visual_verified",
  "video_generated",
  "audio_mixed",
  "caption_generated",
  "completed",
  "failed",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const aiProviderTypeEnum = pgEnum("ai_provider_type", [
  "llm",
  "image",
  "video",
  "tts",
  "music",
  "vision",
  "embedding",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "image",
  "video",
  "audio",
  "thumbnail",
]);

export const promptTypeEnum = pgEnum("prompt_type", [
  "story_writing",
  "scene_generation",
  "image_generation",
  "image_refinement",
  "visual_verification",
]);

export const mediaGenerationStatusEnum = pgEnum("media_generation_status", [
  "pending",
  "generating",
  "completed",
  "failed",
]);

export const personaCategoryEnum = pgEnum("persona_category", [
  "tone",
  "audience",
  "visual_style",
  "narrative_style",
]);
