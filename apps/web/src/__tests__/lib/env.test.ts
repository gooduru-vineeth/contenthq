import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("web env validation", () => {
  it("validates NEXT_PUBLIC_API_URL as a URL", () => {
    const schema = z.object({
      NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
    });

    const result = schema.parse({
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
    });

    expect(result.NEXT_PUBLIC_API_URL).toBe("http://localhost:3001");
  });

  it("rejects invalid URL format", () => {
    const schema = z.object({
      NEXT_PUBLIC_API_URL: z.string().url(),
    });

    expect(() =>
      schema.parse({ NEXT_PUBLIC_API_URL: "not-a-url" })
    ).toThrow();
  });

  it("applies default API URL", () => {
    const schema = z.object({
      NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
    });

    const result = schema.parse({});
    expect(result.NEXT_PUBLIC_API_URL).toBe("http://localhost:3001");
  });
});
