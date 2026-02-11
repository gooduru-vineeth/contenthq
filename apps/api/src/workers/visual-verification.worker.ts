import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, addVisualGenerationJob } from "@contenthq/queue";
import type { VisualVerificationJobData } from "@contenthq/queue";
import { verifyImage, resolvePromptForStage } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals, projects } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";

export function createVisualVerificationWorker(): Worker {
  return new Worker<VisualVerificationJobData>(
    QUEUE_NAMES.VISUAL_VERIFICATION,
    async (job) => {
      const { projectId, sceneId, userId, imageUrl, visualDescription } = job.data;
      console.warn(`[VisualVerification] Processing job ${job.id} for scene ${sceneId}`);

      try {
        await job.updateProgress(10);

        // Resolve verification prompt from DB
        let customPrompt: string | undefined;
        try {
          const resolved = await resolvePromptForStage(
            db,
            projectId,
            userId,
            "visual_verification",
            { sceneDescription: visualDescription }
          );
          customPrompt = resolved.composedPrompt;
        } catch {
          // If no template exists yet, verifyImage falls back to its built-in prompt
        }

        // Verify the generated image against the scene description
        const result = await verifyImage(imageUrl, visualDescription, 60, customPrompt);

        await job.updateProgress(60);

        // Update the sceneVisual record with verification results
        await db
          .update(sceneVisuals)
          .set({
            verified: result.approved,
            verificationScore: result.totalScore,
            verificationDetails: {
              relevance: result.relevance,
              quality: result.quality,
              consistency: result.consistency,
              safety: result.safety,
              feedback: result.feedback,
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(sceneVisuals.sceneId, sceneId),
              eq(sceneVisuals.imageUrl, imageUrl)
            )
          );

        await job.updateProgress(80);

        if (result.approved) {
          // Image passed verification
          await db
            .update(scenes)
            .set({ status: "visual_verified", updatedAt: new Date() })
            .where(eq(scenes.id, sceneId));

          console.warn(
            `[VisualVerification] Approved for scene ${sceneId} (score: ${result.totalScore})`
          );
        } else {
          // Image failed verification - check retry count
          const [visual] = await db
            .select()
            .from(sceneVisuals)
            .where(
              and(
                eq(sceneVisuals.sceneId, sceneId),
                eq(sceneVisuals.imageUrl, imageUrl)
              )
            );

          const retryCount = visual?.retryCount ?? 0;

          if (retryCount < 3) {
            // Increment retry count and re-queue visual generation
            await db
              .update(sceneVisuals)
              .set({ retryCount: retryCount + 1, updatedAt: new Date() })
              .where(eq(sceneVisuals.id, visual.id));

            // Fetch the scene to get imagePrompt for regeneration
            const [scene] = await db
              .select()
              .from(scenes)
              .where(eq(scenes.id, sceneId));

            await addVisualGenerationJob({
              projectId,
              sceneId,
              userId,
              imagePrompt: scene?.imagePrompt ?? visualDescription,
            });

            console.warn(
              `[VisualVerification] Rejected for scene ${sceneId} (score: ${result.totalScore}), retry ${retryCount + 1}/3`
            );
          } else {
            // Max retries exceeded
            await db
              .update(scenes)
              .set({ status: "failed", updatedAt: new Date() })
              .where(eq(scenes.id, sceneId));

            console.warn(
              `[VisualVerification] Failed for scene ${sceneId} after ${retryCount + 1} attempts (score: ${result.totalScore})`
            );
          }
        }

        await job.updateProgress(100);
        return { success: true, approved: result.approved, score: result.totalScore };
      } catch (error) {
        console.error(`[VisualVerification] Failed for scene ${sceneId}:`, error);
        await db
          .update(projects)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(projects.id, projectId));
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 10,
    }
  );
}
