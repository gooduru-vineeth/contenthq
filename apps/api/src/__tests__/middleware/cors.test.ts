import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("corsMiddleware", () => {
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

  it("allows configured origin", async () => {
    const { corsMiddleware } = await import("../../middleware/cors");
    const { Hono } = await import("hono");

    const app = new Hono();
    app.use("*", corsMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:3000"
    );
  });

  it("includes credentials header", async () => {
    const { corsMiddleware } = await import("../../middleware/cors");
    const { Hono } = await import("hono");

    const app = new Hono();
    app.use("*", corsMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      headers: { Origin: "http://localhost:3000" },
    });

    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("handles OPTIONS preflight request", async () => {
    const { corsMiddleware } = await import("../../middleware/cors");
    const { Hono } = await import("hono");

    const app = new Hono();
    app.use("*", corsMiddleware);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});
