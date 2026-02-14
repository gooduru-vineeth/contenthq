// ─── Pipeline Template Types ─────────────────────────────────────
// Generic, template-driven pipeline system that supports multiple
// pipeline types: AI Video, Presentation, Remotion, Motion Canvas, Hybrid

export type PipelineOutputType =
  | "ai_video"
  | "presentation"
  | "remotion_video"
  | "motion_canvas_video"
  | "hybrid";

export type StageExecutionMode = "sequential" | "parallel-per-scene";

export type StageCompletionStrategy = "all-scenes-done" | "threshold";

export type RenderingBackendType =
  | "ffmpeg"
  | "remotion"
  | "motion-canvas"
  | "slidev"
  | null;

export type BackoffType = "exponential" | "fixed";

export interface StageQueueConfig {
  concurrency: number;
  retries: number;
  backoffType: BackoffType;
  backoffDelay: number;
}

export interface PipelineStageDefinition {
  /** Unique stage identifier within the template (e.g., "ingestion", "story-writing") */
  stageId: string;
  /** Human-readable label (e.g., "Content Ingestion") */
  label: string;
  /** BullMQ queue name to dispatch jobs to */
  queueName: string;
  /** BullMQ job name within the queue */
  jobName: string;
  /** Whether this stage runs once or per-scene */
  executionMode: StageExecutionMode;
  /** How to determine stage completion for parallel stages */
  completionStrategy?: StageCompletionStrategy;
  /** Whether the user can disable this stage */
  canBeDisabled: boolean;
  /** Key in FullStageConfigs for this stage's configuration */
  configKey?: string;
  /** Progress percentage when this stage starts (0-100) */
  progressPercent: number;
  /** Project status value when this stage is active */
  projectStatus: string;
  /** Scene status value on successful completion of this stage */
  sceneStatusOnComplete?: string;
  /** Stage IDs this stage depends on (DAG edges). Empty = root stage. */
  dependsOn: string[];
  /** Queue configuration (concurrency, retries, backoff) */
  queueConfig: StageQueueConfig;
  /** Which rendering backend this stage uses (null for non-rendering stages) */
  renderingBackend?: RenderingBackendType;
}

export interface PipelineTemplate {
  /** Unique template identifier (e.g., "builtin-ai-video") */
  id: string;
  /** Human-readable name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Description of what this pipeline does */
  description: string;
  /** Template version for tracking changes */
  version: number;
  /** The type of output this pipeline produces */
  outputType: PipelineOutputType;
  /** Ordered list of stage definitions forming the pipeline DAG */
  stages: PipelineStageDefinition[];
  /** Default stage configuration for this template */
  defaultConfig: Record<string, unknown>;
  /** Whether this is a built-in (code-defined) template vs user-created */
  isBuiltIn: boolean;
  /** User ID of creator (null for built-in templates) */
  createdBy: string | null;
}

// ─── Pipeline Run Types ──────────────────────────────────────────

export type PipelineRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type PipelineRunStageStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface PipelineRunStageRecord {
  id: string;
  runId: string;
  stageId: string;
  status: PipelineRunStageStatus;
  jobCount: number;
  completedJobs: number;
  failedJobs: number;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface PipelineRunRecord {
  id: string;
  projectId: string;
  templateId: string;
  status: PipelineRunStatus;
  frozenConfig: Record<string, unknown> | null;
  currentStageId: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}
