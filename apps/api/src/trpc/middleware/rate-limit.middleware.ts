import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc";
import { rateLimitService } from "../../services/rate-limit.service";
import type { RateLimitOperation } from "@contenthq/shared";

/**
 * Creates a tRPC middleware that enforces rate limits for a given operation type.
 *
 * Usage with protectedProcedure:
 *
 * ```ts
 * protectedProcedure
 *   .use(createRateLimitMiddleware("media_generation"))
 *   .mutation(...)
 * ```
 *
 * The optional `countFn` parameter allows computing the number of rate-limit
 * units consumed from the procedure input (e.g. batch size). When omitted,
 * each call counts as 1 unit.
 */
export function createRateLimitMiddleware(
  operationType: RateLimitOperation,
  countFn?: (input: unknown) => number
) {
  return middleware(async ({ ctx, input, next }) => {
    const user = ctx.user;
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const count = countFn ? countFn(input) : 1;

    const result = await rateLimitService.checkAndRecord(
      user.id,
      operationType,
      {
        count,
        // TODO: resolve tier from user subscription instead of defaulting to FREE
        tier: "FREE",
        isAdmin: user.role === "admin",
      }
    );

    if (!result.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded for ${operationType}. Limit: ${result.limit}, current: ${result.current}. Try again in ${Math.ceil(result.resetInSeconds / 60)} minutes.`,
      });
    }

    return next();
  });
}
