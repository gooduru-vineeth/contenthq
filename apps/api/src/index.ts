import { initSentry, Sentry } from "./lib/sentry";

// Initialize Sentry before anything else
initSentry();

import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./lib/env";
import { initWorkers, shutdownWorkers } from "./workers/index";
import { registerBuiltinStageHandlers } from "./stage-handlers";
import { closeRedisConnection } from "@contenthq/queue";
import { langsmithClient } from "@contenthq/ai";
import { setupPaymentService } from "./lib/payment";

const server = serve({ fetch: app.fetch, port: env.PORT }, async (info) => {
  console.warn(`Server running on http://localhost:${info.port}`);
  setupPaymentService();
  registerBuiltinStageHandlers();
  await initWorkers();
});

async function gracefulShutdown(signal: string) {
  console.warn(`\n[Server] Received ${signal}, shutting down gracefully...`);
  await shutdownWorkers();
  console.warn("[Server] Flushing pending LangSmith trace batches...");
  try {
    await Promise.race([
      langsmithClient.awaitPendingTraceBatches(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timed out after 5s")), 5000)
      ),
    ]);
    console.warn("[Server] LangSmith traces flushed successfully");
  } catch (err) {
    console.warn(
      `[Server] LangSmith trace flush issue: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  await Sentry.close(2000);
  await closeRedisConnection();
  server.close(() => {
    console.warn("[Server] HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
