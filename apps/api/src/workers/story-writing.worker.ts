import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { StoryWritingJobData } from "@contenthq/queue";
import { generateStructuredContent, resolvePromptForStage } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { stories, scenes, ingestedContent, projects, aiGenerations } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

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
    })
  ),
});

export function createStoryWritingWorker(): Worker {
  return new Worker<StoryWritingJobData>(
    QUEUE_NAMES.STORY_WRITING,
    async (job) => {
      const { projectId, userId, tone, targetDuration } = job.data;
      console.warn(`[StoryWriting] Processing job ${job.id} for project ${projectId}`);

      try {
        // Update project status
        await db
          .update(projects)
          .set({ status: "writing", progressPercent: 15, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Fetch ingested content
        const content = await db
          .select()
          .from(ingestedContent)
          .where(eq(ingestedContent.projectId, projectId));

        const contentText = content.map((c) => `${c.title}\n${c.body}`).join("\n\n");
        await job.updateProgress(20);

        // Generate story via LLM using DB-based prompt
        const sceneCount = Math.max(3, Math.ceil(targetDuration / 8));
        const { composedPrompt, template } = await resolvePromptForStage(
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
        const result = await generateStructuredContent(composedPrompt, storyOutputSchema, {
          temperature: 0.7,
          maxTokens: 4000,
        });

        await job.updateProgress(70);

        const storyData = result.data;

        // Store story
        const [story] = await db
          .insert(stories)
          .values({
            projectId,
            title: storyData.title,
            hook: storyData.hook,
            synopsis: storyData.synopsis,
            narrativeArc: storyData.narrativeArc,
            sceneCount: storyData.scenes.length,
            aiModelUsed: result.model,
          })
          .returning();

        // Store scenes
        for (const sceneData of storyData.scenes) {
          await db.insert(scenes).values({
            storyId: story.id,
            projectId,
            index: sceneData.index,
            visualDescription: sceneData.visualDescription,
            narrationScript: sceneData.narrationScript,
            duration: sceneData.duration,
            status: "outlined",
          });
        }

        // Track prompt usage in ai_generations
        await db.insert(aiGenerations).values({
          userId,
          projectId,
          type: "story_writing",
          input: { tone, targetDuration, sceneCount },
          output: storyData,
          promptTemplateId: template.id,
          composedPrompt,
        });

        await job.updateProgress(100);

        // Update project
        await db
          .update(projects)
          .set({ status: "generating_scenes", progressPercent: 25, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        console.warn(
          `[StoryWriting] Completed: "${storyData.title}" with ${storyData.scenes.length} scenes`
        );
        return { success: true, storyId: story.id, sceneCount: storyData.scenes.length };
      } catch (error) {
        console.error(`[StoryWriting] Failed for project ${projectId}:`, error);
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
