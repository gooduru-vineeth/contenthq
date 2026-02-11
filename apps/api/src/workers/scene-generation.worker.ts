import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, addVisualGenerationJob } from "@contenthq/queue";
import type { SceneGenerationJobData } from "@contenthq/queue";
import { generateTextContent, resolvePromptForStage } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export function createSceneGenerationWorker(): Worker {
  return new Worker<SceneGenerationJobData>(
    QUEUE_NAMES.SCENE_GENERATION,
    async (job) => {
      const { projectId, storyId, userId } = job.data;
      console.warn(`[SceneGeneration] Processing job ${job.id} for project ${projectId}`);

      try {
        // Update project status
        await db
          .update(projects)
          .set({ status: "generating_scenes", updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Fetch all scenes for the project
        const projectScenes = await db
          .select()
          .from(scenes)
          .where(eq(scenes.projectId, projectId));

        await job.updateProgress(20);

        const totalScenes = projectScenes.length;
        let processed = 0;

        // For each scene, generate a refined image prompt
        for (const scene of projectScenes) {
          if (!scene.visualDescription) {
            processed++;
            continue;
          }

          const { composedPrompt } = await resolvePromptForStage(
            db,
            projectId,
            userId,
            "image_refinement",
            { visualDescription: scene.visualDescription }
          );
          const result = await generateTextContent(composedPrompt, {
            temperature: 0.7,
            maxTokens: 500,
          });

          const imagePrompt = result.content;

          // Update scene with generated image prompt
          await db
            .update(scenes)
            .set({
              imagePrompt,
              status: "scripted",
              updatedAt: new Date(),
            })
            .where(eq(scenes.id, scene.id));

          // Queue visual generation for this scene
          await addVisualGenerationJob({
            projectId,
            sceneId: scene.id,
            userId,
            imagePrompt,
          });

          processed++;
          const progress = 20 + Math.round((processed / totalScenes) * 70);
          await job.updateProgress(progress);
        }

        await job.updateProgress(100);
        console.warn(
          `[SceneGeneration] Completed for project ${projectId}: ${processed} scenes processed`
        );

        return { success: true, storyId, scenesProcessed: processed };
      } catch (error) {
        console.error(`[SceneGeneration] Failed for project ${projectId}:`, error);
        await db
          .update(projects)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projects.id, projectId));
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );
}
