// ─── Stage Handler Interface ─────────────────────────────────────
// Each pipeline stage has a handler that knows how to prepare jobs
// and check completion. Handlers are registered in the StageRegistry.

import type { PipelineStageDefinition } from "./pipeline-template";

/** Context passed to stage handlers during pipeline execution */
export interface StageHandlerContext {
  /** The project being processed */
  projectId: string;
  /** The user who owns the project */
  userId: string;
  /** The pipeline run ID for tracking */
  pipelineRunId: string;
  /** The template ID for this pipeline */
  templateId: string;
  /** The stage definition from the template */
  stageDefinition: PipelineStageDefinition;
  /** Frozen pipeline configuration (immutable during run) */
  frozenConfig: Record<string, unknown> | null;
}

/** Job to be queued by a stage handler */
export interface PreparedJob {
  /** BullMQ queue name (usually from stageDefinition.queueName) */
  queueName: string;
  /** BullMQ job name (usually from stageDefinition.jobName) */
  jobName: string;
  /** Job data payload */
  data: Record<string, unknown>;
  /** Optional job priority (lower = higher priority) */
  priority?: number;
}

/** Result of checking stage completion */
export interface CompletionCheckResult {
  /** Whether the stage is fully complete */
  isComplete: boolean;
  /** Number of jobs completed so far */
  completedJobs: number;
  /** Total number of jobs for this stage */
  totalJobs: number;
  /** Number of failed jobs */
  failedJobs: number;
}

/**
 * Interface that all stage handlers must implement.
 * Handlers are responsible for preparing jobs and checking completion.
 */
export interface StageHandler {
  /** The stage ID this handler is responsible for */
  readonly stageId: string;

  /**
   * Prepare jobs to be queued for this stage.
   * Called by the generic orchestrator when this stage's dependencies are met.
   * Returns an array of jobs to be dispatched to BullMQ queues.
   */
  prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]>;

  /**
   * Check whether this stage is complete.
   * For sequential stages, this is typically a no-op (always complete after single job).
   * For parallel-per-scene stages, this checks if all scene jobs are done.
   */
  checkCompletion(ctx: StageHandlerContext): Promise<CompletionCheckResult>;
}
