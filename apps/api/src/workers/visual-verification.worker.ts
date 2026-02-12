import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, addVisualGenerationJob } from "@contenthq/queue";
import type { VisualVerificationJobData } from "@contenthq/queue";
import { verifyImage, resolvePromptForStage, executeAgent } from "@contenthq/ai";
import type { VerificationResult } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";

export function createVisualVerificationWorker(): Worker {
  return new Worker<VisualVerificationJobData>(
    QUEUE_NAMES.VISUAL_VERIFICATION,
    async (job) => {
      const { projectId, sceneId, userId, imageUrl, visualDescription, agentId } = job.data;
      const startedAt = new Date();
      console.warn(`[VisualVerification] Processing job ${job.id} for scene ${sceneId}`);

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "VISUAL_VERIFICATION"),
              eq(generationJobs.status, "queued")
            )
          );

        await job.updateProgress(10);

        let result: VerificationResult;

        if (agentId) {
          // New path: use agent executor
          const agentResult = await executeAgent({
            agentId,
            variables: {
              imageUrl,
              sceneDescription: visualDescription,
            },
            projectId,
            userId,
            db,
          });
          result = agentResult.data as VerificationResult;
        } else {
          // Existing path: resolve verification prompt + call verifyImage
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

          result = await verifyImage(imageUrl, visualDescription, 60, customPrompt);
        }

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

        // Update project status to verifying
        await db
          .update(projects)
          .set({ status: "verifying", progressPercent: 44, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        if (result.approved) {
          // Image passed verification
          await db
            .update(scenes)
            .set({ status: "visual_verified", updatedAt: new Date() })
            .where(eq(scenes.id, sceneId));

          const completedAt = new Date();
          console.warn(
            `[VisualVerification] Approved for scene ${sceneId} (score: ${result.totalScore})`
          );

          // Mark generationJob as completed
          await db
            .update(generationJobs)
            .set({
              status: "completed",
              progressPercent: 100,
              result: {
                approved: true,
                score: result.totalScore,
                log: {
                  stage: "VISUAL_VERIFICATION",
                  status: "completed",
                  startedAt: startedAt.toISOString(),
                  completedAt: completedAt.toISOString(),
                  durationMs: completedAt.getTime() - startedAt.getTime(),
                  details: `Approved scene ${sceneId} (score: ${result.totalScore})`,
                },
              },
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(generationJobs.projectId, projectId),
                eq(generationJobs.jobType, "VISUAL_VERIFICATION"),
                eq(generationJobs.status, "processing")
              )
            );

          // Advance pipeline (only when approved — all scenes must be verified)
          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "VISUAL_VERIFICATION");
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

          if (!visual) {
            await db
              .update(scenes)
              .set({ status: "failed", updatedAt: new Date() })
              .where(eq(scenes.id, sceneId));
            throw new Error(`No visual record found for scene ${sceneId}`);
          }

          const retryCount = visual.retryCount ?? 0;

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

            const completedAt = new Date();

            // Mark generationJob as failed
            await db
              .update(generationJobs)
              .set({
                status: "failed",
                result: {
                  approved: false,
                  score: result.totalScore,
                  log: {
                    stage: "VISUAL_VERIFICATION",
                    status: "failed",
                    startedAt: startedAt.toISOString(),
                    completedAt: completedAt.toISOString(),
                    durationMs: completedAt.getTime() - startedAt.getTime(),
                    error: `Verification failed after ${retryCount + 1} attempts (score: ${result.totalScore})`,
                  },
                },
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(generationJobs.projectId, projectId),
                  eq(generationJobs.jobType, "VISUAL_VERIFICATION"),
                  eq(generationJobs.status, "processing")
                )
              );

            console.warn(
              `[VisualVerification] Failed for scene ${sceneId} after ${retryCount + 1} attempts (score: ${result.totalScore})`
            );
          }
        }

        await job.updateProgress(100);
        return { success: true, approved: result.approved, score: result.totalScore };
      } catch (error) {
        const completedAt = new Date();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[VisualVerification] Failed for scene ${sceneId}:`, error);

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "VISUAL_VERIFICATION",
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
              eq(generationJobs.jobType, "VISUAL_VERIFICATION"),
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
      concurrency: 10,
    }
  );
}
