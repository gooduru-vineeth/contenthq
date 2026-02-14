import { db } from "@contenthq/db/client";
import { projects, scenes, voiceProfiles, generationJobs } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import type {
  StageHandler,
  StageHandlerContext,
  PreparedJob,
  CompletionCheckResult,
  FullStageConfigs,
} from "@contenthq/shared";

/**
 * Handles the TTS_GENERATION stage.
 * Generates narration audio for all scenes using configured TTS provider/voice.
 * Resolves voice via: voiceProfile → frozenConfig → system default.
 */
export class TTSGenerationHandler implements StageHandler {
  readonly stageId = "tts-generation";

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
      (s) => s.status !== "failed" && s.narrationScript
    );

    // Resolve TTS provider and voice
    let resolvedProvider = "openai";
    let resolvedVoiceId = "alloy";

    if (project.voiceProfileId) {
      const [profile] = await db
        .select()
        .from(voiceProfiles)
        .where(eq(voiceProfiles.id, project.voiceProfileId))
        .limit(1);
      if (profile) {
        resolvedProvider = profile.provider;
        resolvedVoiceId = profile.providerVoiceId;
      }
    }

    if (!project.voiceProfileId || resolvedProvider === "openai") {
      const frozenConfig = ctx.frozenConfig as FullStageConfigs | null;
      const ttsConfig = frozenConfig?.tts;
      if (ttsConfig?.provider) {
        resolvedProvider = ttsConfig.provider;
      }
      if (ttsConfig?.voiceId) {
        resolvedVoiceId = ttsConfig.voiceId;
      }
    }

    // Use provider-specific default voice instead of OpenAI's "alloy"
    if (resolvedProvider !== "openai" && (!resolvedVoiceId || resolvedVoiceId === "alloy")) {
      const { getDefaultVoice } = await import("@contenthq/tts");
      resolvedVoiceId = getDefaultVoice(resolvedProvider as any) || resolvedVoiceId;
    }

    const jobs: PreparedJob[] = [];
    for (const scene of activeScenes) {
      await db.insert(generationJobs).values({
        userId: ctx.userId,
        projectId: ctx.projectId,
        jobType: "TTS_GENERATION",
        status: "queued",
      });

      jobs.push({
        queueName: ctx.stageDefinition.queueName,
        jobName: ctx.stageDefinition.jobName,
        data: {
          projectId: ctx.projectId,
          sceneId: scene.id,
          userId: ctx.userId,
          narrationScript: scene.narrationScript!,
          voiceId: resolvedVoiceId,
          provider: resolvedProvider,
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
    // TTS uses "video_generated" status as the completion marker
    const done = sceneList.filter(
      (s) => s.status === "video_generated"
    ).length;
    const failed = sceneList.filter((s) => s.status === "failed").length;
    const allDone = sceneList.every(
      (s) => s.status === "video_generated" || s.status === "failed"
    );

    return {
      isComplete: allDone,
      completedJobs: done,
      totalJobs: total,
      failedJobs: failed,
    };
  }
}
