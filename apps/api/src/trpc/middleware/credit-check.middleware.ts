import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc";
import { creditService } from "../../services/credit.service";

/**
 * Creates a tRPC middleware that performs a pre-flight credit balance check
 * before allowing the procedure to execute.
 *
 * Usage with protectedProcedure:
 *
 * ```ts
 * protectedProcedure
 *   .use(createCreditCheckMiddleware((input) => {
 *     const { count } = input as { count: number };
 *     return count * CREDIT_COSTS.IMAGE_GENERATION;
 *   }))
 *   .mutation(...)
 * ```
 *
 * The `costFn` receives the validated procedure input and must return the
 * number of credits required. If the user does not have enough available
 * credits the middleware throws a PRECONDITION_FAILED error.
 *
 * Admin users bypass credit checks entirely.
 */
export function createCreditCheckMiddleware(
  costFn: (input: unknown) => number
) {
  return middleware(async ({ ctx, input, next }) => {
    const user = ctx.user;
    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // Admin users bypass credit checks
    if (user.role === "admin") {
      return next();
    }

    const requiredCredits = costFn(input);
    if (requiredCredits <= 0) {
      return next();
    }

    const hasSufficient = await creditService.checkSufficientCredits(
      user.id,
      requiredCredits
    );

    if (!hasSufficient) {
      const available = await creditService.getAvailableBalance(user.id);
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Insufficient credits. Required: ${requiredCredits}, available: ${available}. Purchase more credits to continue.`,
      });
    }

    return next();
  });
}
