import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { ScriptGenerationJobData } from "@contenthq/queue";
import { generateStructuredContent, resolvePromptForStage, executeAgent } from "@contenthq/ai";
import { db } from "@contenthq/db/client";
import { scripts, projects, ingestedContent, aiGenerations, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { creditService, type CostBreakdownOpts } from "../services/credit.service";
import { costCalculationService } from "../services/cost-calculation.service";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

const scriptOutputSchema = z.object({
  title: z.string(),
  hook: z.string(),
  synopsis: z.string(),
  narrativeArc: z.object({
    setup: z.string(),
    risingAction: z.string(),
    climax: z.string(),
    resolution: z.string(),
  }),
  fullScript: z.string(),
  wordCount: z.number(),
  estimatedDurationSec: z.number(),
});

export function createScriptGenerationWorker(): Worker {
  return new Worker<ScriptGenerationJobData>(
    QUEUE_NAMES.SCRIPT_GENERATION,
    async (job) => {
      const { projectId, userId, tone, targetDuration, language, agentId, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[ScriptGeneration] Processing job ${job.id} for project ${projectId}, tone=${tone}, targetDuration=${targetDuration}s`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[ScriptGeneration] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      const effectiveAgentId = stageConfig?.agentId ?? agentId;
      const effectiveTemperature = stageConfig?.temperature ?? 0.7;
      const effectiveMaxTokens = stageConfig?.maxTokens ?? 6000;

      try {
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCRIPT_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

        await db
          .update(projects)
          .set({ status: "generating_script", progressPercent: 12, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Fetch ingested content
        const content = await db
          .select()
          .from(ingestedContent)
          .where(eq(ingestedContent.projectId, projectId));

        const contentText = content.map((c) => `${c.title}\n${c.body}`).join("\n\n");
        await job.updateProgress(20);

        let scriptData: z.infer<typeof scriptOutputSchema>;
        let templateId: string | undefined;
        let composedPrompt: string | undefined;
        let usedModel: string | undefined;
        let usedProvider: string | undefined;
        let tokenUsage: { input: number; output: number } | undefined;

        if (effectiveAgentId) {
          const result = await executeAgent({
            agentId: effectiveAgentId,
            variables: {
              content: contentText,
              tone,
              targetDuration: String(targetDuration),
              language: language ?? "en",
            },
            projectId,
            userId,
            db,
          });
          scriptData = result.data as z.infer<typeof scriptOutputSchema>;
          usedModel = result.model;
          usedProvider = result.provider;
          tokenUsage = result.tokens;
        } else {
          const resolved = await resolvePromptForStage(
            db,
            projectId,
            userId,
            "script_generation",
            {
              content: contentText,
              tone,
              targetDuration: String(targetDuration),
              language: language ?? "en",
            }
          );
          composedPrompt = resolved.composedPrompt;
          templateId = resolved.template.id;

          const result = await generateStructuredContent(composedPrompt, scriptOutputSchema, {
            temperature: effectiveTemperature,
            maxTokens: effectiveMaxTokens,
            db,
            userId,
          });
          scriptData = result.data;
          usedModel = result.model;
          usedProvider = result.provider;
          tokenUsage = result.tokens;
        }

        await job.updateProgress(70);

        // Store script in database
        const [script] = await db
          .insert(scripts)
          .values({
            projectId,
            title: scriptData.title,
            hook: scriptData.hook,
            synopsis: scriptData.synopsis,
            narrativeArc: scriptData.narrativeArc,
            fullScript: scriptData.fullScript,
            wordCount: scriptData.wordCount,
            estimatedDurationSec: scriptData.estimatedDurationSec,
            language: language ?? "en",
            aiModelUsed: usedModel,
          })
          .returning();

        // Track prompt usage
        if (!effectiveAgentId && composedPrompt) {
          await db.insert(aiGenerations).values({
            userId,
            projectId,
            type: "script_generation",
            input: { tone, targetDuration, language },
            output: scriptData,
            promptTemplateId: templateId,
            composedPrompt,
          });
        }

        await job.updateProgress(100);

        // Deduct credits
        try {
          const credits = costCalculationService.getOperationCredits("STORY_WRITING", { model: usedModel });
          const costData: CostBreakdownOpts | undefined = tokenUsage
            ? {
                inputTokens: tokenUsage.input,
                outputTokens: tokenUsage.output,
                billedCostCredits: String(credits),
                costBreakdown: {
                  stage: "SCRIPT_GENERATION",
                  provider: usedProvider,
                  model: usedModel,
                  inputTokens: tokenUsage.input,
                  outputTokens: tokenUsage.output,
                },
              }
            : undefined;
          await creditService.deductCredits(userId, credits, `Script generation for project ${projectId}`, {
            projectId,
            operationType: "SCRIPT_GENERATION",
            provider: usedProvider,
            model: usedModel,
            jobId: job.id,
            costBreakdown: costData,
          });
        } catch (err) {
          console.warn(`[ScriptGeneration] Credit deduction failed (non-fatal):`, err);
        }

        await db
          .update(projects)
          .set({ status: "generating_tts", progressPercent: 25, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              scriptId: script.id,
              log: {
                stage: "SCRIPT_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs,
                details: `Generated "${scriptData.title}" (${scriptData.wordCount} words)`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCRIPT_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        console.warn(`[ScriptGeneration] Completed for project ${projectId}: "${scriptData.title}", ${scriptData.wordCount} words (${durationMs}ms)`);

        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "SCRIPT_GENERATION");

        return { success: true, scriptId: script.id };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ScriptGeneration] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "SCRIPT_GENERATION",
                status: "failed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs,
                error: errorMessage,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "SCRIPT_GENERATION"),
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
