import { initializePaymentService } from "@contenthq/payment";
import { env } from "./env";

export function setupPaymentService() {
  if (!env.PAYMENT_ENABLED) {
    console.warn("[Payment] Payment service is disabled (PAYMENT_ENABLED=false)");
    return;
  }

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn("[Payment] Payment service enabled but Razorpay credentials are missing. Payments will not work.");
    return;
  }

  initializePaymentService({
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      keySecret: env.RAZORPAY_KEY_SECRET,
      webhookSecret: env.RAZORPAY_WEBHOOK_SECRET,
    },
  });

  console.warn("[Payment] Payment service initialized with Razorpay provider");
}
