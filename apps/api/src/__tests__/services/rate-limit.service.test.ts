import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the queue module to provide a mock Redis connection
vi.mock("@contenthq/queue", () => ({
  getRedisConnection: vi.fn(),
}));

import { rateLimitService } from "../../services/rate-limit.service";
import { getRedisConnection } from "@contenthq/queue";

describe("rateLimitService", () => {
  const mockRedis = {
    eval: vi.fn(),
    decrby: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getRedisConnection as ReturnType<typeof vi.fn>).mockReturnValue(mockRedis);
  });

  describe("checkAndRecord", () => {
    it("allows request when under limit", async () => {
      // Lua script returns: [allowed (1), current count, limit, TTL]
      mockRedis.eval.mockResolvedValue([1, 1, 20, 3600]);

      const result = await rateLimitService.checkAndRecord("user1", "media_generation");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBe(19);
      expect(result.resetInSeconds).toBe(3600);
    });

    it("rejects request when over limit", async () => {
      // Lua script returns: [allowed (0), current count, limit, TTL]
      mockRedis.eval.mockResolvedValue([0, 20, 20, 1800]);

      const result = await rateLimitService.checkAndRecord("user1", "media_generation");

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(20);
      expect(result.remaining).toBe(0);
      expect(result.resetInSeconds).toBe(1800);
    });

    it("bypasses rate limit for admin users", async () => {
      const result = await rateLimitService.checkAndRecord("admin1", "media_generation", {
        isAdmin: true,
      });

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(Infinity);
      expect(result.remaining).toBe(Infinity);
      expect(result.resetInSeconds).toBe(0);
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it("fails open when Redis is down", async () => {
      mockRedis.eval.mockRejectedValue(new Error("Redis connection failed"));

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await rateLimitService.checkAndRecord("user1", "media_generation");

      expect(result.allowed).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("supports custom count", async () => {
      mockRedis.eval.mockResolvedValue([1, 5, 20, 3600]);

      const result = await rateLimitService.checkAndRecord("user1", "media_generation", {
        count: 5,
      });

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      // The Lua script is called with count=5 as the increment
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String), // Lua script
        1, // number of keys
        expect.stringContaining("rl:user1:media_generation:hourly:"), // key
        20, // limit (FREE tier hourly for media_generation)
        7200, // TTL (hourly window = 2 hours)
        5 // count
      );
    });

    it("uses default FREE tier when no tier specified", async () => {
      mockRedis.eval.mockResolvedValue([1, 1, 20, 3600]);

      await rateLimitService.checkAndRecord("user1", "media_generation");

      // FREE tier media_generation hourly limit = 20
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        expect.stringContaining("rl:user1:media_generation:hourly:"),
        20, // FREE tier limit
        7200, // hourly TTL
        1 // default count
      );
    });

    it("respects tier-specific limits", async () => {
      mockRedis.eval.mockResolvedValue([1, 1, 50, 3600]);

      await rateLimitService.checkAndRecord("user1", "media_generation", {
        tier: "STARTER",
      });

      // STARTER tier media_generation hourly limit = 50
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        expect.stringContaining("rl:user1:media_generation:hourly:"),
        50, // STARTER tier limit
        7200,
        1
      );
    });

    it("uses daily window for pipeline_start operation", async () => {
      mockRedis.eval.mockResolvedValue([1, 1, 5, 86400]);

      await rateLimitService.checkAndRecord("user1", "pipeline_start");

      // pipeline_start uses daily window, FREE tier daily limit = 5
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        expect.stringContaining("rl:user1:pipeline_start:daily:"),
        5, // FREE tier daily limit
        172800, // daily TTL (48 hours with buffer)
        1
      );
    });

    it("calculates remaining correctly when current < limit", async () => {
      mockRedis.eval.mockResolvedValue([1, 15, 20, 3600]);

      const result = await rateLimitService.checkAndRecord("user1", "media_generation");

      // remaining = max(0, limit - current) = max(0, 20 - 15) = 5
      expect(result.remaining).toBe(5);
    });

    it("clamps remaining to zero when at limit", async () => {
      mockRedis.eval.mockResolvedValue([0, 25, 20, 3600]);

      const result = await rateLimitService.checkAndRecord("user1", "media_generation");

      // remaining = max(0, 20 - 25) = 0
      expect(result.remaining).toBe(0);
    });
  });

  describe("rollback", () => {
    it("decrements the counter by default count of 1", async () => {
      mockRedis.decrby.mockResolvedValue(4);

      await rateLimitService.rollback("user1", "media_generation");

      expect(mockRedis.decrby).toHaveBeenCalledWith(
        expect.stringContaining("rl:user1:media_generation:hourly:"),
        1
      );
    });

    it("decrements the counter by custom count", async () => {
      mockRedis.decrby.mockResolvedValue(2);

      await rateLimitService.rollback("user1", "media_generation", { count: 3 });

      expect(mockRedis.decrby).toHaveBeenCalledWith(
        expect.stringContaining("rl:user1:media_generation:hourly:"),
        3
      );
    });

    it("handles Redis errors gracefully", async () => {
      mockRedis.decrby.mockRejectedValue(new Error("Redis error"));

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Should not throw
      await expect(
        rateLimitService.rollback("user1", "media_generation")
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("skips rollback for unknown operations with no config", async () => {
      // If the operation has no config in the tier limits, rollback
      // returns immediately without touching Redis.
      // We cast to bypass type checking for the unknown operation.
      await rateLimitService.rollback(
        "user1",
        "nonexistent_operation" as any
      );

      expect(mockRedis.decrby).not.toHaveBeenCalled();
    });
  });

  describe("getHeaders", () => {
    it("returns correct headers for allowed request", () => {
      const headers = rateLimitService.getHeaders({
        allowed: true,
        current: 5,
        limit: 20,
        remaining: 15,
        resetInSeconds: 3600,
      });

      expect(headers["X-RateLimit-Limit"]).toBe("20");
      expect(headers["X-RateLimit-Remaining"]).toBe("15");
      expect(headers["X-RateLimit-Reset"]).toBe("3600");
    });

    it("returns correct headers for rejected request", () => {
      const headers = rateLimitService.getHeaders({
        allowed: false,
        current: 20,
        limit: 20,
        remaining: 0,
        resetInSeconds: 1800,
      });

      expect(headers["X-RateLimit-Limit"]).toBe("20");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["X-RateLimit-Reset"]).toBe("1800");
    });

    it("returns string values for all headers", () => {
      const headers = rateLimitService.getHeaders({
        allowed: true,
        current: 0,
        limit: 100,
        remaining: 100,
        resetInSeconds: 7200,
      });

      // All header values must be strings
      for (const value of Object.values(headers)) {
        expect(typeof value).toBe("string");
      }
    });
  });
});
