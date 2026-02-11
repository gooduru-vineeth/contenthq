import { pgEnum } from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "ingesting",
  "writing",
  "generating_scenes",
  "verifying",
  "generating_video",
  "mixing_audio",
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
