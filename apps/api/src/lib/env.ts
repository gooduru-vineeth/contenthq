import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  PORT: z.coerce.number().default(3001),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, "R2 account ID required for storage"),
  CLOUDFLARE_ACCESS_KEY_ID: z.string().min(1, "R2 access key required for storage"),
  CLOUDFLARE_SECRET_ACCESS_KEY: z.string().min(1, "R2 secret key required for storage"),
  R2_BUCKET_NAME: z.string().min(1, "R2 bucket name required for storage"),
  R2_PUBLIC_URL: z.string().url("R2 public URL must be valid URL").optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  FAL_API_KEY: z.string().optional(),
  REPLICATE_API_TOKEN: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
  PIXABAY_API_KEY: z.string().optional(),
  STORYBLOCKS_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
