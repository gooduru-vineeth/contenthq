import Razorpay from "razorpay";
import crypto from "node:crypto";
import type {
  IPaymentProvider,
  CreateOrderInput,
  CreateOrderResult,
  VerifyPaymentInput,
  WebhookEvent,
  PaymentProviderHealth,
  PaymentStatus,
} from "../types";

export class RazorpayProvider implements IPaymentProvider {
  readonly provider = "razorpay" as const;
  private instance: InstanceType<typeof Razorpay>;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(config: { keyId: string; keySecret: string; webhookSecret: string }) {
    this.keyId = config.keyId;
    this.keySecret = config.keySecret;
    this.webhookSecret = config.webhookSecret;
    this.instance = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const order = await this.instance.orders.create({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
    return {
      externalOrderId: order.id,
      providerData: order as unknown as Record<string, unknown>,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<boolean> {
    const body = `${input.externalOrderId}|${input.paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(body)
      .digest("hex");
    return expectedSignature === input.signature;
  }

  async verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody)
      .digest("hex");
    return expectedSignature === signature;
  }

  async parseWebhookEvent(rawBody: string): Promise<WebhookEvent> {
    const body = JSON.parse(rawBody);
    const event = body.event as string;
    const payload = body.payload?.payment?.entity;

    let status: PaymentStatus;
    switch (event) {
      case "payment.captured":
        status = "captured";
        break;
      case "payment.failed":
        status = "failed";
        break;
      case "payment.authorized":
        status = "authorized";
        break;
      default:
        status = "created";
        break;
    }

    let eventType: WebhookEvent["eventType"];
    if (event === "refund.created") {
      eventType = "refund.created";
    } else {
      eventType = event as WebhookEvent["eventType"];
    }

    return {
      eventType,
      paymentId: payload?.id ?? "",
      orderId: payload?.order_id ?? "",
      amount: payload?.amount ?? 0,
      currency: payload?.currency ?? "INR",
      status,
      raw: body,
    };
  }

  async fetchOrderStatus(externalOrderId: string): Promise<PaymentStatus> {
    const order = await this.instance.orders.fetch(externalOrderId);
    const status = (order as unknown as { status: string }).status;
    if (status === "paid") return "captured";
    if (status === "attempted") return "authorized";
    if (status === "created") return "created";
    return "failed";
  }

  async checkHealth(): Promise<PaymentProviderHealth> {
    const start = Date.now();
    try {
      await this.instance.orders.all({ count: 1 });
      return {
        provider: "razorpay",
        healthy: true,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date(),
      };
    } catch {
      return {
        provider: "razorpay",
        healthy: false,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date(),
      };
    }
  }

  getClientKey(): string {
    return this.keyId;
  }
}
