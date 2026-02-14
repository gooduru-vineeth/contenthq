import { db } from "@contenthq/db/client";
import {
  projects,
  scenes,
  sceneVisuals,
  generationJobs,
} from "@contenthq/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
  FullStageConfigs,
} from "@contenthq/shared";
import { pipelineConfigService } from "../services/pipeline-config.service";

/**
 * Handles the VIDEO_GENERATION stage.
 * Applies motion effects to static images, creating video clips per scene.
 * This stage can be disabled (canBeDisabled: true).
 */
export class VideoGenerationHandler implements StageHandler {
  readonly stageId = "video-generation";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, ctx.projectId));

    if (!project) {
      throw new Error(`Project ${ctx.projectId} not found`);
    }

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId))
      .orderBy(asc(scenes.index));

    const activeScenes = sceneList.filter(
      (s) => s.status === "visual_verified" || s.status !== "failed"
    );

    const frozenConfig = ctx.frozenConfig as FullStageConfigs | null;
    const videoStageConfig = frozenConfig?.videoGeneration;

    // Batch fetch visuals and media overrides
    const activeSceneIds = activeScenes.map((s) => s.id);
    const [allVisuals, allOverrides] = await Promise.all([
      activeSceneIds.length > 0
        ? db
            .select()
            .from(sceneVisuals)
            .where(inArray(sceneVisuals.sceneId, activeSceneIds))
        : Promise.resolve([]),
      pipelineConfigService.getMediaOverrides(
        ctx.projectId,
        "VIDEO_GENERATION"
      ),
    ]);

    const visualsBySceneId = new Map(allVisuals.map((v) => [v.sceneId, v]));
    const overridesBySceneIndex = new Map<number, string | undefined>();
    for (const override of allOverrides) {
      if (
        override.sceneIndex !== null &&
        !overridesBySceneIndex.has(override.sceneIndex)
      ) {
        overridesBySceneIndex.set(override.sceneIndex, override.url ?? undefined);
      }
    }

    const jobs: PreparedJob[] = [];
    for (const scene of activeScenes) {
      const mediaOverrideUrl = overridesBySceneIndex.get(scene.index);
      const visual = visualsBySceneId.get(scene.id);
      const imageUrl = visual?.imageUrl ?? "";

      await db.insert(generationJobs).values({
        userId: ctx.userId,
        projectId: ctx.projectId,
        jobType: "VIDEO_GENERATION",
        status: "queued",
      });

      jobs.push({
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          sceneId: scene.id,
          userId: ctx.userId,
          imageUrl,
          motionSpec: (scene.motionSpec as Record<string, unknown>) ?? {},
          scenePrompt:
            scene.imagePrompt ||
            scene.visualDescription ||
            scene.narrationScript ||
            "",
          ...(videoStageConfig && {
            stageConfig: {
              provider: videoStageConfig.provider,
              model: videoStageConfig.model,
              motionType: videoStageConfig.motionType,
              durationPerScene: videoStageConfig.durationPerScene,
              motionAssignment: videoStageConfig.motionAssignment,
              motionSpeed: videoStageConfig.motionSpeed,
            },
          }),
          ...(mediaOverrideUrl && { mediaOverrideUrl }),
        },
      });
    }

    return jobs;
  }

  async checkCompletion(
    ctx: StageHandlerContext
  ): Promise<CompletionCheckResult> {
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId));

    const total = sceneList.length;
    const generated = sceneList.filter(
      (s) => s.status === "video_generated"
    ).length;
    const failed = sceneList.filter((s) => s.status === "failed").length;
    const allDone = sceneList.every(
      (s) => s.status === "video_generated" || s.status === "failed"
    );

    return {
      isComplete: allDone,
      completedJobs: generated,
      totalJobs: total,
      failedJobs: failed,
    };
  }
}
