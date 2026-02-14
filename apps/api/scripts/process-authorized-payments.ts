#!/usr/bin/env tsx
/**
 * One-time script to process existing "authorized" payments
 * that weren't processed by the webhook (before the fix).
 */

import { db } from "@contenthq/db/client";
import { paymentOrders, creditBalances, creditTransactions } from "@contenthq/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function processAuthorizedPayments() {
  console.warn("[Script] Finding authorized payments that haven't been processed...");

  // Find all authorized payments that don't have a credit transaction
  const authorizedOrders = await db
    .select()
    .from(paymentOrders)
    .where(
      and(
        eq(paymentOrders.status, "authorized"),
        eq(paymentOrders.orderType, "credit_pack"), // Only process credit packs
        sql`${paymentOrders.creditTransactionId} IS NULL` // Not yet processed
      )
    );

  if (authorizedOrders.length === 0) {
    console.warn("[Script] No authorized payments found. Nothing to do!");
    return;
  }

  console.warn(`[Script] Found ${authorizedOrders.length} authorized payment(s) to process`);

  for (const order of authorizedOrders) {
    console.warn(`[Script] Processing order ${order.id} (${order.externalOrderId})`);
    console.warn(`  - User: ${order.userId}`);
    console.warn(`  - Credits: ${order.credits}`);
    console.warn(`  - Amount: ${order.currency} ${order.amount}`);

    try {
      await db.transaction(async (tx) => {
        // Lock the credit balance row
        const balanceResult = await tx.execute(
          sql`SELECT * FROM credit_balances WHERE user_id = ${order.userId} FOR UPDATE`
        );
        let currentBalance = balanceResult.rows?.[0] as { balance: number } | undefined;

        if (!currentBalance) {
          // Create balance if not exists
          console.warn(`  - Creating new credit balance for user ${order.userId}`);
          await tx.insert(creditBalances).values({
            userId: order.userId,
            balance: 0,
          });
          currentBalance = { balance: 0 };
        }

        // Add credits
        const newBalance = (currentBalance.balance ?? 0) + order.credits;
        console.warn(`  - Updating balance: ${currentBalance.balance} → ${newBalance}`);

        await tx
          .update(creditBalances)
          .set({
            balance: newBalance,
            lastUpdated: new Date(),
          })
          .where(eq(creditBalances.userId, order.userId));

        // Record transaction
        const [transaction] = await tx
          .insert(creditTransactions)
          .values({
            userId: order.userId,
            type: "purchase",
            amount: order.credits,
            description: `Purchased ${order.credits} credits (manual processing)`,
            metadata: {
              paymentOrderId: order.id,
              provider: order.provider,
              externalPaymentId: order.externalPaymentId,
              amount: order.amount,
              currency: order.currency,
              note: "Manually processed authorized payment",
            },
          })
          .returning();

        // Update order to mark as processed
        await tx
          .update(paymentOrders)
          .set({
            creditTransactionId: transaction.id,
            updatedAt: new Date(),
          })
          .where(eq(paymentOrders.id, order.id));

        console.warn(`  ✅ Successfully added ${order.credits} credits to user ${order.userId}`);
      });
    } catch (error) {
      console.error(`  ❌ Failed to process order ${order.id}:`, error);
    }
  }

  console.warn("[Script] Done!");
  process.exit(0);
}

processAuthorizedPayments().catch((err) => {
  console.error("[Script] Fatal error:", err);
  process.exit(1);
});
