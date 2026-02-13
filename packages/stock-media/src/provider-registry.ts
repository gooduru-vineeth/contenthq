/**
 * Stock Media Provider Registry
 *
 * Central registry for all stock media provider adapters.
 * Implements the Registry pattern for provider management.
 */

import type {
  StockMediaProvider,
  StockMediaProviderAdapter,
  StockMediaType,
} from "./types";

class StockMediaProviderRegistry {
  private adapters: Map<string, StockMediaProviderAdapter> = new Map();

  register(adapter: StockMediaProviderAdapter): void {
    if (this.adapters.has(adapter.provider.id)) {
      console.warn(
        `Provider "${adapter.provider.id}" is already registered. Overwriting.`
      );
    }
    this.adapters.set(adapter.provider.id, adapter);
  }

  unregister(providerId: string): boolean {
    return this.adapters.delete(providerId);
  }

  getAdapter(providerId: string): StockMediaProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  hasProvider(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  getAllProviders(): StockMediaProvider[] {
    return Array.from(this.adapters.values()).map((a) => a.provider);
  }

  getProvidersByType(type: StockMediaType): StockMediaProvider[] {
    return Array.from(this.adapters.values())
      .filter(
        (a) =>
          a.provider.status === "active" &&
          a.provider.supportedTypes.includes(type)
      )
      .map((a) => a.provider);
  }

  getActiveAdapters(): StockMediaProviderAdapter[] {
    return Array.from(this.adapters.values()).filter(
      (a) => a.provider.status === "active"
    );
  }

  getAdaptersByType(type: StockMediaType): StockMediaProviderAdapter[] {
    return Array.from(this.adapters.values()).filter(
      (a) =>
        a.provider.status === "active" &&
        a.provider.supportedTypes.includes(type)
    );
  }

  get count(): number {
    return this.adapters.size;
  }

  clear(): void {
    this.adapters.clear();
  }
}

// Singleton instance
export const stockMediaProviderRegistry = new StockMediaProviderRegistry();

export { StockMediaProviderRegistry };
