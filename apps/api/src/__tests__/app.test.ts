import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("app setup", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://localhost:5432/test",
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-chars-long",
      BETTER_AUTH_URL: "http://localhost:3001",
      CORS_ORIGIN: "http://localhost:3000",
      PORT: "3001",
      REDIS_URL: "redis://localhost:6379",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("exports a Hono app instance", async () => {
    const { app } = await import("../app");
    expect(app).toBeDefined();
    expect(typeof app.request).toBe("function");
  });

  it("mounts routes at root", async () => {
    const { app } = await import("../app");
    expect(app.routes).toBeDefined();
    expect(app.routes.length).toBeGreaterThan(0);
  });
});
