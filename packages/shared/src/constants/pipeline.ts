import { PipelineStage } from "../types/pipeline";

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PipelineStage.INGESTION,
  PipelineStage.STORY_WRITING,
  PipelineStage.SCENE_GENERATION,
  PipelineStage.VISUAL_GENERATION,
  PipelineStage.VISUAL_VERIFICATION,
  PipelineStage.VIDEO_GENERATION,
  PipelineStage.TTS_GENERATION,
  PipelineStage.AUDIO_MIXING,
  PipelineStage.VIDEO_ASSEMBLY,
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  [PipelineStage.INGESTION]: "Content Ingestion",
  [PipelineStage.STORY_WRITING]: "Story Writing",
  [PipelineStage.SCENE_GENERATION]: "Scene Generation",
  [PipelineStage.VISUAL_GENERATION]: "Visual Generation",
  [PipelineStage.VISUAL_VERIFICATION]: "Visual Verification",
  [PipelineStage.VIDEO_GENERATION]: "Video Generation",
  [PipelineStage.TTS_GENERATION]: "Voice Generation",
  [PipelineStage.AUDIO_MIXING]: "Audio Mixing",
  [PipelineStage.VIDEO_ASSEMBLY]: "Final Assembly",
};

export const QUEUE_CONFIG = {
  INGESTION: { concurrency: 5, retries: 2 },
  STORY_WRITING: { concurrency: 3, retries: 2 },
  SCENE_GENERATION: { concurrency: 10, retries: 3 },
  VISUAL_GENERATION: { concurrency: 5, retries: 3 },
  VISUAL_VERIFICATION: { concurrency: 10, retries: 2 },
  VIDEO_GENERATION: { concurrency: 3, retries: 2 },
  TTS_GENERATION: { concurrency: 5, retries: 3 },
  AUDIO_MIXING: { concurrency: 5, retries: 2 },
  VIDEO_ASSEMBLY: { concurrency: 2, retries: 2 },
} as const;

export const DEFAULT_PIPELINE_CONFIG = {
  autoAdvance: true,
  parallelScenes: true,
  maxRetries: 3,
  visualVerificationThreshold: 60,
} as const;
