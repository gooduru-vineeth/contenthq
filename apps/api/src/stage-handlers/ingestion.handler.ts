import { db } from "@contenthq/db/client";
import { projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
} from "@contenthq/shared";

/**
 * Handles the INGESTION stage.
 * Extracts content from the source URL (YouTube, RSS, URL, topic).
 */
export class IngestionHandler implements StageHandler {
  readonly stageId = "ingestion";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, ctx.projectId));

    if (!project) {
      throw new Error(`Project ${ctx.projectId} not found`);
    }

    return [
      {
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          userId: ctx.userId,
          sourceUrl: project.inputContent ?? "",
          sourceType: project.inputType ?? "url",
        },
      },
    ];
  }

  async checkCompletion(
    _ctx: StageHandlerContext
  ): Promise<CompletionCheckResult> {
    // Ingestion is sequential — single job, always complete after job finishes
    return { isComplete: true, completedJobs: 1, totalJobs: 1, failedJobs: 0 };
  }
}
