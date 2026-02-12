import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, addVisualVerificationJob } from "@contenthq/queue";
import type { VisualGenerationJobData } from "@contenthq/queue";
import { generateImage, executeAgent } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";

export function createVisualGenerationWorker(): Worker {
  return new Worker<VisualGenerationJobData>(
    QUEUE_NAMES.VISUAL_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, imagePrompt, agentId } = job.data;
      const startedAt = new Date();
      console.warn(`[VisualGeneration] Processing job ${job.id} for scene ${sceneId}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VISUAL_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

        await job.updateProgress(10);

        let imageUrl: string;

        if (agentId) {
          // New path: use agent executor
          const result = await executeAgent({
            agentId,
            variables: { prompt: imagePrompt },
            projectId,
            userId,
            db,
          });
          const resultData = result.data as { url: string };
          imageUrl = resultData.url;
        } else {
          // Existing path: generate image directly
          const result = await generateImage({
            prompt: imagePrompt,
            size: "1024x1024",
            quality: "standard",
          });
          imageUrl = result.url;
        }

        await job.updateProgress(60);

        // Fetch the scene to get visualDescription for verification
        const [scene] = await db
          .select()
          .from(scenes)
          .where(eq(scenes.id, sceneId));

        // Store generated visual in database
        await db.insert(sceneVisuals).values({
          sceneId,
          imageUrl,
          prompt: imagePrompt,
        });

        // Update scene status
        await db
          .update(scenes)
          .set({ status: "visual_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(80);

        // Create generationJob record for verification stage
        await db.insert(generationJobs).values({
          userId,
          projectId,
          jobType: "VISUAL_VERIFICATION",
          status: "queued",
        });

        // Queue visual verification
        await addVisualVerificationJob({
          projectId,
          sceneId,
          userId,
          imageUrl,
          visualDescription: scene?.visualDescription ?? imagePrompt,
        });

        await job.updateProgress(100);
        const completedAt = new Date();
        console.warn(`[VisualGeneration] Completed for scene ${sceneId}`);

        // Update project status to generating_visuals
        await db
          .update(projects)
          .set({ status: "generating_visuals", updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        // Mark generationJob as completed
        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              imageUrl,
              log: {
                stage: "VISUAL_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs: completedAt.getTime() - startedAt.getTime(),
                details: `Generated visual for scene ${sceneId}`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VISUAL_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        return { success: true, imageUrl };
      } catch (error) {
        const completedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VisualGeneration] Failed for scene ${sceneId}:`, error);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "VISUAL_GENERATION",
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
              eq(generationJobs.jobType, "VISUAL_GENERATION"),
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
      concurrency: 5,
    }
  );
}
