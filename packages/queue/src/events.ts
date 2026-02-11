import { QueueEvents } from "bullmq";
import { getRedisConnection } from "./connection";
import type { QueueName } from "./queues";

const queueEvents = new Map<string, QueueEvents>();

export function createQueueEvents(queueName: QueueName): QueueEvents {
  if (!queueEvents.has(queueName)) {
    const connection = getRedisConnection();
    const events = new QueueEvents(queueName, { connection });
    queueEvents.set(queueName, events);
  }
  return queueEvents.get(queueName)!;
}

export async function closeAllQueueEvents(): Promise<void> {
  const closePromises = Array.from(queueEvents.values()).map((e) => e.close());
  await Promise.all(closePromises);
  queueEvents.clear();
}
