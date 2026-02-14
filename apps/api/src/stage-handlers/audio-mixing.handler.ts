import { db } from "@contenthq/db/client";
import { scenes, sceneVideos, generationJobs } from "@contenthq/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
  FullStageConfigs,
} from "@contenthq/shared";

/**
 * Handles the AUDIO_MIXING stage.
 * Mixes TTS voiceover with background music for each scene.
 */
export class AudioMixingHandler implements StageHandler {
  readonly stageId = "audio-mixing";

  async prepareJobs(ctx: StageHandlerContext): Promise<PreparedJob[]> {
    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, ctx.projectId))
      .orderBy(asc(scenes.index));

    const activeScenes = sceneList.filter((s) => s.status !== "failed");
    const frozenConfig = ctx.frozenConfig as FullStageConfigs | null;
    const audioMixingConfig = frozenConfig?.audioMixing;
    const musicTrackId = audioMixingConfig?.musicTrackId ?? null;

    // Batch fetch scene videos for voiceover URLs
    const activeSceneIds = activeScenes.map((s) => s.id);
    const allSceneVideos =
      activeSceneIds.length > 0
        ? await db
            .select()
            .from(sceneVideos)
            .where(inArray(sceneVideos.sceneId, activeSceneIds))
        : [];
    const sceneVideosBySceneId = new Map(
      allSceneVideos.map((sv) => [sv.sceneId, sv])
    );

    const jobs: PreparedJob[] = [];
    for (const scene of activeScenes) {
      const sceneVideo = sceneVideosBySceneId.get(scene.id);

      await db.insert(generationJobs).values({
        userId: ctx.userId,
        projectId: ctx.projectId,
        jobType: "AUDIO_MIXING",
        status: "queued",
      });

      jobs.push({
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          sceneId: scene.id,
          userId: ctx.userId,
          voiceoverUrl: sceneVideo?.voiceoverUrl ?? "",
          musicTrackId,
          ...(audioMixingConfig && {
            stageConfig: {
              musicVolume: audioMixingConfig.musicVolume,
              voiceoverVolume: audioMixingConfig.voiceoverVolume,
              fadeInMs: audioMixingConfig.fadeInMs,
              fadeOutMs: audioMixingConfig.fadeOutMs,
              musicLoop: audioMixingConfig.musicLoop,
              musicDuckingEnabled: audioMixingConfig.musicDuckingEnabled,
            },
          }),
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
    const mixed = sceneList.filter(
      (s) => s.status === "audio_mixed"
    ).length;
    const failed = sceneList.filter((s) => s.status === "failed").length;
    const allDone = sceneList.every(
      (s) => s.status === "audio_mixed" || s.status === "failed"
    );

    return {
      isComplete: allDone,
      completedJobs: mixed,
      totalJobs: total,
      failedJobs: failed,
    };
  }
}
