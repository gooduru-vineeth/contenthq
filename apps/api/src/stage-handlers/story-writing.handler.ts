import { db } from "@contenthq/db/client";
import { projects, ingestedContent, generationJobs } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
} from "@contenthq/shared";

/**
 * Handles the STORY_WRITING stage.
 * Generates a narrative structure from ingested content.
 */
export class StoryWritingHandler implements StageHandler {
  readonly stageId = "story-writing";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, ctx.projectId));

    if (!project) {
      throw new Error(`Project ${ctx.projectId} not found`);
    }

    const content = await db
      .select({ id: ingestedContent.id })
      .from(ingestedContent)
      .where(eq(ingestedContent.projectId, ctx.projectId));

    // Create generationJob record
    await db.insert(generationJobs).values({
      userId: ctx.userId,
      projectId: ctx.projectId,
      jobType: "STORY_WRITING",
      status: "queued",
    });

    return [
      {
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          userId: ctx.userId,
          ingestedContentIds: content.map((c) => c.id),
          tone: project.tone ?? "professional",
          targetDuration: project.targetDuration ?? 60,
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
