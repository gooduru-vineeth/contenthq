import { db } from "@contenthq/db/client";
import { stories, generationJobs } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
} from "@contenthq/shared";

/**
 * Handles the SCENE_GENERATION stage.
 * Breaks a story into detailed scenes with visual descriptions, narration, and motion specs.
 */
export class SceneGenerationHandler implements StageHandler {
  readonly stageId = "scene-generation";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.projectId, ctx.projectId));

    if (!story) {
      throw new Error(`No story found for project ${ctx.projectId}`);
    }

    await db.insert(generationJobs).values({
      userId: ctx.userId,
      projectId: ctx.projectId,
      jobType: "SCENE_GENERATION",
      status: "queued",
    });

    return [
      {
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          storyId: story.id,
          userId: ctx.userId,
        },
      },
    ];
  }

  async checkCompletion(
    _ctx: StageHandlerContext
  ): Promise<CompletionCheckResult> {
    return { isComplete: true, completedJobs: 1, totalJobs: 1, failedJobs: 0 };
  }
}
