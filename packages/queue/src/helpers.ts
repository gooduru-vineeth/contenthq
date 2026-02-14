import type { Job } from "bullmq";
import { getQueue, QUEUE_NAMES } from "./queues";
import type {
  IngestionJobData,
  StoryWritingJobData,
  ScriptGenerationJobData,
  STTTimestampsJobData,
  SceneGenerationJobData,
  VisualGenerationJobData,
  VisualVerificationJobData,
  VideoGenerationJobData,
  TTSGenerationJobData,
  AudioMixingJobData,
  VideoAssemblyJobData,
  SpeechGenerationJobData,
  MediaGenerationJobData,
  CaptionGenerationJobData,
  PptIngestionJobData,
  SlideRenderingJobData,
  AudioScriptGenJobData,
  RemotionCompositionJobData,
  RemotionRenderJobData,
  MotionCanvasSceneJobData,
  MotionCanvasRenderJobData,
} from "./types";

export async function addIngestionJob(data: IngestionJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.INGESTION);
  return queue.add("ingest", data, { priority });
}

export async function addStoryWritingJob(data: StoryWritingJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.STORY_WRITING);
  return queue.add("write-story", data, { priority });
}

export async function addScriptGenerationJob(data: ScriptGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.SCRIPT_GENERATION);
  return queue.add("generate-script", data, { priority });
}

export async function addSTTTimestampsJob(data: STTTimestampsJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.STT_TIMESTAMPS);
  return queue.add("stt-timestamps", data, { priority });
}

export async function addSceneGenerationJob(data: SceneGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.SCENE_GENERATION);
  return queue.add("generate-scenes", data, { priority });
}

export async function addVisualGenerationJob(data: VisualGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.VISUAL_GENERATION);
  return queue.add("generate-visual", data, { priority });
}

export async function addVisualVerificationJob(data: VisualVerificationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.VISUAL_VERIFICATION);
  return queue.add("verify-visual", data, { priority });
}

export async function addVideoGenerationJob(data: VideoGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.VIDEO_GENERATION);
  return queue.add("generate-video", data, { priority });
}

export async function addTTSGenerationJob(data: TTSGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.TTS_GENERATION);
  return queue.add("generate-tts", data, { priority });
}

export async function addAudioMixingJob(data: AudioMixingJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.AUDIO_MIXING);
  return queue.add("mix-audio", data, { priority });
}

export async function addVideoAssemblyJob(data: VideoAssemblyJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.VIDEO_ASSEMBLY);
  return queue.add("assemble-video", data, { priority });
}

export async function addSpeechGenerationJob(data: SpeechGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.SPEECH_GENERATION);
  return queue.add("generate-speech", data, { priority });
}

export async function addMediaGenerationJob(data: MediaGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.MEDIA_GENERATION);
  return queue.add("generate-media", data, { priority });
}

export async function addCaptionGenerationJob(data: CaptionGenerationJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.CAPTION_GENERATION);
  return queue.add("generate-caption", data, { priority });
}

export async function addGenericJob(
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  priority?: number
): Promise<Job> {
  const queue = getQueue(queueName as any);
  return queue.add(jobName, data, { priority });
}

export async function addPptIngestionJob(data: PptIngestionJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.PPT_INGESTION);
  return queue.add("ingest-ppt", data, { priority });
}

export async function addSlideRenderingJob(data: SlideRenderingJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.SLIDE_RENDERING);
  return queue.add("render-slide", data, { priority });
}

export async function addAudioScriptGenJob(data: AudioScriptGenJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.AUDIO_SCRIPT_GEN);
  return queue.add("generate-audio-script", data, { priority });
}

export async function addRemotionCompositionJob(data: RemotionCompositionJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.REMOTION_COMPOSITION);
  return queue.add("compose-remotion", data, { priority });
}

export async function addRemotionRenderJob(data: RemotionRenderJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.REMOTION_RENDER);
  return queue.add("render-remotion", data, { priority });
}

export async function addMotionCanvasSceneJob(data: MotionCanvasSceneJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.MOTION_CANVAS_SCENE);
  return queue.add("create-motion-scene", data, { priority });
}

export async function addMotionCanvasRenderJob(data: MotionCanvasRenderJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.MOTION_CANVAS_RENDER);
  return queue.add("render-motion-canvas", data, { priority });
}

export async function getQueueStats(queueName: string) {
  const queue = getQueue(queueName as any);
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);
  return { waiting, active, completed, failed };
}

/**
 * Remove all waiting and delayed jobs for a given projectId across all pipeline queues.
 * Active jobs cannot be removed from BullMQ — those are handled by the worker-side guard.
 */
const PIPELINE_QUEUE_NAMES: readonly (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES][] = [
  QUEUE_NAMES.INGESTION,
  QUEUE_NAMES.STORY_WRITING,
  QUEUE_NAMES.SCRIPT_GENERATION,
  QUEUE_NAMES.STT_TIMESTAMPS,
  QUEUE_NAMES.SCENE_GENERATION,
  QUEUE_NAMES.VISUAL_GENERATION,
  QUEUE_NAMES.VISUAL_VERIFICATION,
  QUEUE_NAMES.VIDEO_GENERATION,
  QUEUE_NAMES.TTS_GENERATION,
  QUEUE_NAMES.AUDIO_MIXING,
  QUEUE_NAMES.CAPTION_GENERATION,
  QUEUE_NAMES.VIDEO_ASSEMBLY,
];

export async function removeJobsByProjectId(projectId: string): Promise<number> {
  let removed = 0;

  await Promise.all(
    PIPELINE_QUEUE_NAMES.map(async (queueName) => {
      const queue = getQueue(queueName);
      const [waiting, delayed] = await Promise.all([
        queue.getJobs(["waiting"]),
        queue.getJobs(["delayed"]),
      ]);

      const jobs = [...waiting, ...delayed];
      for (const job of jobs) {
        if (job.data?.projectId === projectId) {
          try {
            await job.remove();
            removed++;
          } catch {
            // Job may have already been picked up — safe to ignore
          }
        }
      }
    })
  );

  if (removed > 0) {
    console.warn(`[Queue] Removed ${removed} queued/delayed job(s) for project ${projectId}`);
  }

  return removed;
}
