/**
 * Pixabay Stock Media Provider Adapter
 *
 * Implements the StockMediaProviderAdapter interface for Pixabay API.
 * Supports both images and videos.
 *
 * API Documentation: https://pixabay.com/api/docs/
 */

import { BaseStockMediaAdapter } from "./base-adapter";
import type {
  StockMediaSearchOptions,
  StockMediaSearchResponse,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
  MediaOrientation,
} from "../types";

// Pixabay API response types
interface PixabayImageHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  fullHDURL?: string;
  imageURL?: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayVideoQuality {
  url: string;
  width: number;
  height: number;
  size: number;
  thumbnail: string;
}

interface PixabayVideoHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  videos: {
    large?: PixabayVideoQuality;
    medium: PixabayVideoQuality;
    small: PixabayVideoQuality;
    tiny: PixabayVideoQuality;
  };
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayImageSearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayImageHit[];
}

interface PixabayVideoSearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideoHit[];
}

export class PixabayAdapter extends BaseStockMediaAdapter {
  protected async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const apiKey = this.getApiKey();
    const baseUrl = this.config.apiBaseUrl;

    const url = new URL(endpoint, baseUrl);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://pixabay.com/",
        Origin: "https://pixabay.com",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Pixabay API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  protected override mapOrientationToApi(
    orientation?: MediaOrientation
  ): string | undefined {
    return orientation;
  }

  async search(
    options: StockMediaSearchOptions
  ): Promise<StockMediaSearchResponse> {
    const {
      query = "",
      type = "image",
      orientation,
      page = 1,
      perPage = 20,
    } = options;

    if (!this.hasApiKey()) {
      console.warn("Pixabay API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const isVideo = type === "video";

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    if (query) {
      params.set("q", query);
    }

    if (orientation && orientation !== "square") {
      params.set("orientation", orientation);
    }

    if (!isVideo) {
      params.set("image_type", "photo");
    }

    try {
      if (isVideo) {
        const response = await this.makeRequest<PixabayVideoSearchResponse>(
          `/videos/?${params.toString()}`
        );

        return {
          results: response.hits.map((video) => this.normalizeVideo(video)),
          total: response.totalHits,
          page,
          perPage,
          hasMore: response.totalHits > page * perPage,
        };
      } else {
        const response = await this.makeRequest<PixabayImageSearchResponse>(
          `/?${params.toString()}`
        );

        return {
          results: response.hits.map((image) => this.normalizeImage(image)),
          total: response.totalHits,
          page,
          perPage,
          hasMore: response.totalHits > page * perPage,
        };
      }
    } catch (error) {
      console.error("Pixabay search error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  async getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse> {
    const { type = "image", orientation, page = 1, perPage = 20 } = options;

    if (!this.hasApiKey()) {
      console.warn("Pixabay API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      editors_choice: "true",
    });

    if (orientation && orientation !== "square") {
      params.set("orientation", orientation);
    }

    try {
      if (type === "video") {
        const response = await this.makeRequest<PixabayVideoSearchResponse>(
          `/videos/?${params.toString()}`
        );

        return {
          results: response.hits.map((video) => this.normalizeVideo(video)),
          total: response.totalHits,
          page,
          perPage,
          hasMore: response.totalHits > page * perPage,
        };
      } else {
        params.set("image_type", "photo");
        const response = await this.makeRequest<PixabayImageSearchResponse>(
          `/?${params.toString()}`
        );

        return {
          results: response.hits.map((image) => this.normalizeImage(image)),
          total: response.totalHits,
          page,
          perPage,
          hasMore: response.totalHits > page * perPage,
        };
      }
    } catch (error) {
      console.error("Pixabay curated error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  private normalizeImage(image: PixabayImageHit): NormalizedMediaResult {
    return {
      id: this.generateId(String(image.id)),
      externalId: String(image.id),
      providerId: this.provider.id,
      providerName: this.provider.name,
      type: "image",
      url: image.largeImageURL,
      thumbnailUrl: image.previewURL,
      previewUrl: image.webformatURL,
      name: image.tags || `Image ${image.id}`,
      width: image.imageWidth,
      height: image.imageHeight,
      orientation: this.detectOrientation(image.imageWidth, image.imageHeight),
      licenseType: "Pixabay License",
      attributionRequired: false,
      photographer: image.user,
      sourceUrl: image.pageURL,
    };
  }

  private normalizeVideo(video: PixabayVideoHit): NormalizedMediaResult {
    const mediumVideo = video.videos.medium;
    const largeVideo = video.videos.large;

    return {
      id: this.generateId(String(video.id)),
      externalId: String(video.id),
      providerId: this.provider.id,
      providerName: this.provider.name,
      type: "video",
      url: largeVideo?.url || mediumVideo.url,
      thumbnailUrl: mediumVideo.thumbnail,
      previewUrl: mediumVideo.url,
      name: video.tags || `Video ${video.id}`,
      width: mediumVideo.width,
      height: mediumVideo.height,
      orientation: this.detectOrientation(
        mediumVideo.width,
        mediumVideo.height
      ),
      duration: video.duration,
      licenseType: "Pixabay License",
      attributionRequired: false,
      photographer: video.user,
      sourceUrl: video.pageURL,
    };
  }

  async getAsset(externalId: string): Promise<NormalizedMediaResult | null> {
    if (!this.hasApiKey()) {
      return null;
    }

    try {
      const imageResponse =
        await this.makeRequest<PixabayImageSearchResponse>(
          `/?id=${externalId}`
        );

      if (imageResponse.hits && imageResponse.hits.length > 0) {
        return this.normalizeImage(imageResponse.hits[0]);
      }

      const videoResponse =
        await this.makeRequest<PixabayVideoSearchResponse>(
          `/videos/?id=${externalId}`
        );

      if (videoResponse.hits && videoResponse.hits.length > 0) {
        return this.normalizeVideo(videoResponse.hits[0]);
      }

      return null;
    } catch (error) {
      console.error("Pixabay getAsset error:", error);
      return null;
    }
  }

  async getDownloadUrl(
    externalId: string,
    size: "small" | "medium" | "large" | "original" = "original"
  ): Promise<string> {
    if (!this.hasApiKey()) {
      throw new Error("Pixabay API key not configured");
    }

    try {
      const imageResponse =
        await this.makeRequest<PixabayImageSearchResponse>(
          `/?id=${externalId}`
        );

      if (imageResponse.hits && imageResponse.hits.length > 0) {
        const image = imageResponse.hits[0];

        const sizeMap: Record<string, string> = {
          small: image.previewURL,
          medium: image.webformatURL,
          large: image.largeImageURL,
          original: image.imageURL || image.largeImageURL,
        };

        return sizeMap[size] || image.largeImageURL;
      }

      const videoResponse =
        await this.makeRequest<PixabayVideoSearchResponse>(
          `/videos/?id=${externalId}`
        );

      if (videoResponse.hits && videoResponse.hits.length > 0) {
        const video = videoResponse.hits[0];

        const sizeMap = {
          small: video.videos.small?.url || video.videos.tiny.url,
          medium: video.videos.medium.url,
          large: video.videos.large?.url || video.videos.medium.url,
          original: video.videos.large?.url || video.videos.medium.url,
        };

        return sizeMap[size] || video.videos.medium.url;
      }

      throw new Error(`Asset ${externalId} not found`);
    } catch (error) {
      console.error("Pixabay getDownloadUrl error:", error);
      throw error;
    }
  }
}
