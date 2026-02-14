import { getRedisConnection } from "@contenthq/queue";
import { DEFAULT_RATE_LIMITS } from "@contenthq/shared";
import type {
  RateLimitOperation,
  RateLimitCheckResult,
  PlanRateLimits,
} from "@contenthq/shared";

// ─── Lua script ──────────────────────────────────────────────────────────
//
// Atomic check-and-increment using a fixed-window counter.
//
// KEYS[1]  — the rate-limit key (e.g. `rl:<userId>:<op>:hourly:2026021414`)
// ARGV[1]  — the limit for this window
// ARGV[2]  — TTL in seconds (buffer beyond the window boundary)
// ARGV[3]  — how many units to increment
//
// Returns: [allowed (0|1), current count, limit, remaining TTL]

const CHECK_AND_INCREMENT_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local increment = tonumber(ARGV[3])

if current + increment > limit then
  local remainTtl = redis.call('TTL', KEYS[1])
  if remainTtl < 0 then remainTtl = ttl end
  return {0, current, limit, remainTtl}
end

local newVal = redis.call('INCRBY', KEYS[1], increment)
if newVal == increment then
  redis.call('EXPIRE', KEYS[1], ttl)
end

local remainTtl = redis.call('TTL', KEYS[1])
return {1, newVal, limit, remainTtl}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Build the Redis key that uniquely identifies a counter for a given
 * user + operation + window period.
 */
function getRedisKey(
  userId: string,
  operationType: RateLimitOperation,
  window: "hourly" | "daily"
): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  if (window === "hourly") {
    const hour = String(now.getUTCHours()).padStart(2, "0");
    return `rl:${userId}:${operationType}:hourly:${year}${month}${day}${hour}`;
  }

  return `rl:${userId}:${operationType}:daily:${year}${month}${day}`;
}

/**
 * Returns the rate-limit configuration for a given subscription tier.
 * Falls back to the FREE tier when the tier is unknown.
 */
function getLimitsForTier(tier: string): PlanRateLimits {
  const limits = DEFAULT_RATE_LIMITS[tier];
  if (limits) return limits;
  return DEFAULT_RATE_LIMITS.FREE!;
}

/**
 * Inspect the per-operation config to determine whether it uses an
 * hourly or daily window, and return the limit value + window type.
 */
function resolveWindowConfig(opConfig: { hourly: number } | { daily: number }): {
  window: "hourly" | "daily";
  limit: number;
  /** TTL with buffer beyond the window boundary */
  ttl: number;
} {
  if ("daily" in opConfig) {
    return {
      window: "daily",
      limit: opConfig.daily,
      // 48-hour TTL — generous buffer so the key survives across
      // timezone edges; it is harmless because the period ID in the
      // key naturally separates days.
      ttl: 172_800,
    };
  }
  return {
    window: "hourly",
    limit: opConfig.hourly,
    // 2-hour TTL — same reasoning as above.
    ttl: 7_200,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Check whether a user is allowed to perform `operationType`, and if so
 * atomically record the usage.
 *
 * Options:
 *   - `count`   — how many units to consume (default 1)
 *   - `tier`    — the user's subscription tier (default "FREE")
 *   - `isAdmin` — if true the check is bypassed entirely
 *
 * On Redis failure the service **fails open** (allows the request) so
 * that a transient Redis outage does not block all users.
 */
async function checkAndRecord(
  userId: string,
  operationType: RateLimitOperation,
  opts?: { count?: number; tier?: string; isAdmin?: boolean }
): Promise<RateLimitCheckResult> {
  // Admin bypass — unlimited
  if (opts?.isAdmin) {
    return {
      allowed: true,
      current: 0,
      limit: Infinity,
      remaining: Infinity,
      resetInSeconds: 0,
    };
  }

  const count = opts?.count ?? 1;
  const tier = opts?.tier ?? "FREE";
  const limits = getLimitsForTier(tier);

  const opConfig = limits[operationType];
  if (!opConfig) {
    // Unknown operation — allow by default to avoid blocking legitimate
    // requests when new operations are added before rate-limit config
    // is updated.
    console.warn(
      `[RateLimit] No limit configured for operation "${operationType}" on tier "${tier}", allowing`
    );
    return {
      allowed: true,
      current: 0,
      limit: Infinity,
      remaining: Infinity,
      resetInSeconds: 0,
    };
  }

  const { window, limit, ttl } = resolveWindowConfig(opConfig);
  const key = getRedisKey(userId, operationType, window);

  try {
    const redis = getRedisConnection();

    const result = (await redis.eval(
      CHECK_AND_INCREMENT_SCRIPT,
      1,
      key,
      limit,
      ttl,
      count
    )) as [number, number, number, number];

    const [allowed, current, maxLimit, resetTtl] = result;

    return {
      allowed: allowed === 1,
      current,
      limit: maxLimit,
      remaining: Math.max(0, maxLimit - current),
      resetInSeconds: Math.max(0, resetTtl),
    };
  } catch (error) {
    // Graceful degradation: if Redis is down, allow the request so the
    // platform stays usable. The credit system is the ultimate safety net.
    console.warn("[RateLimit] Redis error, failing open:", error);
    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
      resetInSeconds: 0,
    };
  }
}

/**
 * Roll back a previously recorded rate-limit increment (e.g. the
 * operation failed immediately and should not count against the limit).
 */
async function rollback(
  userId: string,
  operationType: RateLimitOperation,
  opts?: { count?: number; tier?: string }
): Promise<void> {
  const count = opts?.count ?? 1;
  const tier = opts?.tier ?? "FREE";
  const limits = getLimitsForTier(tier);

  const opConfig = limits[operationType];
  if (!opConfig) return;

  const { window } = resolveWindowConfig(opConfig);
  const key = getRedisKey(userId, operationType, window);

  try {
    const redis = getRedisConnection();
    // DECRBY is safe even if the key has already expired — it will
    // just create a new key with a negative value which is harmless
    // because it will be garbage-collected by TTL.
    await redis.decrby(key, count);
  } catch (error) {
    // Best-effort — a missed rollback is not critical.
    console.warn("[RateLimit] Redis rollback error:", error);
  }
}

/**
 * Build standard rate-limit HTTP response headers from a check result.
 * Attach these to the tRPC/Hono response so that clients can display
 * remaining quota information.
 */
function getHeaders(result: RateLimitCheckResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetInSeconds),
  };
}

export const rateLimitService = {
  checkAndRecord,
  rollback,
  getHeaders,
};
