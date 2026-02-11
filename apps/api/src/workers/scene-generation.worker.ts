import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { SceneGenerationJobData } from "@contenthq/queue";
import { generateTextContent, resolvePromptForStage, executeAgent } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export function createSceneGenerationWorker(): Worker {
  return new Worker<SceneGenerationJobData>(
    QUEUE_NAMES.SCENE_GENERATION,
    async (job) => {
      const { projectId, storyId, userId, agentId } = job.data;
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

        // Collect all scene updates first, then apply atomically
        const sceneUpdates: Array<{ sceneId: string; imagePrompt: string }> = [];

        for (const scene of projectScenes) {
          if (!scene.visualDescription) {
            processed++;
            continue;
          }

          let imagePrompt: string;

          if (agentId) {
            // New path: use agent executor
            const result = await executeAgent({
              agentId,
              variables: { visualDescription: scene.visualDescription },
              projectId,
              userId,
              db,
            });
            imagePrompt = result.data as string;
          } else {
            // Existing path: resolvePromptForStage + generateTextContent
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
            imagePrompt = result.content;
          }

          sceneUpdates.push({ sceneId: scene.id, imagePrompt });

          processed++;
          const progress = 20 + Math.round((processed / totalScenes) * 70);
          await job.updateProgress(progress);
        }

        // Apply all updates in a transaction so partial failures are rolled back
        await db.transaction(async (tx) => {
          for (const update of sceneUpdates) {
            await tx
              .update(scenes)
              .set({
                imagePrompt: update.imagePrompt,
                status: "scripted",
                updatedAt: new Date(),
              })
              .where(eq(scenes.id, update.sceneId));
          }
        });

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
