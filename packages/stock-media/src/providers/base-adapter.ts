/**
 * Base Stock Media Provider Adapter
 *
 * Abstract base class providing common functionality for all provider adapters.
 * Each provider (Pexels, Unsplash, etc.) extends this class and implements
 * the abstract methods with provider-specific logic.
 */

import type {
  StockMediaProvider,
  StockMediaProviderAdapter,
  StockMediaProviderConfig,
  StockMediaSearchOptions,
  StockMediaSearchResponse,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
  MediaOrientation,
} from "../types";

export abstract class BaseStockMediaAdapter
  implements StockMediaProviderAdapter
{
  protected config: StockMediaProviderConfig;
  public provider: StockMediaProvider;

  constructor(config: StockMediaProviderConfig) {
    this.config = config;
    this.provider = {
      id: config.id,
      name: config.name,
      slug: config.slug,
      icon: config.icon,
      supportedTypes: config.supportedTypes,
      status: "active",
      attributionRequired: config.attributionRequired,
      attributionTemplate: config.attributionTemplate,
    };
  }

  /**
   * Get API key from environment variables
   */
  protected getApiKey(): string {
    const key = process.env[this.config.apiKeyEnvVar];
    if (!key) {
      throw new Error(
        `API key not configured for ${this.config.name}. ` +
          `Please set the ${this.config.apiKeyEnvVar} environment variable.`
      );
    }
    return key;
  }

  /**
   * Check if API key is available (without throwing)
   */
  protected hasApiKey(): boolean {
    return !!process.env[this.config.apiKeyEnvVar];
  }

  /**
   * Detect orientation from dimensions
   */
  protected detectOrientation(
    width: number,
    height: number
  ): MediaOrientation {
    const ratio = width / height;
    if (ratio > 1.1) return "landscape";
    if (ratio < 0.9) return "portrait";
    return "square";
  }

  /**
   * Generate a unique ID prefixed with provider slug
   */
  protected generateId(externalId: string): string {
    return `${this.config.slug}_${externalId}`;
  }

  /**
   * Parse a composite ID back to provider slug and external ID
   */
  protected static parseCompositeId(
    compositeId: string
  ): { providerSlug: string; externalId: string } | null {
    const underscoreIndex = compositeId.indexOf("_");
    if (underscoreIndex === -1) return null;

    return {
      providerSlug: compositeId.substring(0, underscoreIndex),
      externalId: compositeId.substring(underscoreIndex + 1),
    };
  }

  /**
   * Format attribution text using the provider's template
   */
  protected formatAttribution(photographer?: string): string | undefined {
    if (!this.config.attributionRequired || !this.config.attributionTemplate) {
      return undefined;
    }
    return this.config.attributionTemplate.replace(
      "{photographer}",
      photographer || "Unknown"
    );
  }

  /**
   * Map orientation string to API-specific orientation parameter
   */
  protected mapOrientationToApi(
    orientation?: MediaOrientation
  ): string | undefined {
    return orientation;
  }

  /**
   * Create an empty search response
   */
  protected createEmptyResponse(
    page: number = 1,
    perPage: number = 20
  ): StockMediaSearchResponse {
    return {
      results: [],
      total: 0,
      page,
      perPage,
      hasMore: false,
    };
  }

  protected abstract makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T>;

  abstract search(
    options: StockMediaSearchOptions
  ): Promise<StockMediaSearchResponse>;

  abstract getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse>;

  abstract getAsset(externalId: string): Promise<NormalizedMediaResult | null>;

  abstract getDownloadUrl(
    externalId: string,
    size?: "small" | "medium" | "large" | "original"
  ): Promise<string>;
}
