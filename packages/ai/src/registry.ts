import type { AIProviderConfig } from "./types";

interface ProviderEntry {
  config: AIProviderConfig;
  isDefault: boolean;
}

class AIProviderRegistry {
  private providers = new Map<string, Map<string, ProviderEntry>>();

  register(type: string, name: string, config: AIProviderConfig, isDefault = false): void {
    if (!this.providers.has(type)) {
      this.providers.set(type, new Map());
    }
    this.providers.get(type)!.set(name, { config, isDefault });
  }

  getProvider(type: string, name?: string): AIProviderConfig {
    const typeProviders = this.providers.get(type);
    if (!typeProviders || typeProviders.size === 0) {
      throw new Error(`No providers registered for type: ${type}`);
    }

    if (name) {
      const provider = typeProviders.get(name);
      if (!provider) {
        throw new Error(`Provider ${name} not found for type: ${type}`);
      }
      return provider.config;
    }

    return this.getDefault(type);
  }

  getDefault(type: string): AIProviderConfig {
    const typeProviders = this.providers.get(type);
    if (!typeProviders) {
      throw new Error(`No providers registered for type: ${type}`);
    }

    for (const [, entry] of typeProviders) {
      if (entry.isDefault) return entry.config;
    }

    // Return first provider if no default set
    return typeProviders.values().next().value!.config;
  }

  listProviders(type?: string): AIProviderConfig[] {
    if (type) {
      const typeProviders = this.providers.get(type);
      return typeProviders
        ? Array.from(typeProviders.values()).map((e) => e.config)
        : [];
    }

    const all: AIProviderConfig[] = [];
    for (const typeProviders of this.providers.values()) {
      for (const entry of typeProviders.values()) {
        all.push(entry.config);
      }
    }
    return all;
  }
}

export const registry = new AIProviderRegistry();
