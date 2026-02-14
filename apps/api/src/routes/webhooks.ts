import { Hono } from "hono";
import { getPaymentService } from "@contenthq/payment";
import { db } from "@contenthq/db/client";
import { paymentOrders, creditBalances, creditTransactions } from "@contenthq/db/schema";
import { eq, sql } from "drizzle-orm";
import { env } from "../lib/env";

export const webhookRoutes = new Hono();

webhookRoutes.post("/razorpay", async (c) => {
  if (!env.PAYMENT_ENABLED) {
    return c.json({ error: "Payments disabled" }, 400);
  }

  let paymentService;
  try {
    paymentService = getPaymentService();
  } catch {
    return c.json({ error: "Payment service not configured" }, 500);
  }

  const signature = c.req.header("x-razorpay-signature");
  if (!signature) {
    return c.json({ error: "Missing signature" }, 400);
  }

  const rawBody = await c.req.text();

  let event;
  try {
    event = await paymentService.verifyAndParseWebhook("razorpay", rawBody, signature);
  } catch (err) {
    console.error("[Webhook] Razorpay signature verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  console.warn(`[Webhook] Razorpay event: ${event.eventType}, orderId=${event.orderId}, paymentId=${event.paymentId}, amount=${event.amount}`);

  if (event.eventType === "payment.captured") {
    // Find the order by externalOrderId
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.externalOrderId, event.orderId));

    if (!order) {
      console.warn(`[Webhook] Order not found for externalOrderId=${event.orderId}`);
      return c.json({ status: "order_not_found" }, 200); // Return 200 to prevent retry
    }

    // Idempotency: skip if already captured
    if (order.status === "captured") {
      console.warn(`[Webhook] Order ${order.id} already captured, skipping`);
      return c.json({ status: "already_processed" }, 200);
    }

    // Atomically: update order + add credits + record transaction
    await db.transaction(async (tx) => {
      // Lock the credit balance row
      const balanceResult = await tx.execute(
        sql`SELECT * FROM credit_balances WHERE user_id = ${order.userId} FOR UPDATE`
      );
      let currentBalance = balanceResult.rows?.[0] as { balance: number } | undefined;

      if (!currentBalance) {
        // Create balance if not exists
        await tx.insert(creditBalances).values({
          userId: order.userId,
          balance: 0,
        });
        currentBalance = { balance: 0 };
      }

      // Add credits
      await tx
        .update(creditBalances)
        .set({
          balance: (currentBalance.balance ?? 0) + order.credits,
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
          description: `Purchased ${order.credits} credits`,
          metadata: {
            paymentOrderId: order.id,
            provider: order.provider,
            externalPaymentId: event.paymentId,
            amount: order.amount,
            currency: order.currency,
          },
        })
        .returning();

      // Update order status
      await tx
        .update(paymentOrders)
        .set({
          status: "captured",
          externalPaymentId: event.paymentId,
          creditTransactionId: transaction.id,
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(paymentOrders.id, order.id));
    });

    console.warn(`[Webhook] Credits added: userId=${order.userId}, credits=${order.credits}, orderId=${order.id}`);
  } else if (event.eventType === "payment.failed") {
    const [order] = await db
      .select()
      .from(paymentOrders)
      .where(eq(paymentOrders.externalOrderId, event.orderId));

    if (order && order.status !== "captured") {
      await db
        .update(paymentOrders)
        .set({
          status: "failed",
          externalPaymentId: event.paymentId,
          failureReason: "Payment failed",
          updatedAt: new Date(),
        })
        .where(eq(paymentOrders.id, order.id));
      console.warn(`[Webhook] Payment failed for order ${order.id}`);
    }
  }

  return c.json({ status: "ok" }, 200);
});
