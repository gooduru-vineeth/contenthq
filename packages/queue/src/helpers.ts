import type { Job } from "bullmq";
import { getQueue, QUEUE_NAMES } from "./queues";
import type {
  IngestionJobData,
  StoryWritingJobData,
  SceneGenerationJobData,
  VisualGenerationJobData,
  VisualVerificationJobData,
  VideoGenerationJobData,
  TTSGenerationJobData,
  AudioMixingJobData,
  VideoAssemblyJobData,
  SpeechGenerationJobData,
  MediaGenerationJobData,
} from "./types";

export async function addIngestionJob(data: IngestionJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.INGESTION);
  return queue.add("ingest", data, { priority });
}

export async function addStoryWritingJob(data: StoryWritingJobData, priority?: number): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.STORY_WRITING);
  return queue.add("write-story", data, { priority });
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
