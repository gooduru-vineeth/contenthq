import { db } from "@contenthq/db/client";
import { projects, scenes, stories } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  addIngestionJob,
  addStoryWritingJob,
  addSceneGenerationJob,
  addVisualGenerationJob,
  addTTSGenerationJob,
  addAudioMixingJob,
  addVideoAssemblyJob,
} from "@contenthq/queue";

export class PipelineOrchestrator {
  async startPipeline(projectId: string, userId: string): Promise<void> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      throw new Error("Project not found");
    }

    console.warn(`[Pipeline] Starting pipeline for project ${projectId}`);

    await db
      .update(projects)
      .set({ status: "ingesting", progressPercent: 0, updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    await addIngestionJob({
      projectId,
      userId,
      sourceUrl: project.inputContent ?? "",
      sourceType: project.inputType ?? "url",
    });
  }

  async advanceAfterIngestion(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after ingestion for ${projectId}`);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return;

    await addStoryWritingJob({
      projectId,
      userId,
      ingestedContentIds: [],
      tone: project.tone ?? "professional",
      targetDuration: project.targetDuration ?? 60,
    });
  }

  async advanceAfterStoryWriting(
    projectId: string,
    userId: string,
    storyId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after story writing for ${projectId}`);

    await addSceneGenerationJob({ projectId, storyId, userId });
  }

  async advanceAfterSceneGeneration(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(
      `[Pipeline] Advancing after scene generation for ${projectId}`
    );

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Queue visual generation for all scenes in parallel
    for (const scene of sceneList) {
      if (scene.imagePrompt) {
        await addVisualGenerationJob({
          projectId,
          sceneId: scene.id,
          userId,
          imagePrompt: scene.imagePrompt,
        });
      }
    }

    await db
      .update(projects)
      .set({
        status: "generating_video",
        progressPercent: 40,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
  }

  async advanceAfterVisualsApproved(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(
      `[Pipeline] Advancing after visuals approved for ${projectId}`
    );

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) return;

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Queue TTS generation for all scenes
    for (const scene of sceneList) {
      if (scene.narrationScript) {
        await addTTSGenerationJob({
          projectId,
          sceneId: scene.id,
          userId,
          narrationScript: scene.narrationScript,
          voiceId: project.voiceProfileId ?? "alloy",
          provider: "openai",
        });
      }
    }

    await db
      .update(projects)
      .set({
        status: "mixing_audio",
        progressPercent: 60,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
  }

  async advanceAfterTTS(projectId: string, userId: string): Promise<void> {
    console.warn(`[Pipeline] Advancing after TTS for ${projectId}`);

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Queue audio mixing for all scenes
    for (const scene of sceneList) {
      await addAudioMixingJob({
        projectId,
        sceneId: scene.id,
        userId,
        voiceoverUrl: `projects/${projectId}/scenes/${scene.id}/voiceover.mp3`,
        musicTrackId: null,
      });
    }
  }

  async advanceAfterAudioMixing(
    projectId: string,
    userId: string
  ): Promise<void> {
    console.warn(`[Pipeline] Advancing after audio mixing for ${projectId}`);

    const sceneList = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(asc(scenes.index));

    // Queue final video assembly
    await addVideoAssemblyJob({
      projectId,
      userId,
      sceneIds: sceneList.map((s) => s.id),
    });

    await db
      .update(projects)
      .set({
        status: "assembling",
        progressPercent: 85,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
  }

  async checkAndAdvancePipeline(
    projectId: string,
    userId: string,
    completedStage: string
  ): Promise<void> {
    switch (completedStage) {
      case "INGESTION":
        await this.advanceAfterIngestion(projectId, userId);
        break;
      case "STORY_WRITING":
        {
          const [story] = await db
            .select()
            .from(stories)
            .where(eq(stories.projectId, projectId));
          if (story) {
            await this.advanceAfterStoryWriting(projectId, userId, story.id);
          }
        }
        break;
      case "SCENE_GENERATION":
        await this.advanceAfterSceneGeneration(projectId, userId);
        break;
      case "VISUAL_VERIFICATION":
        await this.advanceAfterVisualsApproved(projectId, userId);
        break;
      case "TTS_GENERATION":
        await this.advanceAfterTTS(projectId, userId);
        break;
      case "AUDIO_MIXING":
        await this.advanceAfterAudioMixing(projectId, userId);
        break;
      default:
        console.warn(
          `[Pipeline] Unknown stage: ${completedStage} for ${projectId}`
        );
    }
  }
}

export const pipelineOrchestrator = new PipelineOrchestrator();
