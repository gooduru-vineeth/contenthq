import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

describe("env validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validates with all required env vars present", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/contenthq";
    process.env.BETTER_AUTH_SECRET = "a-secret-that-is-long-enough-32chars";
    process.env.BETTER_AUTH_URL = "http://localhost:3001";
    process.env.CORS_ORIGIN = "http://localhost:3000";
    process.env.PORT = "3001";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    process.env.CLOUDFLARE_ACCESS_KEY_ID = "test-access-key";
    process.env.CLOUDFLARE_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET_NAME = "test-bucket";

    const { env } = await import("../../lib/env");

    expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/contenthq");
    expect(env.PORT).toBe(3001);
    expect(env.CORS_ORIGIN).toBe("http://localhost:3000");
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("applies default values", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/contenthq";
    process.env.BETTER_AUTH_SECRET = "a-secret-that-is-long-enough-32chars";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account-id";
    process.env.CLOUDFLARE_ACCESS_KEY_ID = "test-access-key";
    process.env.CLOUDFLARE_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET_NAME = "test-bucket";

    const { env } = await import("../../lib/env");

    expect(env.BETTER_AUTH_URL).toBe("http://localhost:3001");
    expect(env.CORS_ORIGIN).toBe("http://localhost:3000");
    expect(env.PORT).toBe(3001);
  });

  it("rejects missing DATABASE_URL", () => {
    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(1),
      BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
      CORS_ORIGIN: z.string().default("http://localhost:3000"),
      PORT: z.coerce.number().default(3001),
      REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    });

    expect(() =>
      envSchema.parse({
        BETTER_AUTH_SECRET: "test-secret",
        REDIS_URL: "redis://localhost:6379",
      })
    ).toThrow();
  });

  it("rejects missing BETTER_AUTH_SECRET", () => {
    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(1),
      BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
      CORS_ORIGIN: z.string().default("http://localhost:3000"),
      PORT: z.coerce.number().default(3001),
      REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    });

    expect(() =>
      envSchema.parse({
        DATABASE_URL: "postgresql://localhost:5432/test",
        REDIS_URL: "redis://localhost:6379",
      })
    ).toThrow();
  });

  it("rejects missing REDIS_URL", () => {
    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(1),
      BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
      CORS_ORIGIN: z.string().default("http://localhost:3000"),
      PORT: z.coerce.number().default(3001),
      REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    });

    expect(() =>
      envSchema.parse({
        DATABASE_URL: "postgresql://localhost:5432/test",
        BETTER_AUTH_SECRET: "test-secret",
      })
    ).toThrow();
  });

  it("coerces PORT to number", () => {
    const envSchema = z.object({
      DATABASE_URL: z.string().min(1),
      BETTER_AUTH_SECRET: z.string().min(1),
      BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
      CORS_ORIGIN: z.string().default("http://localhost:3000"),
      PORT: z.coerce.number().default(3001),
      REDIS_URL: z.string().min(1, "REDIS_URL is required"),
    });

    const result = envSchema.parse({
      DATABASE_URL: "postgresql://localhost:5432/test",
      BETTER_AUTH_SECRET: "test-secret",
      REDIS_URL: "redis://localhost:6379",
      PORT: "5000",
    });

    expect(result.PORT).toBe(5000);
    expect(typeof result.PORT).toBe("number");
  });
});
