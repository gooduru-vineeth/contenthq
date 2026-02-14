import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { CaptionGenerationJobData } from "@contenthq/queue";
import { db } from "@contenthq/db/client";
import { scenes, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and, or } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { creditService } from "../services/credit.service";
import { costCalculationService } from "../services/cost-calculation.service";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";
import { STAGE_PROGRESS_PERCENT } from "@contenthq/shared";

interface CaptionWord {
  word: string;
  startMs: number;
  endMs: number;
}

interface CaptionSegment {
  text: string;
  startMs: number;
  endMs: number;
  words: CaptionWord[];
}

interface CaptionData {
  segments: CaptionSegment[];
  style: {
    font: string;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    position: string;
    highlightMode: string;
    highlightColor: string;
    wordsPerLine: number;
  };
}

const DEFAULT_MS_PER_WORD = 300;

function generateCaptionData(
  narrationScript: string,
  stageConfig?: CaptionGenerationJobData["stageConfig"]
): CaptionData {
  const wordsPerLine = stageConfig?.wordsPerLine ?? 5;
  const font = stageConfig?.font ?? "Arial";
  const fontSize = stageConfig?.fontSize ?? 48;
  const fontColor = stageConfig?.fontColor ?? "#FFFFFF";
  const backgroundColor = stageConfig?.backgroundColor ?? "rgba(0,0,0,0.6)";
  const position = stageConfig?.position ?? "bottom";
  const highlightMode = stageConfig?.highlightMode ?? "word";
  const highlightColor = stageConfig?.highlightColor ?? "#FFD700";

  // Split narration into words
  const words = narrationScript.trim().split(/\s+/).filter(Boolean);
  const allWordTimings: CaptionWord[] = [];

  let currentMs = 0;
  for (const word of words) {
    const wordDurationMs = DEFAULT_MS_PER_WORD;
    allWordTimings.push({
      word,
      startMs: currentMs,
      endMs: currentMs + wordDurationMs,
    });
    currentMs += wordDurationMs;
  }

  // Group words into segments by wordsPerLine
  const segments: CaptionSegment[] = [];
  for (let i = 0; i < allWordTimings.length; i += wordsPerLine) {
    const segmentWords = allWordTimings.slice(i, i + wordsPerLine);
    if (segmentWords.length === 0) continue;

    segments.push({
      text: segmentWords.map((w) => w.word).join(" "),
      startMs: segmentWords[0].startMs,
      endMs: segmentWords[segmentWords.length - 1].endMs,
      words: segmentWords,
    });
  }

  return {
    segments,
    style: {
      font,
      fontSize,
      fontColor,
      backgroundColor,
      position,
      highlightMode,
      highlightColor,
      wordsPerLine,
    },
  };
}

export function createCaptionGenerationWorker(): Worker {
  return new Worker<CaptionGenerationJobData>(
    QUEUE_NAMES.CAPTION_GENERATION,
    async (job) => {
      const { projectId, sceneId, userId, narrationScript, audioUrl, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(
        `[CaptionGeneration] Processing job ${job.id} for scene ${sceneId}, projectId=${projectId}, scriptLength=${narrationScript?.length ?? 0} chars, audioUrl=${audioUrl ? "present" : "missing"}`
      );

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[CaptionGeneration] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        // Mark generationJob as processing
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "CAPTION_GENERATION"),
              eq(generationJobs.status, "queued")
            )
          );

        // Update project status
        await db
          .update(projects)
          .set({
            status: "generating_captions",
            progressPercent: STAGE_PROGRESS_PERCENT["CAPTION_GENERATION"] ?? 80,
            updatedAt: new Date()
          })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Generate caption data from narration script
        // In the future, if audioUrl is available, we could use an STT service
        // for more accurate word-level timing. For now, we estimate timing.
        console.warn(
          `[CaptionGeneration] Generating caption segments for scene ${sceneId} (wordsPerLine=${stageConfig?.wordsPerLine ?? 5})`
        );

        const captionData = generateCaptionData(narrationScript, stageConfig);

        await job.updateProgress(70);

        console.warn(
          `[CaptionGeneration] Generated ${captionData.segments.length} caption segment(s) for scene ${sceneId}, totalDurationMs=${captionData.segments.length > 0 ? captionData.segments[captionData.segments.length - 1].endMs : 0}`
        );

        // Update scene status to caption_generated
        await db
          .update(scenes)
          .set({ status: "caption_generated", updatedAt: new Date() })
          .where(eq(scenes.id, sceneId));

        await job.updateProgress(90);

        // Deduct credits for caption generation with cost breakdown
        try {
          const credits = costCalculationService.getOperationCredits("CAPTION_GENERATION");
          await creditService.deductCredits(userId, credits, `Caption generation for scene ${sceneId}`, {
            projectId,
            operationType: "CAPTION_GENERATION",
            jobId: job.id,
            costBreakdown: {
              billedCostCredits: String(credits),
              costBreakdown: { stage: "CAPTION_GENERATION" },
            },
          });
        } catch (err) {
          console.warn(`[CaptionGeneration] Credit deduction failed (non-fatal):`, err);
        }

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        // Mark generationJob as completed with caption data in result
        // Format captions for video assembly worker compatibility
        const captionsForAssembly = captionData.segments.map((seg) => ({
          text: seg.text,
          startTime: seg.startMs,
          endTime: seg.endMs,
          wordTimings: seg.words.map((w) => ({
            word: w.word,
            start: w.startMs,
            end: w.endMs,
          })),
        }));

        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              sceneId,
              captions: captionsForAssembly, // Use "captions" key for assembly worker compatibility
              captionData, // Keep original captionData for reference
              segmentCount: captionData.segments.length,
              log: {
                stage: "CAPTION_GENERATION",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs,
                details: `Generated ${captionData.segments.length} caption segments for scene ${sceneId}`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "CAPTION_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        await job.updateProgress(100);
        console.warn(
          `[CaptionGeneration] Completed for scene ${sceneId}: ${captionData.segments.length} segments (${durationMs}ms)`
        );

        // Check if all caption jobs for this project are complete
        const remainingCaptions = await db
          .select({ id: generationJobs.id })
          .from(generationJobs)
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "CAPTION_GENERATION"),
              or(
                eq(generationJobs.status, "pending"),
                eq(generationJobs.status, "processing"),
                eq(generationJobs.status, "queued")
              )
            )
          )
          .limit(1);

        if (remainingCaptions.length === 0) {
          // All caption jobs complete - trigger pipeline advancement
          console.warn(`[CaptionGen] All caption jobs complete for project ${projectId}, advancing to assembly`);
          await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "CAPTION_GENERATION");
        } else {
          console.warn(`[CaptionGen] Caption job complete for scene ${sceneId}, but other caption jobs still pending for project ${projectId}`);
        }

        return { success: true, segmentCount: captionData.segments.length };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `[CaptionGeneration] Failed for scene ${sceneId} after ${durationMs}ms:`,
          errorMessage
        );

        // Mark generationJob as failed
        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "CAPTION_GENERATION",
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
              eq(generationJobs.jobType, "CAPTION_GENERATION"),
              eq(generationJobs.status, "processing")
            )
          );

        // Mark project as failed
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
