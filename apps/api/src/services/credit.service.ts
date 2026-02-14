import { db } from "@contenthq/db/client";
import {
  creditBalances,
  creditTransactions,
  creditReservations,
} from "@contenthq/db/schema";
import { eq, sql, desc, and, lt } from "drizzle-orm";
import { DEFAULT_FREE_CREDITS } from "@contenthq/shared";
import type { CreditTransactionType } from "@contenthq/shared";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * The raw row shape returned by `SELECT * FROM credit_balances … FOR UPDATE`.
 * Column names come back in snake_case from the raw SQL driver.
 */
interface CreditBalanceRow {
  id: string;
  user_id: string;
  balance: number | null;
  reserved_balance: number;
  last_updated: Date;
}

/**
 * The raw row shape returned by `SELECT * FROM credit_reservations … FOR UPDATE`.
 */
interface CreditReservationRow {
  id: string;
  user_id: string;
  project_id: string | null;
  amount: number;
  operation_type: string;
  status: string;
  expires_at: Date;
  created_at: Date;
  settled_at: Date | null;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Get the credit balance for a user, creating one with the default free
 * credits if none exists.
 */
async function getBalance(userId: string) {
  const [balance] = await db
    .select()
    .from(creditBalances)
    .where(eq(creditBalances.userId, userId));

  if (!balance) {
    const [newBalance] = await db
      .insert(creditBalances)
      .values({
        userId,
        balance: DEFAULT_FREE_CREDITS,
        reservedBalance: 0,
      })
      .returning();
    return newBalance!;
  }

  return balance;
}

/**
 * Returns `balance - reservedBalance` (i.e. credits not locked by any
 * pending reservation).
 */
async function getAvailableBalance(userId: string): Promise<number> {
  const balance = await getBalance(userId);
  return (balance.balance ?? 0) - (balance.reservedBalance ?? 0);
}

/**
 * Returns `true` when the user has at least `amount` available credits.
 */
async function checkSufficientCredits(
  userId: string,
  amount: number
): Promise<boolean> {
  const available = await getAvailableBalance(userId);
  return available >= amount;
}

/**
 * Atomically reserve credits for a forthcoming operation.
 *
 * 1. Locks the balance row with `SELECT … FOR UPDATE`.
 * 2. Verifies sufficient available credits.
 * 3. Increments `reserved_balance`.
 * 4. Creates a `credit_reservations` record with a 1-hour expiry.
 *
 * Throws `"Insufficient credits"` when the available balance is too low.
 */
async function reserveCredits(
  userId: string,
  amount: number,
  operationType: string,
  projectId?: string
) {
  return await db.transaction(async (tx) => {
    // Lock the balance row
    const result = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    let row = result.rows?.[0] as unknown as CreditBalanceRow | undefined;

    // Auto-create balance for new users
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

    const currentBalance = row.balance ?? 0;
    const currentReserved = row.reserved_balance ?? 0;
    const available = currentBalance - currentReserved;

    if (available < amount) {
      throw new Error(
        `Insufficient credits. Available: ${available}, required: ${amount}`
      );
    }

    // Increment reserved balance
    await tx
      .update(creditBalances)
      .set({
        reservedBalance: currentReserved + amount,
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Create reservation record (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const [reservation] = await tx
      .insert(creditReservations)
      .values({
        userId,
        projectId: projectId ?? null,
        amount,
        operationType,
        status: "active",
        expiresAt,
      })
      .returning();

    return reservation!;
  });
}

/**
 * Settle a previously created reservation.
 *
 * The `actualAmount` may differ from the reserved amount (e.g. the
 * operation cost less than originally estimated). The full reserved
 * amount is released from `reserved_balance`, but only `actualAmount`
 * is deducted from `balance`.
 */
async function settleReservation(
  reservationId: string,
  actualAmount: number,
  description: string,
  metadata?: Record<string, unknown>
) {
  return await db.transaction(async (tx) => {
    // Lock the reservation
    const resResult = await tx.execute(
      sql`SELECT * FROM credit_reservations WHERE id = ${reservationId} FOR UPDATE`
    );
    const reservation = resResult.rows?.[0] as unknown as
      | CreditReservationRow
      | undefined;

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    if (reservation.status !== "active") {
      throw new Error(
        `Reservation ${reservationId} is already ${reservation.status}`
      );
    }

    const userId = reservation.user_id;

    // Lock the balance row
    const balResult = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    const balance = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (!balance) {
      throw new Error(`No credit balance found for user ${userId}`);
    }

    const currentBalance = balance.balance ?? 0;
    const currentReserved = balance.reserved_balance ?? 0;

    // Release the full reserved amount, deduct the actual cost
    await tx
      .update(creditBalances)
      .set({
        balance: currentBalance - actualAmount,
        reservedBalance: Math.max(0, currentReserved - reservation.amount),
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Record the usage transaction
    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId,
        type: "usage",
        amount: -actualAmount,
        description,
        projectId: reservation.project_id,
        operationType: reservation.operation_type,
        metadata: metadata ?? null,
      })
      .returning();

    // Mark reservation as settled
    await tx
      .update(creditReservations)
      .set({ status: "settled", settledAt: new Date() })
      .where(eq(creditReservations.id, reservationId));

    return transaction!;
  });
}

/**
 * Release a reservation without deducting any credits (e.g. the
 * operation was cancelled or skipped).
 */
async function releaseReservation(reservationId: string) {
  return await db.transaction(async (tx) => {
    const resResult = await tx.execute(
      sql`SELECT * FROM credit_reservations WHERE id = ${reservationId} FOR UPDATE`
    );
    const reservation = resResult.rows?.[0] as unknown as
      | CreditReservationRow
      | undefined;

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    if (reservation.status !== "active") {
      throw new Error(
        `Reservation ${reservationId} is already ${reservation.status}`
      );
    }

    const userId = reservation.user_id;

    // Lock and update balance
    const balResult = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    const balance = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (!balance) {
      throw new Error(`No credit balance found for user ${userId}`);
    }

    const currentReserved = balance.reserved_balance ?? 0;

    await tx
      .update(creditBalances)
      .set({
        reservedBalance: Math.max(0, currentReserved - reservation.amount),
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    // Mark reservation as released
    await tx
      .update(creditReservations)
      .set({ status: "released", settledAt: new Date() })
      .where(eq(creditReservations.id, reservationId));
  });
}

/**
 * Directly deduct credits from a user's balance (post-completion flow,
 * no prior reservation). Uses `SELECT … FOR UPDATE` to prevent races.
 */
async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  opts?: {
    projectId?: string;
    operationType?: string;
    provider?: string;
    model?: string;
    jobId?: string;
    type?: CreditTransactionType;
  }
) {
  return await db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    let row = result.rows?.[0] as unknown as CreditBalanceRow | undefined;

    // Auto-create balance for new users
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

    const currentBalance = row.balance ?? 0;

    if (currentBalance < amount) {
      throw new Error(
        `Insufficient credits. Balance: ${currentBalance}, required: ${amount}`
      );
    }

    await tx
      .update(creditBalances)
      .set({
        balance: currentBalance - amount,
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, userId));

    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId,
        type: opts?.type ?? "usage",
        amount: -amount,
        description,
        jobId: opts?.jobId ?? null,
        projectId: opts?.projectId ?? null,
        operationType: opts?.operationType ?? null,
        provider: opts?.provider ?? null,
        model: opts?.model ?? null,
      })
      .returning();

    return transaction!;
  });
}

/**
 * Add credits to a user's balance (purchase, refund, etc.).
 */
async function addCredits(
  userId: string,
  amount: number,
  description: string,
  type: CreditTransactionType = "purchase"
) {
  return await db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${userId} FOR UPDATE`
    );
    const existing = result.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (existing) {
      await tx
        .update(creditBalances)
        .set({
          balance: (existing.balance ?? 0) + amount,
          lastUpdated: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
    } else {
      await tx.insert(creditBalances).values({
        userId,
        balance: DEFAULT_FREE_CREDITS + amount,
        reservedBalance: 0,
      });
    }

    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId,
        type,
        amount,
        description,
      })
      .returning();

    return transaction!;
  });
}

/**
 * Grant credits from an admin account. Records the admin user ID in the
 * transaction metadata for auditing.
 */
async function adminGrantCredits(
  adminUserId: string,
  targetUserId: string,
  amount: number,
  reason: string
) {
  return await db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${targetUserId} FOR UPDATE`
    );
    const existing = result.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (existing) {
      await tx
        .update(creditBalances)
        .set({
          balance: (existing.balance ?? 0) + amount,
          lastUpdated: new Date(),
        })
        .where(eq(creditBalances.userId, targetUserId));
    } else {
      await tx.insert(creditBalances).values({
        userId: targetUserId,
        balance: DEFAULT_FREE_CREDITS + amount,
        reservedBalance: 0,
      });
    }

    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId: targetUserId,
        type: "admin_grant",
        amount,
        description: reason,
        adminUserId,
        metadata: { grantedBy: adminUserId },
      })
      .returning();

    return transaction!;
  });
}

/**
 * Admin-initiated deduction. Records the admin user ID in the
 * transaction for auditing.
 */
async function adminDeductCredits(
  adminUserId: string,
  targetUserId: string,
  amount: number,
  reason: string
) {
  return await db.transaction(async (tx) => {
    const result = await tx.execute(
      sql`SELECT * FROM credit_balances WHERE user_id = ${targetUserId} FOR UPDATE`
    );
    const row = result.rows?.[0] as unknown as CreditBalanceRow | undefined;

    if (!row) {
      throw new Error(`No credit balance found for user ${targetUserId}`);
    }

    const currentBalance = row.balance ?? 0;

    if (currentBalance < amount) {
      throw new Error(
        `Insufficient credits. Balance: ${currentBalance}, required: ${amount}`
      );
    }

    await tx
      .update(creditBalances)
      .set({
        balance: currentBalance - amount,
        lastUpdated: new Date(),
      })
      .where(eq(creditBalances.userId, targetUserId));

    const [transaction] = await tx
      .insert(creditTransactions)
      .values({
        userId: targetUserId,
        type: "admin_deduction",
        amount: -amount,
        description: reason,
        adminUserId,
        metadata: { deductedBy: adminUserId },
      })
      .returning();

    return transaction!;
  });
}

/**
 * List credit transactions for a user with optional filters.
 */
async function getTransactions(
  userId: string,
  opts?: {
    limit?: number;
    offset?: number;
    type?: string;
    projectId?: string;
  }
) {
  const conditions = [eq(creditTransactions.userId, userId)];

  if (opts?.type) {
    conditions.push(eq(creditTransactions.type, opts.type));
  }

  if (opts?.projectId) {
    conditions.push(eq(creditTransactions.projectId, opts.projectId));
  }

  return db
    .select()
    .from(creditTransactions)
    .where(and(...conditions))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

/**
 * Clean up expired reservations.
 *
 * Finds all `active` reservations whose `expires_at` is in the past,
 * releases the reserved balance, and marks them as `expired`.
 *
 * This should be called periodically (e.g. every 5 minutes via a cron
 * worker or BullMQ repeatable job).
 */
async function cleanupExpiredReservations() {
  const now = new Date();

  // Find all expired active reservations
  const expired = await db
    .select()
    .from(creditReservations)
    .where(
      and(
        eq(creditReservations.status, "active"),
        lt(creditReservations.expiresAt, now)
      )
    );

  if (expired.length === 0) {
    return { released: 0 };
  }

  let released = 0;

  for (const reservation of expired) {
    try {
      await db.transaction(async (tx) => {
        // Re-check status under lock to avoid double-release
        const resResult = await tx.execute(
          sql`SELECT * FROM credit_reservations WHERE id = ${reservation.id} AND status = 'active' FOR UPDATE`
        );
        const row = resResult.rows?.[0] as unknown as CreditReservationRow | undefined;

        if (!row) {
          // Already settled/released by another process
          return;
        }

        // Release the reserved balance
        const balResult = await tx.execute(
          sql`SELECT * FROM credit_balances WHERE user_id = ${row.user_id} FOR UPDATE`
        );
        const balance = balResult.rows?.[0] as unknown as CreditBalanceRow | undefined;

        if (balance) {
          const currentReserved = balance.reserved_balance ?? 0;
          await tx
            .update(creditBalances)
            .set({
              reservedBalance: Math.max(0, currentReserved - row.amount),
              lastUpdated: new Date(),
            })
            .where(eq(creditBalances.userId, row.user_id));
        }

        // Mark as expired
        await tx
          .update(creditReservations)
          .set({ status: "expired", settledAt: new Date() })
          .where(eq(creditReservations.id, reservation.id));

        released++;
      });
    } catch (err) {
      console.error(
        `[CreditService] Failed to release expired reservation ${reservation.id}:`,
        err
      );
    }
  }

  if (released > 0) {
    console.warn(
      `[CreditService] Released ${released} expired reservation(s)`
    );
  }

  return { released };
}

export const creditService = {
  getBalance,
  getAvailableBalance,
  checkSufficientCredits,
  reserveCredits,
  settleReservation,
  releaseReservation,
  deductCredits,
  addCredits,
  adminGrantCredits,
  adminDeductCredits,
  getTransactions,
  cleanupExpiredReservations,
};
