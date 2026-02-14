import { db } from "@contenthq/db/client";
import { scenes, generationJobs } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
} from "@contenthq/shared";

/**
 * Handles the VISUAL_GENERATION stage.
 * Generates images for all scenes in parallel using multi-provider AI.
 */
export class VisualGenerationHandler implements StageHandler {
  readonly stageId = "visual-generation";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId))
      .orderBy(asc(scenes.index));

    const scenesWithPrompts = sceneList.filter((s) => s.imagePrompt);
    const jobs: PreparedJob[] = [];

    for (const scene of scenesWithPrompts) {
      await db.insert(generationJobs).values({
        userId: ctx.userId,
        projectId: ctx.projectId,
        jobType: "VISUAL_GENERATION",
        status: "queued",
      });

      jobs.push({
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          sceneId: scene.id,
          userId: ctx.userId,
          imagePrompt: scene.imagePrompt!,
        },
      });
    }

    return jobs;
  }

  async checkCompletion(
    ctx: StageHandlerContext
  ): Promise<CompletionCheckResult> {
    // Visual generation chains to verification — this check is a no-op
    // because visual-verification handler handles the waiting
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId));

    const total = sceneList.filter((s) => s.imagePrompt).length;
    const completed = sceneList.filter(
      (s) => s.status === "visual_generated" || s.status === "visual_verified"
    ).length;
    const failed = sceneList.filter((s) => s.status === "failed").length;

    return {
      isComplete: completed + failed >= total,
      completedJobs: completed,
      totalJobs: total,
      failedJobs: failed,
    };
  }
}
