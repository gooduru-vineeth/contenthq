import type {
  AspectRatio,
  MediaQuality,
  ChatEditCombinationResult,
  ChatEditResponse,
} from "@contenthq/shared";

export type { AspectRatio, MediaQuality, ChatEditCombinationResult, ChatEditResponse };

export interface ChatEditMessage {
  id: string;
  role: "user" | "assistant";
  prompt?: string;
  settings?: {
    models: string[];
    aspectRatios: AspectRatio[];
    qualities: MediaQuality[];
    strength?: number;
    referenceImageUrl?: string;
  };
  results?: ChatEditCombinationResult[];
  summary?: {
    totalCombinations: number;
    succeeded: number;
    failed: number;
  };
  timestamp: Date;
}

export interface CombinationProgress {
  key: string;
  modelId: string;
  aspectRatio: AspectRatio;
  quality: MediaQuality;
  status: "pending" | "generating" | "completed" | "failed";
}
