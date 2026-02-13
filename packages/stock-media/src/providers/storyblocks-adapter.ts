/**
 * Storyblocks Stock Media Provider Adapter
 *
 * Implements the StockMediaProviderAdapter interface for Storyblocks API.
 * Supports both images and videos.
 *
 * API Documentation: https://documentation.storyblocks.com/
 */

import { BaseStockMediaAdapter } from "./base-adapter";
import type {
  StockMediaSearchOptions,
  StockMediaSearchResponse,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
} from "../types";
import { createHmac } from "crypto";

// Storyblocks API response types (based on API v2 structure)
interface StoryblocksImage {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  contributor: {
    name: string;
    url?: string;
  };
  keywords?: string[];
  duration?: number;
  previewUrl?: string;
  license: string;
  attribution?: string;
}

interface _StoryblocksSearchResponse {
  results: StoryblocksImage[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
}

export class StoryblocksAdapter extends BaseStockMediaAdapter {
  /**
   * Generate HMAC signature for Storyblocks API authentication
   */
  private generateHmacSignature(
    endpoint: string,
    expires: number,
    secretKey: string
  ): string {
    const data = `${endpoint}${expires}`;
    return createHmac("sha256", secretKey).update(data).digest("hex");
  }

  protected async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const apiKey = this.getApiKey();
    const baseUrl = this.config.apiBaseUrl;

    const url = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(options?.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `Storyblocks API error (${response.status}): ${errorText}`
      );
      throw new Error(
        `Storyblocks API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  async search(
    options: StockMediaSearchOptions
  ): Promise<StockMediaSearchResponse> {
    const {
      query,
      type = "image",
      orientation,
      page = 1,
      perPage = 20,
    } = options;

    if (!this.hasApiKey()) {
      console.warn("Storyblocks API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    if (query && query.trim()) {
      params.set("keywords", query.trim());
    }

    params.set("content_type", type);

    if (orientation && orientation !== "square") {
      params.set("orientation", orientation);
    }

    try {
      const searchEndpoint =
        type === "video"
          ? `/videos/search?${params.toString()}`
          : `/images/search?${params.toString()}`;

      const response = await this.makeRequest<Record<string, unknown>>(
        searchEndpoint
      );

      // Handle different possible response structures
      let results: Record<string, unknown>[] = [];
      let total = 0;
      let hasMore = false;

      if (response && typeof response === "object") {
        if (Array.isArray(response.data)) {
          results = response.data as Record<string, unknown>[];
          total =
            (response.total as number) ||
            (response.count as number) ||
            results.length;
          hasMore =
            !!response.hasMore ||
            !!response.next_page ||
            results.length >= perPage;
        } else if (Array.isArray(response.results)) {
          results = response.results as Record<string, unknown>[];
          total =
            (response.total as number) ||
            (response.count as number) ||
            results.length;
          hasMore =
            !!response.hasMore ||
            !!response.next_page ||
            results.length >= perPage;
        } else if (Array.isArray(response.items)) {
          results = response.items as Record<string, unknown>[];
          total =
            (response.total as number) ||
            (response.count as number) ||
            results.length;
          hasMore =
            !!response.hasMore ||
            !!response.next_page ||
            results.length >= perPage;
        } else {
          const arrays = Object.values(response).filter(Array.isArray);
          if (arrays.length > 0) {
            results = arrays[0] as Record<string, unknown>[];
            total = results.length;
            hasMore = results.length >= perPage;
          } else {
            console.warn(
              "Storyblocks API response structure not recognized"
            );
            return this.createEmptyResponse(page, perPage);
          }
        }
      } else {
        console.warn("Storyblocks API returned invalid response");
        return this.createEmptyResponse(page, perPage);
      }

      return {
        results: results.map((item) => this.normalizeMedia(item, type)),
        total,
        page,
        perPage,
        hasMore,
      };
    } catch (error) {
      console.error("Storyblocks search error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  async getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse> {
    const { type = "image", orientation, page = 1, perPage = 20 } = options;

    if (!this.hasApiKey()) {
      console.warn("Storyblocks API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      content_type: type,
    });

    if (orientation && orientation !== "square") {
      params.set("orientation", orientation);
    }

    try {
      const curatedEndpoint =
        type === "video"
          ? `/videos/popular?${params.toString()}`
          : `/images/popular?${params.toString()}`;

      const response = await this.makeRequest<Record<string, unknown>>(
        curatedEndpoint
      );

      let results: Record<string, unknown>[] = [];
      let total = 0;
      let hasMore = false;

      if (response && typeof response === "object") {
        if (Array.isArray(response.data)) {
          results = response.data as Record<string, unknown>[];
          total =
            (response.total as number) ||
            (response.count as number) ||
            results.length;
          hasMore =
            !!response.hasMore ||
            !!response.next_page ||
            results.length >= perPage;
        } else if (Array.isArray(response.results)) {
          results = response.results as Record<string, unknown>[];
          total =
            (response.total as number) ||
            (response.count as number) ||
            results.length;
          hasMore =
            !!response.hasMore ||
            !!response.next_page ||
            results.length >= perPage;
        } else if (Array.isArray(response.items)) {
          results = response.items as Record<string, unknown>[];
          total =
            (response.total as number) ||
            (response.count as number) ||
            results.length;
          hasMore =
            !!response.hasMore ||
            !!response.next_page ||
            results.length >= perPage;
        } else {
          const arrays = Object.values(response).filter(Array.isArray);
          if (arrays.length > 0) {
            results = arrays[0] as Record<string, unknown>[];
            total = results.length;
            hasMore = results.length >= perPage;
          } else {
            console.warn(
              "Storyblocks curated response structure not recognized"
            );
            return this.createEmptyResponse(page, perPage);
          }
        }
      } else {
        console.warn("Storyblocks curated API returned invalid response");
        return this.createEmptyResponse(page, perPage);
      }

      return {
        results: results.map((item) => this.normalizeMedia(item, type)),
        total,
        page,
        perPage,
        hasMore,
      };
    } catch (error) {
      console.error("Storyblocks curated error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  private normalizeMedia(
    item: Record<string, unknown>,
    type: "image" | "video"
  ): NormalizedMediaResult {
    const id = (item.id as string) || (item.external_id as string) || "";
    const title = (item.title as string) || (item.name as string) || "";
    const url =
      (item.url as string) ||
      (item.web_url as string) ||
      (item.download_url as string) ||
      "";
    const thumbUrl =
      (item.thumbUrl as string) ||
      (item.thumb_url as string) ||
      (item.thumbnail_url as string) ||
      (item.preview_url as string) ||
      url;
    const width = (item.width as number) || 1920;
    const height = (item.height as number) || 1080;
    const contributor = (item.contributor ||
      item.author ||
      item.photographer ||
      {}) as Record<string, unknown>;
    const contributorName =
      (contributor.name as string) || (contributor.username as string) || "";
    const duration =
      (item.duration as number) || (type === "video" ? 0 : undefined);

    return {
      id: this.generateId(id),
      externalId: id,
      providerId: this.provider.id,
      providerName: this.provider.name,
      type,
      url,
      thumbnailUrl: thumbUrl,
      previewUrl:
        (item.previewUrl as string) ||
        (item.preview_url as string) ||
        thumbUrl,
      name: title || `${type.charAt(0).toUpperCase() + type.slice(1)} ${id}`,
      width,
      height,
      orientation: this.detectOrientation(width, height),
      duration,
      licenseType: (item.license as string) || "Storyblocks License",
      attributionRequired: this.config.attributionRequired,
      photographer: contributorName,
      sourceUrl: url,
    };
  }

  async getAsset(externalId: string): Promise<NormalizedMediaResult | null> {
    if (!this.hasApiKey()) {
      return null;
    }

    try {
      const image = await this.makeRequest<Record<string, unknown>>(
        `/images/${externalId}`
      );
      return this.normalizeMedia(image, "image");
    } catch {
      try {
        const video = await this.makeRequest<Record<string, unknown>>(
          `/videos/${externalId}`
        );
        return this.normalizeMedia(video, "video");
      } catch {
        return null;
      }
    }
  }

  async getDownloadUrl(
    externalId: string,
    size: "small" | "medium" | "large" | "original" = "original"
  ): Promise<string> {
    if (!this.hasApiKey()) {
      throw new Error("Storyblocks API key not configured");
    }

    try {
      const asset = await this.getAsset(externalId);
      if (!asset) {
        throw new Error("Asset not found");
      }

      const downloadEndpoint = `/download/${asset.type}/${externalId}?size=${size}`;

      try {
        const response = await this.makeRequest<{ downloadUrl: string }>(
          downloadEndpoint
        );
        return response.downloadUrl || asset.url;
      } catch {
        return asset.url;
      }
    } catch (error) {
      console.error("Storyblocks download URL error:", error);
      throw error;
    }
  }
}
