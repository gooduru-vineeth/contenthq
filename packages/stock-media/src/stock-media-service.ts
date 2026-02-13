/**
 * Stock Media Service
 *
 * Provides unified search across all registered stock media providers.
 * Handles parallel searches for "All" provider selection and result aggregation.
 */

import { stockMediaProviderRegistry } from "./provider-registry";
import { initializeStockMediaProviders } from "./provider-factory";
import type {
  StockMediaSearchOptions,
  StockMediaSearchResponse,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
  StockMediaProvider,
  StockMediaType,
  ProviderResultMeta,
} from "./types";

let providersInitialized = false;

function ensureInitialized(): void {
  if (!providersInitialized) {
    initializeStockMediaProviders();
    providersInitialized = true;
  }
}

class StockMediaService {
  async search(
    options: StockMediaSearchOptions
  ): Promise<StockMediaSearchResponse> {
    ensureInitialized();

    const { providerId, type = "image", page = 1, perPage = 20 } = options;

    const searchAll = !providerId || providerId === "all";
    const adapters = searchAll
      ? stockMediaProviderRegistry.getAdaptersByType(type)
      : [stockMediaProviderRegistry.getAdapter(providerId)].filter(Boolean);

    if (adapters.length === 0) {
      return {
        results: [],
        total: 0,
        page,
        perPage,
        hasMore: false,
        providerResults: [],
      };
    }

    const perPagePerProvider = searchAll
      ? Math.ceil(perPage / adapters.length)
      : perPage;

    const searchPromises = adapters.map(async (adapter) => {
      try {
        const response = await adapter!.search({
          ...options,
          perPage: perPagePerProvider,
        });

        return {
          providerId: adapter!.provider.id,
          providerName: adapter!.provider.name,
          results: response.results,
          total: response.total,
          hasMore: response.hasMore,
        };
      } catch (error) {
        console.error(`Error searching ${adapter!.provider.name}:`, error);
        return {
          providerId: adapter!.provider.id,
          providerName: adapter!.provider.name,
          results: [] as NormalizedMediaResult[],
          total: 0,
          hasMore: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const providerResponses = await Promise.all(searchPromises);

    const providerResults: ProviderResultMeta[] = providerResponses.map(
      (r) => ({
        providerId: r.providerId,
        providerName: r.providerName,
        total: r.total,
        error: r.error,
      })
    );

    const totalCount = providerResponses.reduce((sum, r) => sum + r.total, 0);
    const anyHasMore = providerResponses.some((r) => r.hasMore);

    let results: NormalizedMediaResult[];
    if (searchAll && providerResponses.length > 1) {
      results = this.interleaveResults(
        providerResponses.map((r) => r.results)
      );
    } else {
      results = providerResponses.flatMap((r) => r.results);
    }

    results = results.slice(0, perPage);

    return {
      results,
      total: totalCount,
      page,
      perPage,
      hasMore: anyHasMore || results.length < totalCount,
      providerResults,
    };
  }

  async getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse> {
    ensureInitialized();

    const { providerId, type = "image", page = 1, perPage = 20 } = options;

    const fetchAll = !providerId || providerId === "all";
    const adapters = fetchAll
      ? stockMediaProviderRegistry.getAdaptersByType(type)
      : [stockMediaProviderRegistry.getAdapter(providerId)].filter(Boolean);

    if (adapters.length === 0) {
      return {
        results: [],
        total: 0,
        page,
        perPage,
        hasMore: false,
        providerResults: [],
      };
    }

    const perPagePerProvider = fetchAll
      ? Math.ceil(perPage / adapters.length)
      : perPage;

    const fetchPromises = adapters.map(async (adapter) => {
      try {
        const response = await adapter!.getCurated({
          ...options,
          perPage: perPagePerProvider,
        });

        return {
          providerId: adapter!.provider.id,
          providerName: adapter!.provider.name,
          results: response.results,
          total: response.total,
          hasMore: response.hasMore,
        };
      } catch (error) {
        console.error(
          `Error fetching curated from ${adapter!.provider.name}:`,
          error
        );
        return {
          providerId: adapter!.provider.id,
          providerName: adapter!.provider.name,
          results: [] as NormalizedMediaResult[],
          total: 0,
          hasMore: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const providerResponses = await Promise.all(fetchPromises);

    const providerResults: ProviderResultMeta[] = providerResponses.map(
      (r) => ({
        providerId: r.providerId,
        providerName: r.providerName,
        total: r.total,
        error: r.error,
      })
    );

    const totalCount = providerResponses.reduce((sum, r) => sum + r.total, 0);
    const anyHasMore = providerResponses.some((r) => r.hasMore);

    let results: NormalizedMediaResult[];
    if (fetchAll && providerResponses.length > 1) {
      results = this.interleaveResults(
        providerResponses.map((r) => r.results)
      );
    } else {
      results = providerResponses.flatMap((r) => r.results);
    }

    results = results.slice(0, perPage);

    return {
      results,
      total: totalCount,
      page,
      perPage,
      hasMore: anyHasMore || results.length < totalCount,
      providerResults,
    };
  }

  getProviders(type?: StockMediaType): StockMediaProvider[] {
    ensureInitialized();

    if (type) {
      return stockMediaProviderRegistry.getProvidersByType(type);
    }

    return stockMediaProviderRegistry
      .getAllProviders()
      .filter((p) => p.status === "active");
  }

  async getAsset(compositeId: string): Promise<NormalizedMediaResult | null> {
    ensureInitialized();

    const underscoreIndex = compositeId.indexOf("_");
    if (underscoreIndex === -1) {
      console.warn("Invalid composite ID format:", compositeId);
      return null;
    }

    const providerSlug = compositeId.substring(0, underscoreIndex);
    const externalId = compositeId.substring(underscoreIndex + 1);

    const provider = stockMediaProviderRegistry
      .getAllProviders()
      .find((p) => p.slug === providerSlug);

    if (!provider) {
      console.warn("Provider not found for slug:", providerSlug);
      return null;
    }

    const adapter = stockMediaProviderRegistry.getAdapter(provider.id);
    if (!adapter) {
      console.warn("Adapter not found for provider:", provider.id);
      return null;
    }

    return adapter.getAsset(externalId);
  }

  async getDownloadUrl(
    compositeId: string,
    size: "small" | "medium" | "large" | "original" = "original"
  ): Promise<string | null> {
    ensureInitialized();

    const underscoreIndex = compositeId.indexOf("_");
    if (underscoreIndex === -1) {
      return null;
    }

    const providerSlug = compositeId.substring(0, underscoreIndex);
    const externalId = compositeId.substring(underscoreIndex + 1);

    const provider = stockMediaProviderRegistry
      .getAllProviders()
      .find((p) => p.slug === providerSlug);

    if (!provider) {
      return null;
    }

    const adapter = stockMediaProviderRegistry.getAdapter(provider.id);
    if (!adapter) {
      return null;
    }

    try {
      return await adapter.getDownloadUrl(externalId, size);
    } catch (error) {
      console.error("Error getting download URL:", error);
      return null;
    }
  }

  private interleaveResults(
    resultArrays: NormalizedMediaResult[][]
  ): NormalizedMediaResult[] {
    const interleaved: NormalizedMediaResult[] = [];
    const maxLength = Math.max(...resultArrays.map((arr) => arr.length), 0);

    for (let i = 0; i < maxLength; i++) {
      for (const results of resultArrays) {
        if (i < results.length) {
          interleaved.push(results[i]);
        }
      }
    }

    return interleaved;
  }
}

export const stockMediaService = new StockMediaService();

export { StockMediaService };
