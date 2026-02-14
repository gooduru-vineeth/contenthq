import { db } from "@contenthq/db/client";
import {
  bonusCredits,
  creditBalances,
  creditTransactions,
} from "@contenthq/db/schema";
import { eq, sql, and, lt, desc } from "drizzle-orm";
import { DEFAULT_FREE_CREDITS } from "@contenthq/shared";

// ─── Types ──────────────────────────────────────────────────────────────

type BonusCreditSource =
  | "promotional"
  | "referral"
  | "compensation"
  | "loyalty"
  | "trial"
  | "admin_grant"
  | "signup_bonus";

interface GrantBonusOpts {
  description?: string;
  campaignId?: string;
  expiresAt?: Date;
  grantedBy?: string;
  metadata?: Record<string, unknown>;
}

interface CreditBalanceRow {
  id: string;
  user_id: string;
  balance: number | null;
  reserved_balance: number;
  bonus_balance: number;
  lifetime_credits_received: number;
  lifetime_credits_used: number;
  last_updated: Date;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Grant bonus credits to a user. Creates a bonus_credits record and
 * atomically increments the user's bonusBalance.
 */
async function grantBonusCredits(
  userId: string,
  amount: number,
  source: BonusCreditSource,
  opts?: GrantBonusOpts
) {
  return await db.transaction(async (tx) => {
    // Ensure credit balance exists
    const balResult = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    let row = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (!row) {
      await tx.insert(creditBalances).values({
        userId,
        balance: DEFAULT_FREE_CREDITS,
        reservedBalance: 0,
      });
      const created = await tx.execute(
        sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
      );
      row = created.rows?.[0] as unknown as CreditBalanceRow | undefined;
    }

    if (!row) {
      throw new Error("Failed to create credit balance");
    }

    // Create bonus credit record
    const [bonus] = await tx
      .insert(bonusCredits)
      .values({
        userId,
        originalAmount: amount,
        remainingAmount: amount,
        source,
        description: opts?.description ?? null,
        campaignId: opts?.campaignId ?? null,
        expiresAt: opts?.expiresAt ?? null,
        grantedBy: opts?.grantedBy ?? null,
        metadata: opts?.metadata ?? null,
      })
      .returning();

    // Increment bonus balance and lifetime received
    await tx
      .update(creditBalances)
      .set({
        bonusBalance: (row.bonus_balance ?? 0) + amount,
        lifetimeCreditsReceived:
          (row.lifetime_credits_received ?? 0) + amount,
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Record transaction for audit trail
    await tx.insert(creditTransactions).values({
      userId,
      type: "admin_grant",
      amount,
      description:
        opts?.description ?? `Bonus credits (${source})`,
      metadata: {
        bonusCreditId: bonus!.id,
        source,
        campaignId: opts?.campaignId,
        grantedBy: opts?.grantedBy,
      },
    });

    return bonus!;
  });
}

/**
 * Deduct credits from bonus balance first, then regular balance.
 * Returns the amount deducted from bonus and regular respectively.
 */
async function deductWithBonusPriority(
  userId: string,
  amount: number,
  description: string,
  opts?: {
    projectId?: string;
    operationType?: string;
    provider?: string;
    model?: string;
  }
) {
  return await db.transaction(async (tx) => {
    const balResult = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    const row = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (!row) {
      throw new Error(`No credit balance found for user ${userId}`);
    }

    const bonusBalance = row.bonus_balance ?? 0;
    const regularBalance = row.balance ?? 0;
    const totalAvailable = bonusBalance + regularBalance - (row.reserved_balance ?? 0);

    if (totalAvailable < amount) {
      throw new Error(
        `Insufficient credits. Available: ${totalAvailable}, required: ${amount}`
      );
    }

    // Deduct from bonus first, then regular
    const bonusDeduction = Math.min(bonusBalance, amount);
    const regularDeduction = amount - bonusDeduction;

    // If we're using bonus credits, reduce remaining amounts on active bonuses (FIFO by creation date)
    if (bonusDeduction > 0) {
      let remaining = bonusDeduction;

      const activeBonuses = await tx
        .select()
        .from(bonusCredits)
        .where(
          and(
            eq(bonusCredits.userId, userId),
            eq(bonusCredits.isExpired, false)
          )
        )
        .orderBy(bonusCredits.createdAt);

      for (const bonus of activeBonuses) {
        if (remaining <= 0) break;

        const deductFromThis = Math.min(bonus.remainingAmount, remaining);
        await tx
          .update(bonusCredits)
          .set({
            remainingAmount: bonus.remainingAmount - deductFromThis,
          })
          .where(eq(bonusCredits.id, bonus.id));

        remaining -= deductFromThis;
      }
    }

    // Update balances atomically
    await tx
      .update(creditBalances)
      .set({
        balance: regularBalance - regularDeduction,
        bonusBalance: bonusBalance - bonusDeduction,
        lifetimeCreditsUsed: (row.lifetime_credits_used ?? 0) + amount,
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Record the transaction
    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId,
        type: "usage",
        amount: -amount,
        description,
        projectId: opts?.projectId ?? null,
        operationType: opts?.operationType ?? null,
        provider: opts?.provider ?? null,
        model: opts?.model ?? null,
        metadata: {
          bonusCreditsUsed: bonusDeduction,
          regularCreditsUsed: regularDeduction,
        },
      })
      .returning();

    return {
      transaction: transaction!,
      bonusDeducted: bonusDeduction,
      regularDeducted: regularDeduction,
    };
  });
}

/**
 * Get all bonus credit records for a user, optionally including expired ones.
 */
async function getUserBonusCredits(
  userId: string,
  opts?: { includeExpired?: boolean }
) {
  const conditions = [eq(bonusCredits.userId, userId)];

  if (!opts?.includeExpired) {
    conditions.push(eq(bonusCredits.isExpired, false));
  }

  return db
    .select()
    .from(bonusCredits)
    .where(and(...conditions))
    .orderBy(desc(bonusCredits.createdAt));
}

/**
 * Expire all bonus credits past their expiration date.
 * Called by the bonus-expiry background worker.
 *
 * For each expired bonus:
 * 1. Mark isExpired = true
 * 2. Deduct remainingAmount from user's bonusBalance
 * 3. Create a "bonus_expired" transaction record
 */
async function expireBonusCredits() {
  const now = new Date();

  const expiredBonuses = await db
    .select()
    .from(bonusCredits)
    .where(
      and(
        eq(bonusCredits.isExpired, false),
        lt(bonusCredits.expiresAt, now)
      )
    );

  if (expiredBonuses.length === 0) {
    return { expired: 0 };
  }

  let expiredCount = 0;

  for (const bonus of expiredBonuses) {
    try {
      await db.transaction(async (tx) => {
        // Re-check under lock to avoid double-expiry
        const [current] = await tx
          .select()
          .from(bonusCredits)
          .where(
            and(
              eq(bonusCredits.id, bonus.id),
              eq(bonusCredits.isExpired, false)
            )
          );

        if (!current) return;

        // Mark as expired
        await tx
          .update(bonusCredits)
          .set({ isExpired: true })
          .where(eq(bonusCredits.id, bonus.id));

        // Reduce bonus balance if there was remaining amount
        if (current.remainingAmount > 0) {
          const balResult = await tx.execute(
            sql`SELECT * FROM credit_balances WHERE user_id = ${current.userId} FOR UPDATE`
          );
          const balRow = balResult.rows?.[0] as unknown as
            | CreditBalanceRow
            | undefined;

          if (balRow) {
            await tx
              .update(creditBalances)
              .set({
                bonusBalance: Math.max(
                  0,
                  (balRow.bonus_balance ?? 0) - current.remainingAmount
                ),
                lastUpdated: new Date(),
              })
              .where(eq(creditBalances.userId, current.userId));
          }

          // Record expiry transaction
          await tx.insert(creditTransactions).values({
            userId: current.userId,
            type: "usage",
            amount: 0,
            description: `Bonus credits expired (${current.source})`,
            metadata: {
              bonusCreditId: current.id,
              expiredAmount: current.remainingAmount,
              source: current.source,
              event: "bonus_expired",
            },
          });
        }

        expiredCount++;
      });
    } catch (err) {
      console.error(
        `[BonusCreditService] Failed to expire bonus ${bonus.id}:`,
        err
      );
    }
  }

  if (expiredCount > 0) {
    console.warn(
      `[BonusCreditService] Expired ${expiredCount} bonus credit(s)`
    );
  }

  return { expired: expiredCount };
}

/**
 * Manually expire a specific bonus credit by ID (admin action).
 */
async function manualExpireBonus(bonusId: string) {
  const [bonus] = await db
    .select()
    .from(bonusCredits)
    .where(eq(bonusCredits.id, bonusId));

  if (!bonus) {
    throw new Error(`Bonus credit ${bonusId} not found`);
  }

  if (bonus.isExpired) {
    throw new Error(`Bonus credit ${bonusId} is already expired`);
  }

  return await db.transaction(async (tx) => {
    await tx
      .update(bonusCredits)
      .set({ isExpired: true })
      .where(eq(bonusCredits.id, bonusId));

    if (bonus.remainingAmount > 0) {
      const balResult = await tx.execute(
        sql`SELECT * FROM credit_balances WHERE user_id = ${bonus.userId} FOR UPDATE`
      );
      const balRow = balResult.rows?.[0] as unknown as
        | CreditBalanceRow
        | undefined;

      if (balRow) {
        await tx
          .update(creditBalances)
          .set({
            bonusBalance: Math.max(
              0,
              (balRow.bonus_balance ?? 0) - bonus.remainingAmount
            ),
            lastUpdated: new Date(),
          })
          .where(eq(creditBalances.userId, bonus.userId));
      }
    }

    return { id: bonusId, expired: true, amountForfeited: bonus.remainingAmount };
  });
}

export const bonusCreditService = {
  grantBonusCredits,
  deductWithBonusPriority,
  getUserBonusCredits,
  expireBonusCredits,
  manualExpireBonus,
};
