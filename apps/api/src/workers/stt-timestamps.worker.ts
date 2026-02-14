import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@contenthq/queue";
import type { STTTimestampsJobData } from "@contenthq/queue";
import { transcribeAudio } from "@contenthq/stt";
import { db } from "@contenthq/db/client";
import { projectAudioTranscripts, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { pipelineOrchestrator } from "../services/pipeline-orchestrator";
import { assertProjectActive, ProjectDeletedError } from "./utils/check-project";

export function createSTTTimestampsWorker(): Worker {
  return new Worker<STTTimestampsJobData>(
    QUEUE_NAMES.STT_TIMESTAMPS,
    async (job) => {
      const { projectId, userId, projectAudioId, audioUrl, language, stageConfig } = job.data;
      const startedAt = new Date();
      console.warn(`[STTTimestamps] Processing job ${job.id} for project ${projectId}, audioUrl=${audioUrl?.substring(0, 80)}`);

      try {
        await assertProjectActive(projectId);
      } catch (e) {
        if (e instanceof ProjectDeletedError) {
          console.warn(`[STTTimestamps] Skipping job ${job.id}: ${e.message}`);
          return { success: false, skipped: true };
        }
        throw e;
      }

      try {
        await db
          .update(generationJobs)
          .set({ status: "processing", updatedAt: new Date() })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "STT_TIMESTAMPS"),
              eq(generationJobs.status, "queued")
            )
          );

        await db
          .update(projects)
          .set({ status: "transcribing", progressPercent: 35, updatedAt: new Date() })
          .where(eq(projects.id, projectId));

        await job.updateProgress(10);

        // Download audio file
        console.warn(`[STTTimestamps] Downloading audio from ${audioUrl?.substring(0, 80)}`);
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
        }
        const audioBuffer = Buffer.from(await response.arrayBuffer());
        console.warn(`[STTTimestamps] Downloaded ${audioBuffer.length} bytes`);

        await job.updateProgress(30);

        // Run STT
        console.warn(`[STTTimestamps] Running Groq Whisper transcription...`);
        const result = await transcribeAudio(audioBuffer, {
          language: language ?? "en",
          provider: stageConfig?.provider ?? "groq",
          model: stageConfig?.model,
        });

        console.warn(`[STTTimestamps] Transcription complete: ${result.wordCount} words, ${result.totalDurationMs}ms duration, confidence=${result.confidence.toFixed(3)}`);

        await job.updateProgress(70);

        // Store transcript
        const [transcript] = await db
          .insert(projectAudioTranscripts)
          .values({
            projectId,
            projectAudioId,
            sttProvider: stageConfig?.provider ?? "groq",
            sttModel: stageConfig?.model ?? "whisper-large-v3-turbo",
            words: result.words,
            segments: result.segments,
            totalDurationMs: result.totalDurationMs,
            wordCount: result.wordCount,
            confidence: result.confidence,
            rawResponse: result.rawResponse,
          })
          .returning();

        await job.updateProgress(100);

        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();

        await db
          .update(generationJobs)
          .set({
            status: "completed",
            progressPercent: 100,
            result: {
              transcriptId: transcript.id,
              wordCount: result.wordCount,
              totalDurationMs: result.totalDurationMs,
              log: {
                stage: "STT_TIMESTAMPS",
                status: "completed",
                startedAt: startedAt.toISOString(),
                completedAt: completedAt.toISOString(),
                durationMs,
                details: `Transcribed ${result.wordCount} words, ${(result.totalDurationMs / 1000).toFixed(1)}s audio`,
              },
            },
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(generationJobs.projectId, projectId),
              eq(generationJobs.jobType, "STT_TIMESTAMPS"),
              eq(generationJobs.status, "processing")
            )
          );

        console.warn(`[STTTimestamps] Completed for project ${projectId}: ${result.wordCount} words (${durationMs}ms)`);

        await pipelineOrchestrator.checkAndAdvancePipeline(projectId, userId, "STT_TIMESTAMPS");

        return { success: true, transcriptId: transcript.id, wordCount: result.wordCount };
      } catch (error) {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - startedAt.getTime();
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[STTTimestamps] Failed for project ${projectId} after ${durationMs}ms:`, errorMessage);

        await db
          .update(generationJobs)
          .set({
            status: "failed",
            result: {
              log: {
                stage: "STT_TIMESTAMPS",
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
              eq(generationJobs.jobType, "STT_TIMESTAMPS"),
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
