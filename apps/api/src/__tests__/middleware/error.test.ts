import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { errorHandler } from "../../middleware/error";

describe("errorHandler", () => {
  it("returns 500 with error message", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/fail", () => {
      throw new Error("Something broke");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await app.request("/fail");
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "Something broke" });
    expect(consoleSpy).toHaveBeenCalledWith("[Error] Something broke");

    consoleSpy.mockRestore();
  });

  it("returns generic message when error has no message", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/fail", () => {
      throw new Error();
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await app.request("/fail");
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal Server Error");

    vi.restoreAllMocks();
  });
});
