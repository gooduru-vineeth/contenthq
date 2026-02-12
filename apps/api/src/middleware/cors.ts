import { cors } from "hono/cors";
import { env } from "../lib/env";

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "x-trpc-source",
    "x-csrf-token",
    "x-requested-with",
  ],
});
