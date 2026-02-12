export const SPEECH_GENERATION_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type SpeechGenerationStatus =
  (typeof SPEECH_GENERATION_STATUSES)[number];

export const SPEECH_GENERATION_PROVIDERS = [
  "openai",
  "elevenlabs",
  "google",
  "google-gemini",
  "inworld",
  "sarvam",
] as const;
export type SpeechGenerationProvider =
  (typeof SPEECH_GENERATION_PROVIDERS)[number];

export interface SpeechGeneration {
  id: string;
  userId: string;
  projectId: string | null;
  title: string | null;
  inputText: string;
  provider: string;
  model: string | null;
  voiceId: string;
  voiceSettings: Record<string, unknown> | null;
  status: SpeechGenerationStatus;
  progress: number;
  audioFileUrl: string | null;
  audioFileKey: string | null;
  audioFormat: string | null;
  durationMs: number | null;
  fileSizeBytes: number | null;
  costUsd: string | null;
  errorMessage: string | null;
  retryCount: number;
  parentGenerationId: string | null;
  batchId: string | null;
  flowExecutionId: string | null;
  flowNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

// CreateSpeechGenerationInput and CreateBatchSpeechGenerationInput
// are exported from schemas/speech-generation.schema.ts as Zod inferred types
