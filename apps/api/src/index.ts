import { serve } from "@hono/node-server";
import { app } from "./app";
import { env } from "./lib/env";
import { initWorkers, shutdownWorkers } from "./workers/index";
import { closeRedisConnection } from "@contenthq/queue";

const server = serve({ fetch: app.fetch, port: env.PORT }, async (info) => {
  console.warn(`Server running on http://localhost:${info.port}`);
  await initWorkers();
});

async function gracefulShutdown(signal: string) {
  console.warn(`\n[Server] Received ${signal}, shutting down gracefully...`);
  await shutdownWorkers();
  await closeRedisConnection();
  server.close(() => {
    console.warn("[Server] HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
