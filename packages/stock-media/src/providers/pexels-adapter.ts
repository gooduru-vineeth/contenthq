/**
 * Pexels Stock Media Provider Adapter
 *
 * Implements the StockMediaProviderAdapter interface for Pexels API.
 * Supports both images and videos.
 *
 * API Documentation: https://www.pexels.com/api/documentation/
 */

import { BaseStockMediaAdapter } from "./base-adapter";
import type {
  StockMediaSearchOptions,
  StockMediaSearchResponse,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
  MediaOrientation,
} from "../types";

// Pexels API response types
interface PexelsPhotoSrc {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
}

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: PexelsPhotoSrc;
  liked: boolean;
  alt: string;
}

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

interface PexelsVideoPicture {
  id: number;
  picture: string;
  nr: number;
}

interface PexelsVideoUser {
  id: number;
  name: string;
  url: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  duration: number;
  user: PexelsVideoUser;
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

interface PexelsPhotoSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
  next_page?: string;
}

interface PexelsVideoSearchResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
  next_page?: string;
}

export class PexelsAdapter extends BaseStockMediaAdapter {
  protected async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const apiKey = this.getApiKey();
    const baseUrl = this.config.apiBaseUrl;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: apiKey,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Pexels API error (${response.status}): ${errorText}`);
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
      query,
      type = "image",
      orientation,
      page = 1,
      perPage = 20,
    } = options;

    if (!this.hasApiKey()) {
      console.warn("Pexels API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const isVideo = type === "video";

    const paramsObj: Record<string, string> = {
      page: String(page),
      per_page: String(perPage),
    };
    if (query) {
      paramsObj.query = query;
    }
    const params = new URLSearchParams(paramsObj);

    if (orientation && orientation !== "square") {
      params.set("orientation", orientation);
    }

    try {
      if (isVideo) {
        const response = await this.makeRequest<PexelsVideoSearchResponse>(
          `/videos/search?${params.toString()}`
        );

        return {
          results: response.videos.map((video) => this.normalizeVideo(video)),
          total: response.total_results,
          page: response.page,
          perPage: response.per_page,
          hasMore: !!response.next_page,
        };
      } else {
        const response = await this.makeRequest<PexelsPhotoSearchResponse>(
          `/search?${params.toString()}`
        );

        return {
          results: response.photos.map((photo) => this.normalizePhoto(photo)),
          total: response.total_results,
          page: response.page,
          perPage: response.per_page,
          hasMore: !!response.next_page,
        };
      }
    } catch (error) {
      console.error("Pexels search error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  async getCurated(
    options: StockMediaCuratedOptions
  ): Promise<StockMediaSearchResponse> {
    const { type = "image", orientation, page = 1, perPage = 20 } = options;

    if (!this.hasApiKey()) {
      console.warn("Pexels API key not configured");
      return this.createEmptyResponse(page, perPage);
    }

    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    try {
      if (type === "video") {
        const response = await this.makeRequest<PexelsVideoSearchResponse>(
          `/videos/popular?${params.toString()}`
        );

        let videos = response.videos;
        if (orientation) {
          videos = videos.filter((v) => {
            const detected = this.detectOrientation(v.width, v.height);
            return detected === orientation;
          });
        }

        return {
          results: videos.map((video) => this.normalizeVideo(video)),
          total: response.total_results,
          page: response.page,
          perPage: response.per_page,
          hasMore: !!response.next_page,
        };
      } else {
        const response = await this.makeRequest<PexelsPhotoSearchResponse>(
          `/curated?${params.toString()}`
        );

        let photos = response.photos;
        if (orientation) {
          photos = photos.filter((p) => {
            const detected = this.detectOrientation(p.width, p.height);
            return detected === orientation;
          });
        }

        return {
          results: photos.map((photo) => this.normalizePhoto(photo)),
          total: response.total_results,
          page: response.page,
          perPage: response.per_page,
          hasMore: !!response.next_page,
        };
      }
    } catch (error) {
      console.error("Pexels curated error:", error);
      return this.createEmptyResponse(page, perPage);
    }
  }

  private normalizePhoto(photo: PexelsPhoto): NormalizedMediaResult {
    return {
      id: this.generateId(String(photo.id)),
      externalId: String(photo.id),
      providerId: this.provider.id,
      providerName: this.provider.name,
      type: "image",
      url: photo.src.original,
      thumbnailUrl: photo.src.small,
      previewUrl: photo.src.medium,
      name: photo.alt || `Photo ${photo.id}`,
      width: photo.width,
      height: photo.height,
      orientation: this.detectOrientation(photo.width, photo.height),
      licenseType: "Pexels License",
      attributionRequired: false,
      photographer: photo.photographer,
      sourceUrl: photo.url,
    };
  }

  private normalizeVideo(video: PexelsVideo): NormalizedMediaResult {
    const mp4Files = video.video_files
      .filter((f) => f.file_type === "video/mp4")
      .sort((a, b) => b.width - a.width);

    const bestFile = mp4Files[0];
    const previewFile =
      mp4Files.find((f) => f.width <= 1280) || mp4Files[mp4Files.length - 1];

    return {
      id: this.generateId(String(video.id)),
      externalId: String(video.id),
      providerId: this.provider.id,
      providerName: this.provider.name,
      type: "video",
      url: bestFile?.link || video.video_files[0]?.link || "",
      thumbnailUrl: video.video_pictures[0]?.picture || "",
      previewUrl: previewFile?.link,
      name: `Video ${video.id}`,
      width: video.width,
      height: video.height,
      orientation: this.detectOrientation(video.width, video.height),
      duration: video.duration,
      licenseType: "Pexels License",
      attributionRequired: false,
      photographer: video.user.name,
      sourceUrl: video.url,
    };
  }

  async getAsset(externalId: string): Promise<NormalizedMediaResult | null> {
    if (!this.hasApiKey()) {
      return null;
    }

    try {
      const photo = await this.makeRequest<PexelsPhoto>(
        `/photos/${externalId}`
      );
      return this.normalizePhoto(photo);
    } catch {
      try {
        const video = await this.makeRequest<PexelsVideo>(
          `/videos/videos/${externalId}`
        );
        return this.normalizeVideo(video);
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
      throw new Error("Pexels API key not configured");
    }

    try {
      const photo = await this.makeRequest<PexelsPhoto>(
        `/photos/${externalId}`
      );

      const sizeMap: Record<string, string> = {
        small: photo.src.small,
        medium: photo.src.medium,
        large: photo.src.large,
        original: photo.src.original,
      };

      return sizeMap[size] || photo.src.original;
    } catch {
      const video = await this.makeRequest<PexelsVideo>(
        `/videos/videos/${externalId}`
      );
      const mp4Files = video.video_files
        .filter((f) => f.file_type === "video/mp4")
        .sort((a, b) => b.width - a.width);

      if (size === "small") {
        return mp4Files[mp4Files.length - 1]?.link || "";
      } else if (size === "medium") {
        const mediumFile = mp4Files.find((f) => f.width <= 1280);
        return mediumFile?.link || mp4Files[0]?.link || "";
      }

      return mp4Files[0]?.link || "";
    }
  }
}
