import { PipelineStage, ProjectStatus } from "../types/pipeline";

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  PipelineStage.INGESTION,
  PipelineStage.SCRIPT_GENERATION,
  PipelineStage.TTS_GENERATION,
  PipelineStage.STT_TIMESTAMPS,
  PipelineStage.SCENE_GENERATION,
  PipelineStage.VISUAL_GENERATION,
  PipelineStage.VISUAL_VERIFICATION,
  PipelineStage.VIDEO_GENERATION,
  PipelineStage.VIDEO_ASSEMBLY,
  // Legacy stages kept for backward compatibility
  PipelineStage.STORY_WRITING,
  PipelineStage.AUDIO_MIXING,
  PipelineStage.CAPTION_GENERATION,
];

export const PIPELINE_STAGE_LABELS: Record<string, string> = {
  [PipelineStage.INGESTION]: "Content Ingestion",
  [PipelineStage.STORY_WRITING]: "Story Writing",
  [PipelineStage.SCRIPT_GENERATION]: "Script Generation",
  [PipelineStage.STT_TIMESTAMPS]: "Audio Transcription",
  [PipelineStage.SCENE_GENERATION]: "Scene Generation",
  [PipelineStage.VISUAL_GENERATION]: "Visual Generation",
  [PipelineStage.VISUAL_VERIFICATION]: "Visual Verification",
  [PipelineStage.VIDEO_GENERATION]: "Video Generation",
  [PipelineStage.TTS_GENERATION]: "Voice Generation",
  [PipelineStage.AUDIO_MIXING]: "Audio Mixing",
  [PipelineStage.CAPTION_GENERATION]: "Caption Generation",
  [PipelineStage.VIDEO_ASSEMBLY]: "Final Assembly",
};

/** Maps project status to the pipeline stage currently active */
export const PROJECT_STATUS_TO_STAGE: Record<string, PipelineStage | null> = {
  [ProjectStatus.DRAFT]: null,
  [ProjectStatus.INGESTING]: PipelineStage.INGESTION,
  [ProjectStatus.GENERATING_SCRIPT]: PipelineStage.SCRIPT_GENERATION,
  [ProjectStatus.TRANSCRIBING]: PipelineStage.STT_TIMESTAMPS,
  [ProjectStatus.WRITING]: PipelineStage.STORY_WRITING,
  [ProjectStatus.GENERATING_SCENES]: PipelineStage.SCENE_GENERATION,
  [ProjectStatus.GENERATING_VISUALS]: PipelineStage.VISUAL_GENERATION,
  [ProjectStatus.VERIFYING]: PipelineStage.VISUAL_VERIFICATION,
  [ProjectStatus.GENERATING_TTS]: PipelineStage.TTS_GENERATION,
  [ProjectStatus.GENERATING_VIDEO]: PipelineStage.VIDEO_GENERATION,
  [ProjectStatus.MIXING_AUDIO]: PipelineStage.AUDIO_MIXING,
  [ProjectStatus.GENERATING_CAPTIONS]: PipelineStage.CAPTION_GENERATION,
  [ProjectStatus.ASSEMBLING]: PipelineStage.VIDEO_ASSEMBLY,
  [ProjectStatus.COMPLETED]: PipelineStage.VIDEO_ASSEMBLY,
  [ProjectStatus.FAILED]: null,
  [ProjectStatus.CANCELLED]: null,
};

/** Progress percentage for each stage start */
export const STAGE_PROGRESS_PERCENT: Record<string, number> = {
  [PipelineStage.INGESTION]: 0,
  [PipelineStage.SCRIPT_GENERATION]: 10,
  [PipelineStage.STORY_WRITING]: 10,
  [PipelineStage.TTS_GENERATION]: 25,
  [PipelineStage.STT_TIMESTAMPS]: 35,
  [PipelineStage.SCENE_GENERATION]: 45,
  [PipelineStage.VISUAL_GENERATION]: 60,
  [PipelineStage.VISUAL_VERIFICATION]: 70,
  [PipelineStage.VIDEO_GENERATION]: 80,
  [PipelineStage.AUDIO_MIXING]: 77,
  [PipelineStage.CAPTION_GENERATION]: 85,
  [PipelineStage.VIDEO_ASSEMBLY]: 90,
};

/** Structured log stored in job result JSONB */
export interface JobResultLog {
  stage: string;
  status: "completed" | "failed";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  details?: string;
  error?: string;
}

export const QUEUE_CONFIG = {
  INGESTION: { concurrency: 5, retries: 2 },
  STORY_WRITING: { concurrency: 3, retries: 2 },
  SCRIPT_GENERATION: { concurrency: 3, retries: 2 },
  STT_TIMESTAMPS: { concurrency: 5, retries: 3 },
  SCENE_GENERATION: { concurrency: 10, retries: 3 },
  VISUAL_GENERATION: { concurrency: 5, retries: 3 },
  VISUAL_VERIFICATION: { concurrency: 10, retries: 2 },
  VIDEO_GENERATION: { concurrency: 3, retries: 2 },
  TTS_GENERATION: { concurrency: 5, retries: 3 },
  AUDIO_MIXING: { concurrency: 5, retries: 2 },
  CAPTION_GENERATION: { concurrency: 5, retries: 2 },
  VIDEO_ASSEMBLY: { concurrency: 2, retries: 2 },
} as const;

export const DEFAULT_PIPELINE_CONFIG = {
  autoAdvance: true,
  parallelScenes: true,
  maxRetries: 3,
  visualVerificationThreshold: 60,
} as const;
