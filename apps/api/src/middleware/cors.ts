import { cors } from "hono/cors";

export const corsMiddleware = cors({
  origin: (origin) => origin || "*",
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
