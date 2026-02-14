import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { bonusCreditService } from "../../services/bonus-credit.service";
import { db } from "@contenthq/db/client";
import { creditBalances } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";

const bonusSourceValues = [
  "promotional",
  "referral",
  "compensation",
  "loyalty",
  "trial",
  "admin_grant",
  "signup_bonus",
] as const;

export const adminBonusRouter = router({
  /**
   * Grant bonus credits to a user.
   */
  grantBonus: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number().int().min(1),
        source: z.enum(bonusSourceValues),
        description: z.string().optional(),
        expiresAt: z.coerce.date().refine((d) => d > new Date(), {
          message: "Expiration date must be in the future",
        }).optional(),
        campaignId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return bonusCreditService.grantBonusCredits(
        input.userId,
        input.amount,
        input.source,
        {
          description: input.description,
          expiresAt: input.expiresAt,
          campaignId: input.campaignId,
          grantedBy: ctx.user.id,
        }
      );
    }),

  /**
   * List bonus credits with optional filters.
   */
  listBonus: adminProcedure
    .input(
      z
        .object({
          userId: z.string().optional(),
          source: z.enum(bonusSourceValues).optional(),
          includeExpired: z.boolean().default(false),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (!input?.userId) {
        // Return empty list if no userId specified (listing all would be expensive)
        return [];
      }

      const bonuses = await bonusCreditService.getUserBonusCredits(
        input.userId,
        { includeExpired: input.includeExpired }
      );

      // Apply pagination manually since service returns all
      const offset = input.offset ?? 0;
      const limit = input.limit ?? 50;
      return bonuses.slice(offset, offset + limit);
    }),

  /**
   * Manually expire a bonus credit grant.
   */
  expireBonus: adminProcedure
    .input(z.object({ bonusId: z.string() }))
    .mutation(async ({ input }) => {
      return bonusCreditService.manualExpireBonus(input.bonusId);
    }),

  /**
   * Get a user's total bonus balance.
   */
  getUserBonusBalance: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [balance] = await db
        .select({
          bonusBalance: creditBalances.bonusBalance,
        })
        .from(creditBalances)
        .where(eq(creditBalances.userId, input.userId));

      return {
        userId: input.userId,
        bonusBalance: balance?.bonusBalance ?? 0,
      };
    }),
});
