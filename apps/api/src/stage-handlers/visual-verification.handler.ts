import { db } from "@contenthq/db/client";
import { scenes } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
} from "@contenthq/shared";

/**
 * Handles the VISUAL_VERIFICATION stage.
 * Verification jobs are queued inline by the visual-generation worker,
 * so prepareJobs is a no-op. checkCompletion waits for all scenes to be verified.
 */
export class VisualVerificationHandler implements StageHandler {
  readonly stageId = "visual-verification";

  async prepareJobs(
    _ctx: StageHandlerContext
  ): Promise<PreparedJob[]> {
    // Verification jobs are dispatched by the visual generation worker itself
    // No additional jobs to prepare here
    return [];
  }

  async checkCompletion(
    ctx: StageHandlerContext
  ): Promise<CompletionCheckResult> {
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId));

    const total = sceneList.length;
    const verified = sceneList.filter(
      (s) => s.status === "visual_verified"
    ).length;
    const failed = sceneList.filter((s) => s.status === "failed").length;
    const allDone = sceneList.every(
      (s) => s.status === "visual_verified" || s.status === "failed"
    );

    return {
      isComplete: allDone,
      completedJobs: verified,
      totalJobs: total,
      failedJobs: failed,
    };
  }
}
