import { cors } from "hono/cors";
import { env } from "../lib/env";

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

export const corsMiddleware = cors({
  origin: allowedOrigins,
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
