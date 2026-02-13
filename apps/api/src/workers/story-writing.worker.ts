import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { StoryWritingJobData } from "@contenthq/queue";
import { generateStructuredContent, resolvePromptForStage, executeAgent } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { stories, scenes, ingestedContent, projects, aiGenerations, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";

const storyOutputSchema = z.object({
  title: z.string(),
  hook: z.string(),
  synopsis: z.string(),
  narrativeArc: z.object({
    setup: z.string(),
    risingAction: z.string(),
    climax: z.string(),
    resolution: z.string(),
  }),
  scenes: z.array(
    z.object({
      index: z.number(),
      visualDescription: z.string(),
      narrationScript: z.string(),
      duration: z.number(),
      motionSpec: z.object({
        type: z.string(),
        speed: z.number().optional(),
      }).optional(),
      transition: z.string().optional(),
    })
  ),
});

export function createStoryWritingWorker(): Worker {
  return new Worker<StoryWritingJobData>(
    QUEUE_NAMES.STORY_WRITING,
    async (job) => {
      const { projectId, userId, tone, targetDuration, agentId, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[StoryWriting] Processing job ${job.id} for project ${projectId}, tone=${tone}, targetDuration=${targetDuration}s, agentId=${agentId ?? "none"}, hasStageConfig=${!!stageConfig}`);

      // Apply stageConfig overrides if provided
      const effectiveAgentId = stageConfig?.agentId ?? agentId;
      const effectiveTemperature = stageConfig?.temperature ?? 0.7;
      const effectiveMaxTokens = stageConfig?.maxTokens ?? 4000;

      try {
        // Mark generationJob as processing
        console.warn(`[StoryWriting] Marking generationJob as processing for project ${projectId}`);
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "STORY_WRITING"),
              eq(generationJobs.status, "queued")
            )
          );

        // Update project status
        await db
          .update(projects)
          .set({ status: "writing", progressPercent: 12, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Fetch ingested content
        const content = await db
          .select()
          .from(ingestedContent)
          .where(eq(ingestedContent.projectId, projectId));

        console.warn(`[StoryWriting] Fetched ${content.length} ingested content item(s) for project ${projectId}, total text length=${content.reduce((sum, c) => sum + (c.title?.length ?? 0) + (c.body?.length ?? 0), 0)} chars`);

        const contentText = content.map((c) => `${c.title}\n${c.body}`).join("\n\n");
        await job.updateProgress(20);

        const sceneCount = Math.max(3, Math.ceil(targetDuration / 8));
        console.warn(`[StoryWriting] Calculated sceneCount=${sceneCount} for targetDuration=${targetDuration}s`);

        let storyData: z.infer<typeof storyOutputSchema>;
        let templateId: string | undefined;
        let composedPrompt: string | undefined;
        let usedModel: string | undefined;

        if (effectiveAgentId) {
          // New path: use agent executor
          console.warn(`[StoryWriting] Using agent executor (agentId=${effectiveAgentId}) for project ${projectId}`);
          const result = await executeAgent({
            agentId: effectiveAgentId,
            variables: {
              content: contentText,
              tone,
              targetDuration: String(targetDuration),
              sceneCount: String(sceneCount),
            },
            projectId,
            userId,
            db,
          });
          storyData = result.data as z.infer<typeof storyOutputSchema>;
          usedModel = result.model;
          console.warn(`[StoryWriting] Agent execution complete: provider=${result.provider}, model=${result.model}, inputTokens=${result.tokens.input}, outputTokens=${result.tokens.output}, durationMs=${result.durationMs}`);
        } else {
          // Existing path: resolvePromptForStage + generateStructuredContent
          console.warn(`[StoryWriting] Using prompt template path for project ${projectId}`);
          const resolved = await resolvePromptForStage(
            db,
            projectId,
            userId,
            "story_writing",
            {
              content: contentText,
              tone,
              targetDuration: String(targetDuration),
              sceneCount: String(sceneCount),
            }
          );
          composedPrompt = resolved.composedPrompt;
          templateId = resolved.template.id;

          const result = await generateStructuredContent(composedPrompt, storyOutputSchema, {
            temperature: effectiveTemperature,
            maxTokens: effectiveMaxTokens,
            db,
            userId,
          });
          storyData = result.data;
          usedModel = result.model;
          console.warn(`[StoryWriting] LLM generation complete: provider=${result.provider}, model=${result.model}, inputTokens=${result.tokens.input}, outputTokens=${result.tokens.output}, temperature=${effectiveTemperature}, maxTokens=${effectiveMaxTokens}, promptTemplateId=${templateId ?? "none"}`);
        }

        await job.updateProgress(70);

        console.warn(`[StoryWriting] AI generation complete for project ${projectId}: title="${storyData.title}", ${storyData.scenes.length} scenes, model=${usedModel ?? "unknown"}`);

        // Store story and scenes in a transaction
        console.warn(`[StoryWriting] Storing story and ${storyData.scenes.length} scene(s) in database for project ${projectId}`);
        const story = await db.transaction(async (tx) => {
          const [s] = await tx
            .insert(stories)
            .values({
              projectId,
              title: storyData.title,
              hook: storyData.hook,
              synopsis: storyData.synopsis,
              narrativeArc: storyData.narrativeArc,
              sceneCount: storyData.scenes.length,
              aiModelUsed: usedModel,
            })
            .returning();

          for (const sceneData of storyData.scenes) {
            await tx.insert(scenes).values({
              storyId: s.id,
              projectId,
              index: sceneData.index,
              visualDescription: sceneData.visualDescription,
              narrationScript: sceneData.narrationScript,
              duration: sceneData.duration,
              status: "outlined",
              ...(sceneData.motionSpec && { motionSpec: sceneData.motionSpec }),
              ...(sceneData.transition && { transitions: sceneData.transition }),
            });
          }

          return s;
        });

        // Track prompt usage in ai_generations (only for non-agent path, agent executor records its own)
        if (!effectiveAgentId && composedPrompt) {
          await db.insert(aiGenerations).values({
            userId,
            projectId,
            type: "story_writing",
            input: { tone, targetDuration, sceneCount },
            output: storyData,
            promptTemplateId: templateId,
            composedPrompt,
          });
        }

        await job.updateProgress(100);

        // Update project
        await db
          .update(projects)
          .set({ status: "generating_scenes", progressPercent: 25, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        console.warn(
          `[StoryWriting] Completed for project ${projectId}: "${storyData.title}" with ${storyData.scenes.length} scenes, storyId=${story.id}, model=${usedModel ?? "unknown"} (${durationMs}ms)`
        );

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              storyId: story.id,
              sceneCount: storyData.scenes.length,
              log: {
                stage: "STORY_WRITING",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Generated "${storyData.title}" with ${storyData.scenes.length} scenes`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "STORY_WRITING"),
              eq(generationJobs.status, "processing")
            )
          );

        // Advance pipeline to next stage
        console.warn(`[StoryWriting] Advancing pipeline after story writing for project ${projectId}`);
        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "STORY_WRITING");

        return { success: true, storyId: story.id, sceneCount: storyData.scenes.length };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[StoryWriting] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "STORY_WRITING",
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
              eq(generationJobs.jobType, "STORY_WRITING"),
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
