import type {
  AspectRatio,
  MediaQuality,
  ImageStyle,
  MediaModelConfig,
  MediaGenerationType,
} from "@contenthq/shared";

export interface ImageProviderOptions {
  prompt: string;
  model: string;
  aspectRatio: AspectRatio;
  quality: MediaQuality;
  style?: ImageStyle;
  count: number;
  negativePrompt?: string;
  seed?: number;
}

export interface VideoProviderOptions {
  prompt: string;
  model: string;
  aspectRatio?: AspectRatio;
  duration?: number;
  referenceImageUrl?: string;
}

export interface ImageEditOptions {
  image: string;
  prompt: string;
  model: string;
  strength?: number;
  size?: string;
  count: number;
  referenceImage?: string;
  styleDescription?: string;
}

export interface ProviderMediaResult {
  images?: { base64: string; mediaType: string; revisedPrompt?: string }[];
  videoUrl?: string;
  generationTimeMs: number;
}

export interface MediaGenerationProvider {
  readonly name: string;
  readonly provider: string;

  generateImage?(options: ImageProviderOptions): Promise<ProviderMediaResult>;
  generateVideo?(options: VideoProviderOptions): Promise<ProviderMediaResult>;
  editImage?(options: ImageEditOptions): Promise<ProviderMediaResult>;

  supportsEditing(modelId: string): boolean;
  supportsVideo(): boolean;
  isConfigured(): boolean;
  getModels(type?: MediaGenerationType): MediaModelConfig[];
  getDimensions(
    model: string,
    aspectRatio: AspectRatio
  ): { width: number; height: number };
}
