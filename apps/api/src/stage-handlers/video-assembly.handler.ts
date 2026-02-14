import { db } from "@contenthq/db/client";
import { scenes, generationJobs } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
  FullStageConfigs,
} from "@contenthq/shared";

/**
 * Handles the VIDEO_ASSEMBLY stage.
 * Combines all scenes into the final video with transitions, captions, and branding.
 */
export class VideoAssemblyHandler implements StageHandler {
  readonly stageId = "video-assembly";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId))
      .orderBy(asc(scenes.index));

    const activeScenes = sceneList.filter((s) => s.status !== "failed");
    const frozenConfig = ctx.frozenConfig as FullStageConfigs | null;
    const captionConfig = frozenConfig?.captionGeneration;
    const assemblyConfig = frozenConfig?.assembly;

    await db.insert(generationJobs).values({
      userId: ctx.userId,
      projectId: ctx.projectId,
      jobType: "VIDEO_ASSEMBLY",
      status: "queued",
    });

    return [
      {
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          userId: ctx.userId,
          sceneIds: activeScenes.map((s) => s.id),
          ...(assemblyConfig && {
            stageConfig: {
              transitions: assemblyConfig.transitions,
              transitionType: assemblyConfig.transitionType,
              transitionAssignment: assemblyConfig.transitionAssignment,
              transitionDuration: assemblyConfig.transitionDuration,
              outputFormat: assemblyConfig.outputFormat,
              resolution: assemblyConfig.resolution,
              fps: assemblyConfig.fps,
              watermarkEnabled: assemblyConfig.watermarkEnabled,
              watermarkText: assemblyConfig.watermarkText,
              brandingIntroUrl: assemblyConfig.brandingIntroUrl,
              brandingOutroUrl: assemblyConfig.brandingOutroUrl,
            },
          }),
          ...(captionConfig?.enabled && {
            captionConfig: {
              font: captionConfig.font,
              fontSize: captionConfig.fontSize,
              fontColor: captionConfig.fontColor,
              backgroundColor: captionConfig.backgroundColor,
              position: captionConfig.position,
              highlightMode: captionConfig.highlightMode,
              highlightColor: captionConfig.highlightColor,
              wordsPerLine: captionConfig.wordsPerLine,
              useWordLevelTiming: captionConfig.useWordLevelTiming,
              animationStyle: captionConfig.animationStyle,
            },
          }),
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
