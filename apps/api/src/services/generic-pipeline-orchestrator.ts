import { db } from "@contenthq/db/client";
import {
  projects,
  pipelineRuns,
  pipelineRunStages,
} from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { getQueue, type QueueName } from "@contenthq/queue";
import type {
  PipelineTemplate,
  PipelineStageDefinition,
  StageHandlerContext,
  PipelineRunStageStatus,
} from "@contenthq/shared";
import {
  getBuiltinTemplate,
  BUILTIN_TEMPLATES,
  BUILTIN_TEMPLATES_BY_SLUG,
} from "@contenthq/shared";
import { stageRegistry } from "./stage-registry";
import { pipelineConfigService } from "./pipeline-config.service";

/**
 * Generic, template-driven pipeline orchestrator.
 * Replaces the hardcoded switch/case with DAG-based stage advancement.
 *
 * Design:
 * - Templates define stages as a DAG (via `dependsOn` edges)
 * - Stage handlers prepare jobs and check completion
 * - The orchestrator advances through the DAG as stages complete
 * - Pipeline runs and run stages are tracked in the database
 */
export class GenericPipelineOrchestrator {
  /**
   * Resolve the pipeline template for a project.
   * Falls back to the default AI Video template if no template is specified.
   */
  private resolveTemplate(
    pipelineTemplateId: string | null | undefined
  ): PipelineTemplate {
    return getBuiltinTemplate(pipelineTemplateId);
  }

  /**
   * Find stages that have no dependencies (root stages).
   * These are the first stages to execute.
   */
  private findRootStages(
    template: PipelineTemplate
  ): PipelineStageDefinition[] {
    return template.stages.filter(
      (s) => s.dependsOn.length === 0
    );
  }

  /**
   * Find stages that depend on the completed stage and whose ALL
   * dependencies are now satisfied.
   */
  private findNextStages(
    template: PipelineTemplate,
    completedStageIds: Set<string>
  ): PipelineStageDefinition[] {
    return template.stages.filter((stage) => {
      // Skip already-completed stages
      if (completedStageIds.has(stage.stageId)) {
        return false;
      }
      // Check that ALL dependencies are satisfied
      return (
        stage.dependsOn.length > 0 &&
        stage.dependsOn.every((dep) => completedStageIds.has(dep))
      );
    });
  }

  /**
   * Check if a stage is disabled in the frozen config.
   */
  private isStageDisabled(
    stage: PipelineStageDefinition,
    frozenConfig: Record<string, unknown> | null
  ): boolean {
    if (!stage.canBeDisabled || !frozenConfig || !stage.configKey) {
      return false;
    }
    const config = frozenConfig[stage.configKey] as
      | { enabled?: boolean }
      | undefined;
    return config?.enabled === false;
  }

  /**
   * Start a pipeline for a project.
   */
  async startPipeline(
    projectId: string,
    userId: string
  ): Promise<{ runId: string }> {
    // 1. Load project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // 2. Resolve template
    const template = this.resolveTemplate(project.pipelineTemplateId);
    console.warn(
      `[GenericOrchestrator] Starting pipeline for project ${projectId} with template "${template.name}" (${template.id})`
    );

    // 3. Freeze pipeline config
    const frozenResult =
      await pipelineConfigService.freezeConfig(projectId);
    const frozenConfig = frozenResult?.frozenConfig as Record<
      string,
      unknown
    > | null;

    // 4. Create pipeline run record
    const [run] = await db
      .insert(pipelineRuns)
      .values({
        projectId,
        templateSlug: template.slug,
        status: "running",
        frozenConfig: frozenConfig ?? {},
        startedAt: new Date(),
      })
      .returning();

    // 5. Create pipeline run stage records for all stages
    const stageRecords = template.stages.map((stage) => ({
      runId: run.id,
      stageId: stage.stageId,
      status: (this.isStageDisabled(stage, frozenConfig)
        ? "skipped"
        : "pending") as PipelineRunStageStatus,
    }));

    if (stageRecords.length > 0) {
      await db.insert(pipelineRunStages).values(stageRecords);
    }

    // 6. Find and execute root stages
    const rootStages = this.findRootStages(template);
    for (const stage of rootStages) {
      if (this.isStageDisabled(stage, frozenConfig)) {
        // Mark as skipped and try to advance
        await this.markStageCompleted(run.id, stage.stageId, "skipped");
        continue;
      }
      await this.executeStage(
        stage,
        projectId,
        userId,
        run.id,
        template.id,
        frozenConfig
      );
    }

    // Check if any skipped root stages enable downstream stages
    const completedStageIds = await this.getCompletedStageIds(run.id);
    await this.advanceAfterCompletion(
      template,
      completedStageIds,
      projectId,
      userId,
      run.id,
      frozenConfig
    );

    return { runId: run.id };
  }

  /**
   * Check and advance the pipeline after a stage completes.
   * Called by workers when they finish a job.
   */
  async checkAndAdvancePipeline(
    projectId: string,
    userId: string,
    completedStageId: string
  ): Promise<void> {
    console.warn(
      `[GenericOrchestrator] checkAndAdvancePipeline: stage=${completedStageId}, project=${projectId}`
    );

    // 1. Find the active pipeline run for this project
    const [run] = await db
      .select()
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.projectId, projectId),
          eq(pipelineRuns.status, "running")
        )
      );

    if (!run) {
      console.warn(
        `[GenericOrchestrator] No active pipeline run for project ${projectId}, falling back to legacy behavior`
      );
      return;
    }

    // 2. Resolve template
    const template = this.resolveTemplateFromRun(run);

    // 3. Find the stage definition
    const stageDef = template.stages.find(
      (s) => s.stageId === completedStageId
    );
    if (!stageDef) {
      console.error(
        `[GenericOrchestrator] Unknown stage "${completedStageId}" in template "${template.id}"`
      );
      return;
    }

    // 4. Check completion via handler
    const handler = stageRegistry.get(completedStageId);
    if (handler) {
      const frozenConfig = run.frozenConfig as Record<
        string,
        unknown
      > | null;

      const ctx: StageHandlerContext = {
        projectId,
        userId,
        pipelineRunId: run.id,
        templateId: template.id,
        stageDefinition: stageDef,
        frozenConfig,
      };

      const result = await handler.checkCompletion(ctx);
      if (!result.isComplete) {
        console.warn(
          `[GenericOrchestrator] Stage "${completedStageId}" not complete yet: ${result.completedJobs}/${result.totalJobs} done, ${result.failedJobs} failed`
        );
        // Update stage progress
        await db
          .update(pipelineRunStages)
          .set({
            completedJobs: result.completedJobs,
            failedJobs: result.failedJobs,
            jobCount: result.totalJobs,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(pipelineRunStages.runId, run.id),
              eq(pipelineRunStages.stageId, completedStageId)
            )
          );
        return;
      }
    }

    // 5. Mark stage as completed
    await this.markStageCompleted(run.id, completedStageId, "completed");

    // 6. Find and execute next stages
    const completedStageIds = await this.getCompletedStageIds(run.id);
    const frozenConfig = run.frozenConfig as Record<
      string,
      unknown
    > | null;

    await this.advanceAfterCompletion(
      template,
      completedStageIds,
      projectId,
      userId,
      run.id,
      frozenConfig
    );
  }

  /**
   * After marking a stage complete, find and execute next eligible stages.
   * Also handles pipeline completion detection.
   */
  private async advanceAfterCompletion(
    template: PipelineTemplate,
    completedStageIds: Set<string>,
    projectId: string,
    userId: string,
    runId: string,
    frozenConfig: Record<string, unknown> | null
  ): Promise<void> {
    const nextStages = this.findNextStages(template, completedStageIds);

    let anyExecuted = false;
    for (const stage of nextStages) {
      if (this.isStageDisabled(stage, frozenConfig)) {
        await this.markStageCompleted(runId, stage.stageId, "skipped");
        // Recurse: skipping may unlock further stages
        const updatedCompleted = await this.getCompletedStageIds(runId);
        await this.advanceAfterCompletion(
          template,
          updatedCompleted,
          projectId,
          userId,
          runId,
          frozenConfig
        );
        return;
      }

      await this.executeStage(
        stage,
        projectId,
        userId,
        runId,
        template.id,
        frozenConfig
      );
      anyExecuted = true;
    }

    // Check if pipeline is complete (all stages done)
    if (!anyExecuted) {
      const allComplete = template.stages.every(
        (s) => completedStageIds.has(s.stageId)
      );
      if (allComplete) {
        await this.completePipeline(runId, projectId);
      }
    }
  }

  /**
   * Execute a single stage: call handler.prepareJobs(), queue the jobs.
   */
  private async executeStage(
    stage: PipelineStageDefinition,
    projectId: string,
    userId: string,
    runId: string,
    templateId: string,
    frozenConfig: Record<string, unknown> | null
  ): Promise<void> {
    console.warn(
      `[GenericOrchestrator] Executing stage "${stage.stageId}" for project ${projectId}`
    );

    // Update project status and progress
    await db
      .update(projects)
      .set({
        status: stage.projectStatus as (typeof projects.status.enumValues)[number],
        progressPercent: stage.progressPercent,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    // Mark stage as running
    await db
      .update(pipelineRunStages)
      .set({
        status: "running",
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pipelineRunStages.runId, runId),
          eq(pipelineRunStages.stageId, stage.stageId)
        )
      );

    // Update pipeline run's current stage
    await db
      .update(pipelineRuns)
      .set({
        currentStageId: stage.stageId,
        updatedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    // Get handler and prepare jobs
    const handler = stageRegistry.get(stage.stageId);
    if (!handler) {
      console.warn(
        `[GenericOrchestrator] No handler for stage "${stage.stageId}", skipping`
      );
      await this.markStageCompleted(runId, stage.stageId, "skipped");
      return;
    }

    const ctx: StageHandlerContext = {
      projectId,
      userId,
      pipelineRunId: runId,
      templateId,
      stageDefinition: stage,
      frozenConfig,
    };

    const preparedJobs = await handler.prepareJobs(ctx);

    // Update job count
    await db
      .update(pipelineRunStages)
      .set({
        jobCount: preparedJobs.length,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pipelineRunStages.runId, runId),
          eq(pipelineRunStages.stageId, stage.stageId)
        )
      );

    // Queue the jobs
    for (const job of preparedJobs) {
      const queue = getQueue(job.queueName as QueueName);
      await queue.add(job.jobName, job.data, {
        priority: job.priority,
      });
    }

    console.warn(
      `[GenericOrchestrator] Queued ${preparedJobs.length} job(s) for stage "${stage.stageId}"`
    );

    // For stages with 0 jobs (like visual-verification which queues inline),
    // we don't auto-complete — the worker callback will handle it.
  }

  /**
   * Mark a stage as completed or skipped.
   */
  private async markStageCompleted(
    runId: string,
    stageId: string,
    status: "completed" | "skipped"
  ): Promise<void> {
    await db
      .update(pipelineRunStages)
      .set({
        status,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(pipelineRunStages.runId, runId),
          eq(pipelineRunStages.stageId, stageId)
        )
      );

    console.warn(
      `[GenericOrchestrator] Stage "${stageId}" marked as ${status} (run=${runId})`
    );
  }

  /**
   * Get the set of completed/skipped stage IDs for a pipeline run.
   */
  private async getCompletedStageIds(
    runId: string
  ): Promise<Set<string>> {
    const stages = await db
      .select({
        stageId: pipelineRunStages.stageId,
        status: pipelineRunStages.status,
      })
      .from(pipelineRunStages)
      .where(eq(pipelineRunStages.runId, runId));

    return new Set(
      stages
        .filter(
          (s) => s.status === "completed" || s.status === "skipped"
        )
        .map((s) => s.stageId)
    );
  }

  /**
   * Mark the entire pipeline as completed.
   */
  private async completePipeline(
    runId: string,
    projectId: string
  ): Promise<void> {
    await db
      .update(pipelineRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId));

    console.warn(
      `[GenericOrchestrator] Pipeline run ${runId} completed for project ${projectId}`
    );
  }

  /**
   * Resolve template from a pipeline run record.
   */
  private resolveTemplateFromRun(run: {
    templateSlug: string | null;
    templateId: string | null;
  }): PipelineTemplate {
    if (run.templateSlug) {
      const template = BUILTIN_TEMPLATES_BY_SLUG[run.templateSlug];
      if (template) return template;
    }
    if (run.templateId) {
      const template = BUILTIN_TEMPLATES[run.templateId];
      if (template) return template;
    }
    // Fallback to default
    return getBuiltinTemplate(null);
  }
}

export const genericPipelineOrchestrator =
  new GenericPipelineOrchestrator();
