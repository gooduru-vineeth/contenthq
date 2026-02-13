/**
 * Unsplash Stock Media Provider Adapter
 *
 * Implements the StockMediaProviderAdapter interface for Unsplash API.
 * Supports images only. Attribution is required.
 *
 * API Documentation: https://unsplash.com/documentation
 */

import { BaseStockMediaAdapter } from "./base-adapter";
import type {
  StockMediaSearchOptions,
  StockMediaSearchResponse,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
  MediaOrientation,
} from "../types";

// Unsplash API response types
interface UnsplashUrls {
  raw: string;
  full: string;
  regular: string;
  small: string;
  thumb: string;
  small_s3: string;
}

interface UnsplashUser {
  id: string;
  username: string;
  name: string;
  portfolio_url: string | null;
  profile_image: {
    small: string;
    medium: string;
    large: string;
  };
  links: {
    self: string;
    html: string;
    photos: string;
    likes: string;
  };
}

interface UnsplashPhoto {
  id: string;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  urls: UnsplashUrls;
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  likes: number;
  user: UnsplashUser;
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export class UnsplashAdapter extends BaseStockMediaAdapter {
  protected async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const apiKey = this.getApiKey();
    const baseUrl = this.config.apiBaseUrl;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Client-ID ${apiKey}`,
        "Accept-Version": "v1",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Unsplash API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  protected override mapOrientationToApi(
    orientation?: MediaOrientation
  ): string | undefined {
    if (orientation === "square") {
      return "squarish";
    }
    return orientation;
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

    if (type === "video") {
      return this.createEmptyResponse(page, perPage);
    }

    if (!this.hasApiKey()) {
      console.warn("Unsplash API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const paramsObj: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
    };
    if (query) {
      paramsObj.query = query;
    }
    const params = new URLSearchParams(paramsObj);

    const apiOrientation = this.mapOrientationToApi(orientation);
    if (apiOrientation) {
      params.set("orientation", apiOrientation);
    }

    try {
      const response = await this.makeRequest<UnsplashSearchResponse>(
        `/search/photos?${params.toString()}`
      );

      return {
        results: response.results.map((photo) => this.normalizePhoto(photo)),
        total: response.total,
        page,
        perPage,
        hasMore: page < response.total_pages,
      };
    } catch (error) {
      console.error("Unsplash search error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  async getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse> {
    const { type = "image", orientation, page = 1, perPage = 20 } = options;

    if (type === "video") {
      return this.createEmptyResponse(page, perPage);
    }

    if (!this.hasApiKey()) {
      console.warn("Unsplash API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const count = Math.min(perPage, 30);

    const params = new URLSearchParams({
      count: String(count),
    });

    const apiOrientation = this.mapOrientationToApi(orientation);
    if (apiOrientation) {
      params.set("orientation", apiOrientation);
    }

    try {
      const response = await this.makeRequest<UnsplashPhoto[]>(
        `/photos/random?${params.toString()}`
      );

      return {
        results: response.map((photo) => this.normalizePhoto(photo)),
        total: 10000,
        page,
        perPage,
        hasMore: true,
      };
    } catch (error) {
      console.error("Unsplash random error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  private normalizePhoto(photo: UnsplashPhoto): NormalizedMediaResult {
    return {
      id: this.generateId(photo.id),
      externalId: photo.id,
      providerId: this.provider.id,
      providerName: this.provider.name,
      type: "image",
      url: photo.urls.full,
      thumbnailUrl: photo.urls.thumb,
      previewUrl: photo.urls.regular,
      name:
        photo.alt_description ||
        photo.description ||
        `Photo by ${photo.user.name}`,
      width: photo.width,
      height: photo.height,
      orientation: this.detectOrientation(photo.width, photo.height),
      licenseType: "Unsplash License",
      attributionRequired: true,
      attributionText: this.formatAttribution(photo.user.name),
      photographer: photo.user.name,
      sourceUrl: photo.links.html,
    };
  }

  async getAsset(externalId: string): Promise<NormalizedMediaResult | null> {
    if (!this.hasApiKey()) {
      return null;
    }

    try {
      const photo = await this.makeRequest<UnsplashPhoto>(
        `/photos/${externalId}`
      );
      return this.normalizePhoto(photo);
    } catch (error) {
      console.error("Unsplash getAsset error:", error);
      return null;
    }
  }

  async getDownloadUrl(
    externalId: string,
    size: "small" | "medium" | "large" | "original" = "original"
  ): Promise<string> {
    if (!this.hasApiKey()) {
      throw new Error("Unsplash API key not configured");
    }

    try {
      const photo = await this.makeRequest<UnsplashPhoto>(
        `/photos/${externalId}`
      );

      // Trigger download tracking (Unsplash API guidelines)
      this.makeRequest(photo.links.download_location).catch(() => {
        // Ignore errors from download tracking
      });

      const sizeMap: Record<string, string> = {
        small: photo.urls.small,
        medium: photo.urls.regular,
        large: photo.urls.full,
        original: photo.urls.raw,
      };

      return sizeMap[size] || photo.urls.full;
    } catch (error) {
      console.error("Unsplash getDownloadUrl error:", error);
      throw new Error("Failed to get download URL from Unsplash");
    }
  }
}
