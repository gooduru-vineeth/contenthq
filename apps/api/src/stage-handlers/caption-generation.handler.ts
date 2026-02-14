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
 * Handles the CAPTION_GENERATION stage.
 * Caption jobs are dispatched by the audio-mixing worker or the orchestrator.
 * This is an optional stage (canBeDisabled: true, default disabled).
 */
export class CaptionGenerationHandler implements StageHandler {
  readonly stageId = "caption-generation";

  async prepareJobs(
    _ctx: StageHandlerContext
  ): Promise<PreparedJob[]> {
    // Caption generation jobs are typically dispatched inline
    // by the audio mixing completion path. No-op for now.
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
    const captioned = sceneList.filter(
      (s) => s.status === "caption_generated"
    ).length;
    const failed = sceneList.filter((s) => s.status === "failed").length;
    const allDone = sceneList.every(
      (s) =>
        s.status === "caption_generated" ||
        s.status === "audio_mixed" ||
        s.status === "failed"
    );

    return {
      isComplete: allDone,
      completedJobs: captioned,
      totalJobs: total,
      failedJobs: failed,
    };
  }
}
