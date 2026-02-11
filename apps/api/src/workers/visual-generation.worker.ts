import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, addVisualVerificationJob } from "@contenthq/queue";
import type { VisualGenerationJobData } from "@contenthq/queue";
import { generateImage } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals, projects } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

export function createVisualGenerationWorker(): Worker {
  return new Worker<VisualGenerationJobData>(
    QUEUE_NAMES.VISUAL_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, imagePrompt } = job.data;
      console.warn(`[VisualGeneration] Processing job ${job.id} for scene ${sceneId}`);

      try {
        await job.updateProgress(10);

        // Generate image using AI
        const result = await generateImage({
          prompt: imagePrompt,
          size: "1024x1024",
          quality: "standard",
        });

        await job.updateProgress(60);

        // Fetch the scene to get visualDescription for verification
        const [scene] = await db
          .select()
          .from(scenes)
          .where(eq(scenes.id, sceneId));

        // Store generated visual in database
        await db.insert(sceneVisuals).values({
          sceneId,
          imageUrl: result.url,
          prompt: imagePrompt,
        });

        // Update scene status
        await db
          .update(scenes)
          .set({ status: "visual_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(80);

        // Queue visual verification
        await addVisualVerificationJob({
          projectId,
          sceneId,
          userId,
          imageUrl: result.url,
          visualDescription: scene?.visualDescription ?? imagePrompt,
        });

        await job.updateProgress(100);
        console.warn(`[VisualGeneration] Completed for scene ${sceneId}`);

        return { success: true, imageUrl: result.url };
      } catch (error) {
        console.error(`[VisualGeneration] Failed for scene ${sceneId}:`, error);
        await db
          .update(projects)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projects.id, projectId));
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 5,
    }
  );
}
