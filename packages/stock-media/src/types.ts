// Stock Media Provider Types
// Defines the provider-agnostic interface for stock media sources

/**
 * Media types a stock provider can support
 */
export type StockMediaType = "image" | "video";

/**
 * Media orientation types
 */
export type MediaOrientation = "all" | "portrait" | "landscape" | "square";

/**
 * Provider operational status
 */
export type ProviderStatus = "active" | "maintenance" | "disabled";

/**
 * Stock media provider definition
 */
export interface StockMediaProvider {
  /** Unique provider identifier */
  id: string;
  /** Human-readable provider name */
  name: string;
  /** URL-safe slug for the provider */
  slug: string;
  /** Icon identifier for the provider */
  icon: string;
  /** Media types this provider supports */
  supportedTypes: StockMediaType[];
  /** Provider operational status */
  status: ProviderStatus;
  /** Whether attribution is required for this provider */
  attributionRequired: boolean;
  /** Default attribution text template */
  attributionTemplate?: string;
}

/**
 * Search options for stock media queries
 */
export interface StockMediaSearchOptions {
  /** Search query string (optional for curated/trending fetches) */
  query?: string;
  /** Filter by media type */
  type?: StockMediaType;
  /** Filter by orientation */
  orientation?: MediaOrientation;
  /** Specific provider ID (null or undefined for "All") */
  providerId?: string | null;
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Results per page */
  perPage?: number;
}

/**
 * Options for fetching curated/random media (no query required)
 */
export interface StockMediaCuratedOptions {
  /** Filter by media type */
  type?: StockMediaType;
  /** Filter by orientation */
  orientation?: MediaOrientation;
  /** Specific provider ID (null or undefined for "All") */
  providerId?: string | null;
  /** Page number for pagination (1-indexed) */
  page?: number;
  /** Results per page */
  perPage?: number;
}

/**
 * Normalized search result regardless of provider
 */
export interface NormalizedMediaResult {
  /** Unique identifier (prefixed with provider slug for uniqueness) */
  id: string;
  /** Provider's external ID for this asset */
  externalId: string;
  /** Provider ID this result came from */
  providerId: string;
  /** Provider name for display */
  providerName: string;
  /** Media type */
  type: StockMediaType;
  /** Full-resolution URL */
  url: string;
  /** Thumbnail URL for preview */
  thumbnailUrl: string;
  /** Preview URL (medium resolution) */
  previewUrl?: string;
  /** Asset title/name */
  name: string;
  /** Original width in pixels */
  width: number;
  /** Original height in pixels */
  height: number;
  /** Detected orientation */
  orientation: MediaOrientation;
  /** Duration in seconds (videos only) */
  duration?: number;
  /** License type */
  licenseType: string;
  /** Whether attribution is required */
  attributionRequired: boolean;
  /** Attribution text if required */
  attributionText?: string;
  /** Photographer/creator name */
  photographer?: string;
  /** Original page URL on provider site */
  sourceUrl?: string;
}

/**
 * Provider-specific result metadata in aggregated response
 */
export interface ProviderResultMeta {
  providerId: string;
  providerName: string;
  total: number;
  error?: string;
}

/**
 * Aggregated search response from one or more providers
 */
export interface StockMediaSearchResponse {
  /** Normalized results from all queried providers */
  results: NormalizedMediaResult[];
  /** Total results available (sum across providers) */
  total: number;
  /** Current page */
  page: number;
  /** Results per page */
  perPage: number;
  /** Whether more results exist */
  hasMore: boolean;
  /** Provider-specific metadata */
  providerResults?: ProviderResultMeta[];
}

/**
 * Provider adapter interface - implemented by each provider
 */
export interface StockMediaProviderAdapter {
  /** Provider definition */
  provider: StockMediaProvider;

  /**
   * Search for media assets
   * @param options Search parameters
   * @returns Normalized results
   */
  search(options: StockMediaSearchOptions): Promise<StockMediaSearchResponse>;

  /**
   * Get curated/random media without requiring a search query
   * @param options Pagination and filter options (no query required)
   * @returns Curated/random results
   */
  getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse>;

  /**
   * Get a single asset by its external ID
   * @param externalId Provider's asset ID
   * @returns Normalized result or null if not found
   */
  getAsset(externalId: string): Promise<NormalizedMediaResult | null>;

  /**
   * Get download URL for an asset (may require API call for some providers)
   * @param externalId Provider's asset ID
   * @param size Desired size/quality
   * @returns Download URL
   */
  getDownloadUrl(
    externalId: string,
    size?: "small" | "medium" | "large" | "original"
  ): Promise<string>;
}

/**
 * Provider configuration for registration
 */
export interface StockMediaProviderConfig {
  /** Provider identifier */
  id: string;
  /** Provider name */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Icon identifier */
  icon: string;
  /** Supported media types */
  supportedTypes: StockMediaType[];
  /** API base URL */
  apiBaseUrl: string;
  /** Environment variable name for API key */
  apiKeyEnvVar: string;
  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerDay?: number;
  };
  /** Attribution requirements */
  attributionRequired: boolean;
  /** Attribution template */
  attributionTemplate?: string;
}
