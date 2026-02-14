import type {
  IPaymentProvider,
  PaymentServiceConfig,
  CreateOrderInput,
  CreateOrderResult,
  VerifyPaymentInput,
  WebhookEvent,
  PaymentProviderHealth,
  PaymentProvider,
} from "./types";
import { RazorpayProvider } from "./providers/razorpay";

let instance: PaymentService | null = null;

export class PaymentService {
  private providers: Map<PaymentProvider, IPaymentProvider> = new Map();
  private enabled: boolean = false;

  constructor(config: PaymentServiceConfig) {
    if (config.razorpay) {
      this.providers.set("razorpay", new RazorpayProvider(config.razorpay));
      this.enabled = true;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getProvider(provider: PaymentProvider): IPaymentProvider {
    const p = this.providers.get(provider);
    if (!p) throw new Error(`Payment provider ${provider} is not configured`);
    return p;
  }

  selectProvider(preferred?: PaymentProvider): PaymentProvider {
    if (preferred && this.providers.has(preferred)) return preferred;
    const first = this.providers.keys().next().value;
    if (!first) throw new Error("No payment providers configured");
    return first;
  }

  async createProviderOrder(
    provider: PaymentProvider,
    input: CreateOrderInput
  ): Promise<CreateOrderResult> {
    return this.getProvider(provider).createOrder(input);
  }

  async verifyPayment(
    provider: PaymentProvider,
    input: VerifyPaymentInput
  ): Promise<boolean> {
    return this.getProvider(provider).verifyPayment(input);
  }

  async verifyAndParseWebhook(
    provider: PaymentProvider,
    rawBody: string,
    signature: string
  ): Promise<WebhookEvent> {
    const p = this.getProvider(provider);
    const valid = await p.verifyWebhookSignature(rawBody, signature);
    if (!valid) throw new Error("Invalid webhook signature");
    return p.parseWebhookEvent(rawBody);
  }

  getClientKey(provider: PaymentProvider): string {
    return this.getProvider(provider).getClientKey();
  }

  async getAvailableProviders(): Promise<
    Array<{ provider: PaymentProvider; health: PaymentProviderHealth }>
  > {
    const results = [];
    for (const [name, p] of this.providers) {
      const health = await p.checkHealth();
      results.push({ provider: name, health });
    }
    return results;
  }
}

export function initializePaymentService(config: PaymentServiceConfig): PaymentService {
  instance = new PaymentService(config);
  return instance;
}

export function getPaymentService(): PaymentService {
  if (!instance)
    throw new Error(
      "PaymentService not initialized. Call initializePaymentService() first."
    );
  return instance;
}
