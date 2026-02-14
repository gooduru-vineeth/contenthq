export type PaymentProvider = "razorpay";
export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export interface CreateOrderInput {
  amount: number; // in smallest currency unit (paise for INR, cents for USD)
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  externalOrderId: string;
  providerData: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  externalOrderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEvent {
  eventType: "payment.captured" | "payment.failed" | "payment.authorized" | "refund.created";
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  raw: unknown;
}

export interface PaymentProviderHealth {
  provider: PaymentProvider;
  healthy: boolean;
  latencyMs: number;
  lastCheckedAt: Date;
}

export interface IPaymentProvider {
  readonly provider: PaymentProvider;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<boolean>;
  verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean>;
  parseWebhookEvent(rawBody: string): Promise<WebhookEvent>;
  fetchOrderStatus(externalOrderId: string): Promise<PaymentStatus>;
  checkHealth(): Promise<PaymentProviderHealth>;
  getClientKey(): string;
}

export interface PaymentServiceConfig {
  razorpay?: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
}
