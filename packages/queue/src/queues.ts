import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

export const QUEUE_NAMES = {
  INGESTION: "ingestion",
  STORY_WRITING: "story-writing",
  SCENE_GENERATION: "scene-generation",
  VISUAL_GENERATION: "visual-generation",
  VISUAL_VERIFICATION: "visual-verification",
  VIDEO_GENERATION: "video-generation",
  TTS_GENERATION: "tts-generation",
  AUDIO_MIXING: "audio-mixing",
  VIDEO_ASSEMBLY: "video-assembly",
  SPEECH_GENERATION: "speech-generation",
  MEDIA_GENERATION: "media-generation",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<string, Queue>();

const DEFAULT_JOB_OPTIONS: Record<string, { attempts: number; backoff: { type: string; delay: number } }> = {
  [QUEUE_NAMES.INGESTION]: { attempts: 2, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.STORY_WRITING]: { attempts: 2, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.SCENE_GENERATION]: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.VISUAL_GENERATION]: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.VISUAL_VERIFICATION]: { attempts: 2, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.VIDEO_GENERATION]: { attempts: 2, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.TTS_GENERATION]: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.AUDIO_MIXING]: { attempts: 2, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.VIDEO_ASSEMBLY]: { attempts: 2, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.SPEECH_GENERATION]: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
  [QUEUE_NAMES.MEDIA_GENERATION]: { attempts: 3, backoff: { type: "exponential", delay: 10000 } },
};

export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const connection = getRedisConnection();
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS[name],
    });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closePromises);
  queues.clear();
}
