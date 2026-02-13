/**
 * Stock Media Provider Factory
 *
 * Creates and initializes provider adapter instances from configuration.
 * To add a new provider:
 * 1. Add its configuration to STOCK_MEDIA_PROVIDERS array
 * 2. Create an adapter class that extends BaseStockMediaAdapter
 * 3. Add the adapter class to ADAPTER_MAP
 * 4. Set the required environment variable for the API key
 */

import { stockMediaProviderRegistry } from "./provider-registry";
import type { StockMediaProviderConfig } from "./types";

import { PexelsAdapter } from "./providers/pexels-adapter";
import { UnsplashAdapter } from "./providers/unsplash-adapter";
import { PixabayAdapter } from "./providers/pixabay-adapter";
import { StoryblocksAdapter } from "./providers/storyblocks-adapter";

/**
 * Provider configurations
 */
export const STOCK_MEDIA_PROVIDERS: StockMediaProviderConfig[] = [
  {
    id: "pexels",
    name: "Pexels",
    slug: "pexels",
    icon: "pexels",
    supportedTypes: ["image", "video"],
    apiBaseUrl: "https://api.pexels.com/v1",
    apiKeyEnvVar: "PEXELS_API_KEY",
    rateLimit: {
      requestsPerMinute: 200,
      requestsPerDay: 20000,
    },
    attributionRequired: false,
    attributionTemplate: "Photo by {photographer} on Pexels",
  },
  {
    id: "unsplash",
    name: "Unsplash",
    slug: "unsplash",
    icon: "unsplash",
    supportedTypes: ["image"],
    apiBaseUrl: "https://api.unsplash.com",
    apiKeyEnvVar: "UNSPLASH_ACCESS_KEY",
    rateLimit: {
      requestsPerMinute: 50,
    },
    attributionRequired: true,
    attributionTemplate: "Photo by {photographer} on Unsplash",
  },
  {
    id: "pixabay",
    name: "Pixabay",
    slug: "pixabay",
    icon: "pixabay",
    supportedTypes: ["image", "video"],
    apiBaseUrl: "https://pixabay.com/api",
    apiKeyEnvVar: "PIXABAY_API_KEY",
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 100000,
    },
    attributionRequired: false,
    attributionTemplate: "Image by {photographer} from Pixabay",
  },
  {
    id: "storyblocks",
    name: "Storyblocks",
    slug: "storyblocks",
    icon: "storyblocks",
    supportedTypes: ["image", "video"],
    apiBaseUrl: "https://api.storyblocks.com/v1",
    apiKeyEnvVar: "STORYBLOCKS_API_KEY",
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
    },
    attributionRequired: false,
    attributionTemplate: "Content by {photographer} from Storyblocks",
  },
];

type AdapterConstructor = new (
  config: StockMediaProviderConfig
) => PexelsAdapter | UnsplashAdapter | PixabayAdapter | StoryblocksAdapter;

const ADAPTER_MAP: Record<string, AdapterConstructor> = {
  pexels: PexelsAdapter,
  unsplash: UnsplashAdapter,
  pixabay: PixabayAdapter,
  storyblocks: StoryblocksAdapter,
};

let initialized = false;

export function initializeStockMediaProviders(): void {
  if (initialized) {
    return;
  }

  for (const config of STOCK_MEDIA_PROVIDERS) {
    const AdapterClass = ADAPTER_MAP[config.id];

    if (!AdapterClass) {
      console.warn(
        `No adapter class found for provider "${config.id}". ` +
          `Add it to ADAPTER_MAP in provider-factory.ts`
      );
      continue;
    }

    try {
      const adapter = new AdapterClass(config);
      stockMediaProviderRegistry.register(adapter);
    } catch (error) {
      console.error(`Failed to initialize provider "${config.id}":`, error);
    }
  }

  initialized = true;
}

export function getProviderConfig(
  providerId: string
): StockMediaProviderConfig | undefined {
  return STOCK_MEDIA_PROVIDERS.find((p) => p.id === providerId);
}

export function getAllProviderConfigs(): StockMediaProviderConfig[] {
  return [...STOCK_MEDIA_PROVIDERS];
}

export function isProviderConfigured(providerId: string): boolean {
  const config = getProviderConfig(providerId);
  if (!config) return false;
  return !!process.env[config.apiKeyEnvVar];
}

export function getConfiguredProviderIds(): string[] {
  return STOCK_MEDIA_PROVIDERS.filter(
    (config) => !!process.env[config.apiKeyEnvVar]
  ).map((config) => config.id);
}

export function resetProviderInitialization(): void {
  stockMediaProviderRegistry.clear();
  initialized = false;
}
