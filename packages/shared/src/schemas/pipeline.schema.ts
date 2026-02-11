import { z } from "zod";

export const startPipelineSchema = z.object({
  projectId: z.string().min(1),
});

export const retryStageSchema = z.object({
  projectId: z.string().min(1),
  stage: z.enum([
    "INGESTION",
    "STORY_WRITING",
    "SCENE_GENERATION",
    "VISUAL_GENERATION",
    "VISUAL_VERIFICATION",
    "VIDEO_GENERATION",
    "TTS_GENERATION",
    "AUDIO_MIXING",
    "VIDEO_ASSEMBLY",
  ]),
});

export const pipelineConfigSchema = z.object({
  projectId: z.string().min(1),
  autoAdvance: z.boolean().default(true),
  parallelScenes: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(5).default(3),
  visualVerificationThreshold: z.number().min(0).max(100).default(60),
});

export type StartPipelineInput = z.infer<typeof startPipelineSchema>;
export type RetryStageInput = z.infer<typeof retryStageSchema>;
export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;
