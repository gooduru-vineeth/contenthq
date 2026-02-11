import { QueueEvents } from "bullmq";
import { getRedisConnection } from "./connection";
import type { QueueName } from "./queues";

/**
 * Create a listener that tracks when a specific job completes or fails.
 * Used by the flow engine to wait for BullMQ jobs dispatched by builtin nodes.
 */
export function createFlowJobCompletionListener(
  flowExecutionId: string,
  nodeId: string,
  queueName: QueueName,
  jobId: string,
  onComplete: (result: unknown) => void,
  onFailed: (error: string) => void
): { cleanup: () => void } {
  const connection = getRedisConnection();
  const events = new QueueEvents(queueName, { connection });

  const completedHandler = ({ jobId: completedJobId, returnvalue }: { jobId: string; returnvalue: string }) => {
    if (completedJobId === jobId) {
      try {
        const parsed = JSON.parse(returnvalue);
        onComplete(parsed);
      } catch {
        onComplete(returnvalue);
      }
      cleanup();
    }
  };

  const failedHandler = ({
    jobId: failedJobId,
    failedReason,
  }: {
    jobId: string;
    failedReason: string;
  }) => {
    if (failedJobId === jobId) {
      onFailed(failedReason);
      cleanup();
    }
  };

  events.on("completed", completedHandler);
  events.on("failed", failedHandler);

  const cleanup = () => {
    events.off("completed", completedHandler);
    events.off("failed", failedHandler);
    events.close().catch(() => {
      // Ignore close errors
    });
  };

  return { cleanup };
}

/**
 * Wait for a specific BullMQ job to complete or fail.
 * Returns a promise that resolves with the job result or rejects with the error.
 */
export function waitForJobCompletion(
  queueName: QueueName,
  jobId: string,
  flowExecutionId: string,
  nodeId: string,
  timeoutMs = 600000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      listener.cleanup();
      reject(new Error(`Job ${jobId} in queue ${queueName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const listener = createFlowJobCompletionListener(
      flowExecutionId,
      nodeId,
      queueName,
      jobId,
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        reject(new Error(error));
      }
    );
  });
}
