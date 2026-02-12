import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { SceneGenerationJobData } from "@contenthq/queue";
import { generateTextContent, resolvePromptForStage, executeAgent } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";

export function createSceneGenerationWorker(): Worker {
  return new Worker<SceneGenerationJobData>(
    QUEUE_NAMES.SCENE_GENERATION,
    async (job) => {
      const { projectId, storyId, userId, agentId } = job.data;
      const startedAt = new Date();
      console.warn(`[SceneGeneration] Processing job ${job.id} for project ${projectId}, storyId=${storyId}, agentId=${agentId ?? "none"}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCENE_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

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

        console.warn(`[SceneGeneration] Found ${projectScenes.length} scene(s) for project ${projectId}, ${projectScenes.filter((s) => s.visualDescription).length} have visual descriptions`);
        await job.updateProgress(20);

        const totalScenes = projectScenes.length;
        let processed = 0;

        // Collect all scene updates first, then apply atomically
        const sceneUpdates: Array<{ sceneId: string; imagePrompt: string }> = [];

        for (const scene of projectScenes) {
          if (!scene.visualDescription) {
            console.warn(`[SceneGeneration] Skipping scene ${scene.id} (index=${scene.index}) — no visual description`);
            processed++;
            continue;
          }

          console.warn(`[SceneGeneration] Generating image prompt for scene ${scene.id} (index=${scene.index}, ${processed + 1}/${totalScenes})`);

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

        console.warn(`[SceneGeneration] Applied ${sceneUpdates.length} scene update(s) in transaction for project ${projectId}`);

        await job.updateProgress(100);
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(
          `[SceneGeneration] Completed for project ${projectId}: ${processed} scenes processed, ${sceneUpdates.length} image prompts generated (${durationMs}ms)`
        );

        // Update project progress
        await db
          .update(projects)
          .set({ progressPercent: 25, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              storyId,
              scenesProcessed: processed,
              log: {
                stage: "SCENE_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Processed ${processed} scenes`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCENE_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        // Advance pipeline to next stage
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "SCENE_GENERATION");

        return { success: true, storyId, scenesProcessed: processed };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SceneGeneration] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "SCENE_GENERATION",
                status: "failed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                error: errorMessage,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCENE_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

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
