// ============================================
// MEDIA GENERATION TYPES
// Shared types for image and video generation
// ============================================

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "21:9";
export type MediaQuality = "standard" | "hd";
export type ImageStyle = "natural" | "vivid";
export type MediaGenerationType = "image" | "video";

export interface MediaModelConfig {
  id: string;
  name: string;
  provider: string;
  mediaType: MediaGenerationType;
  supportsAspectRatio: boolean;
  supportedSizes: string[];
  supportsStyle: boolean;
  supportsMultiple: boolean;
  supportsEditing: boolean;
  supportsImageToVideo?: boolean;
  maxCount: number;
  maxDuration?: number;
}

export interface GenerateMediaRequest {
  prompt: string;
  mediaType: MediaGenerationType;
  model?: string;
  models?: string[];
  aspectRatio?: AspectRatio;
  aspectRatios?: AspectRatio[];
  quality?: MediaQuality;
  qualities?: MediaQuality[];
  style?: ImageStyle;
  count?: number;
  duration?: number;
  referenceImageUrl?: string;
  conversationId?: string;
  projectId?: string;
}

export interface CombinationGenerationResult {
  modelId: string;
  modelName: string;
  provider: string;
  aspectRatio: AspectRatio;
  quality: MediaQuality;
  status: "pending" | "generating" | "completed" | "failed";
  generatedMediaIds: string[];
  error?: string;
  generationTimeMs?: number;
}

export interface AvailableMediaModel {
  id: string;
  name: string;
  provider: string;
  mediaType: MediaGenerationType;
  available: boolean;
  capabilities: {
    supportsStyle: boolean;
    supportsMultiple: boolean;
    supportsEditing: boolean;
    supportsImageToVideo?: boolean;
    maxCount: number;
    maxDuration?: number;
  };
}

export interface MediaGalleryFilters {
  mediaType?: MediaGenerationType;
  model?: string;
  aspectRatio?: string;
  search?: string;
  status?: string;
  sortBy?: "newest" | "oldest";
}

export interface EditMediaRequest {
  editPrompt: string;
  model?: string;
  models?: string[];
  strength?: number;
  referenceImageUrl?: string;
}

export interface ChatEditRequest {
  editPrompt: string;
  models: string[];
  aspectRatios: AspectRatio[];
  qualities: MediaQuality[];
  strength?: number;
  referenceImageUrl?: string;
}

export interface ChatEditCombinationResult {
  modelId: string;
  modelName: string;
  provider: string;
  aspectRatio: AspectRatio;
  quality: MediaQuality;
  status: "pending" | "generating" | "completed" | "failed";
  generatedMediaId?: string;
  error?: string;
  generationTimeMs?: number;
}
