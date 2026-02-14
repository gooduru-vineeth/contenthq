import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { SceneGenerationJobData } from "@contenthq/queue";
import { generateTextContent, resolvePromptForStage, executeAgent, truncateForLog, getAudioSceneGenerationPrompt } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, projects, projectAudioTranscripts, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createSceneGenerationWorker(): Worker {
  return new Worker<SceneGenerationJobData>(
    QUEUE_NAMES.SCENE_GENERATION,
    async (job) => {
      const { projectId, storyId, userId, agentId, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[SceneGeneration] Processing job ${job.id} for project ${projectId}, storyId=${storyId}, agentId=${agentId ?? "none"}, hasStageConfig=${!!stageConfig}`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[SceneGeneration] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      // Apply stageConfig overrides if provided
      const effectiveAgentId = stageConfig?.agentId ?? agentId;
      const visualStyle = stageConfig?.visualStyle;
      const imagePromptStyle = stageConfig?.imagePromptStyle;

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
          .set({ status: "generating_scenes", progressPercent: 45, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // NEW PATH: Audio-driven scene generation (when transcriptId is present)
        if (job.data.transcriptId) {
          const { transcriptId, averageSceneDurationSec, scriptId } = job.data;
          console.warn(`[SceneGeneration] Audio-driven path: transcriptId=${transcriptId}, averageSceneDurationSec=${averageSceneDurationSec ?? 7}`);

          // Fetch transcript words
          const [transcript] = await db
            .select()
            .from(projectAudioTranscripts)
            .where(eq(projectAudioTranscripts.id, transcriptId));

          if (!transcript?.words) {
            throw new Error(`Transcript ${transcriptId} not found or has no words`);
          }

          const words = transcript.words as Array<{ word: string; startMs: number; endMs: number }>;
          console.warn(`[SceneGeneration] Loaded ${words.length} timestamped words from transcript`);

          await job.updateProgress(20);

          // Generate scene breakdown from timestamped transcript
          const prompt = getAudioSceneGenerationPrompt(
            words,
            averageSceneDurationSec ?? 7,
            visualStyle ?? "photorealistic",
            imagePromptStyle ?? undefined,
          );

          console.warn(`[SceneGeneration] Calling LLM for audio-driven scene breakdown`);
          const result = await generateTextContent(prompt, {
            temperature: 0.7,
            maxTokens: 8000,
            db,
            userId,
          });

          await job.updateProgress(60);

          let sceneData: {
            scenes: Array<{
              index: number;
              startMs: number;
              endMs: number;
              narrationScript: string;
              visualDescription: string;
              imagePrompt: string;
              motionSpec: { type: string; speed: number };
              transition: string;
            }>;
          };

          try {
            sceneData = JSON.parse(result.content);
          } catch {
            throw new Error(`Failed to parse AI scene output as JSON: ${result.content.substring(0, 200)}`);
          }

          console.warn(`[SceneGeneration] AI generated ${sceneData.scenes.length} scenes from transcript`);

          // Insert scenes into database
          await db.transaction(async (tx) => {
            for (const scene of sceneData.scenes) {
              await tx.insert(scenes).values({
                projectId,
                scriptId: scriptId ?? null,
                index: scene.index,
                startMs: scene.startMs,
                endMs: scene.endMs,
                narrationScript: scene.narrationScript,
                visualDescription: scene.visualDescription,
                imagePrompt: scene.imagePrompt,
                duration: (scene.endMs - scene.startMs) / 1000,
                status: "scripted",
                motionSpec: scene.motionSpec,
                transitions: scene.transition,
              });
            }
          });

          await job.updateProgress(100);
          const completedAt = new Date();
          const durationMs = completedAt.getTime() - startedAt.getTime();
          console.warn(`[SceneGeneration] Audio-driven complete for project ${projectId}: ${sceneData.scenes.length} scenes (${durationMs}ms)`);

          await db.update(projects).set({ progressPercent: 50, updatedAt: new Date() }).where(eq(projects.id, projectId));

          await db.update(generationJobs).set({
            status: "completed",
            progressPercent: 100,
            result: {
              transcriptId,
              scenesCreated: sceneData.scenes.length,
              log: {
                stage: "SCENE_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs,
                details: `Audio-driven: created ${sceneData.scenes.length} scenes from transcript`,
              },
            },
            updatedAt: new Date(),
          }).where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCENE_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "SCENE_GENERATION");
          return { success: true, transcriptId, scenesCreated: sceneData.scenes.length };
        }

        // LEGACY PATH: Story-based scene generation
        // Fetch all scenes for the project
        const projectScenes = await db
          .select()
          .from(scenes)
          .where(eq(scenes.projectId, projectId));

        console.warn(`[SceneGeneration] Found ${projectScenes.length} scene(s) for project ${projectId}, ${projectScenes.filter((s) => s.visualDescription).length} have visual descriptions`);
        await job.updateProgress(20);

        // Check if all scenes already have imagePrompts from story writing (consolidated call)
        const forceRegeneration = stageConfig?.forceRegeneration ?? false;
        const scenesNeedingPrompts = forceRegeneration
          ? projectScenes.filter((s) => s.visualDescription)
          : projectScenes.filter((s) => s.visualDescription && !s.imagePrompt);

        if (scenesNeedingPrompts.length === 0 && projectScenes.some((s) => s.imagePrompt)) {
          console.warn(`[SceneGeneration] All ${projectScenes.length} scenes already have imagePrompts from story writing. Skipping AI calls.`);

          // Mark job as completed
          await job.updateProgress(100);
          const completedAt = new Date();
          const durationMs = completedAt.getTime() - startedAt.getTime();

          await db.update(projects).set({ progressPercent: 25, updatedAt: new Date() }).where(eq(projects.id, projectId));

          await db.update(generationJobs).set({
            status: "completed",
            progressPercent: 100,
            result: {
              storyId,
              scenesProcessed: projectScenes.length,
              skippedReason: "image_prompts_from_story",
              log: {
                stage: "SCENE_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs,
                details: `Skipped — all ${projectScenes.length} scenes have imagePrompts from story writing`,
              },
            },
            updatedAt: new Date(),
          }).where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCENE_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "SCENE_GENERATION");
          return { success: true, storyId, scenesProcessed: projectScenes.length, skippedReason: "image_prompts_from_story" };
        }

        const totalScenes = scenesNeedingPrompts.length;
        let processed = 0;

        console.warn(`[SceneGeneration] ${totalScenes} scene(s) need image prompt generation (${projectScenes.length - totalScenes} already have prompts)`);

        // Collect all scene updates first, then apply atomically
        const sceneUpdates: Array<{ sceneId: string; imagePrompt: string }> = [];

        for (const scene of scenesNeedingPrompts) {
          if (!scene.visualDescription) {
            console.warn(`[SceneGeneration] Skipping scene ${scene.id} (index=${scene.index}) — no visual description`);
            processed++;
            continue;
          }

          console.warn(`[SceneGeneration] Generating image prompt for scene ${scene.id} (index=${scene.index}, ${processed + 1}/${totalScenes})`);

          let imagePrompt: string;

          if (effectiveAgentId) {
            // New path: use agent executor
            const result = await executeAgent({
              agentId: effectiveAgentId,
              variables: { visualDescription: scene.visualDescription, visualStyle: visualStyle ?? "", imagePromptStyle: imagePromptStyle ?? "" },
              projectId,
              userId,
              db,
            });
            imagePrompt = result.data as string;
            console.warn(`[SceneGeneration] Agent generated prompt for scene ${scene.id}: agentId=${effectiveAgentId}, imagePrompt="${truncateForLog(imagePrompt, 200)}"`);
          } else {
            // Existing path: resolvePromptForStage + generateTextContent
            const { composedPrompt } = await resolvePromptForStage(
              db,
              projectId,
              userId,
              "image_refinement",
              { visualDescription: scene.visualDescription }
            );
            console.warn(`[SceneGeneration] Prompt template resolved: templateType=image_refinement, composedPromptLength=${composedPrompt.length}`);
            const result = await generateTextContent(composedPrompt, {
              temperature: 0.7,
              maxTokens: 500,
              db,
              userId,
            });
            imagePrompt = result.content;
            console.warn(`[SceneGeneration] LLM generated prompt for scene ${scene.id}: provider=${result.provider}, model=${result.model}, inputTokens=${result.tokens.input}, outputTokens=${result.tokens.output}, imagePrompt="${truncateForLog(imagePrompt, 200)}"`);
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
