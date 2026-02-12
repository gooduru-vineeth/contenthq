import type {
  AspectRatio,
  MediaModelConfig,
  MediaGenerationType,
} from "@contenthq/shared";
import type {
  MediaGenerationProvider,
  VideoProviderOptions,
  ProviderMediaResult,
} from "./types";

// ============================================
// GOOGLE VIDEO PROVIDER
// Uses Google Generative AI REST API for Veo 2
// ============================================

const GOOGLE_VIDEO_MODELS: MediaModelConfig[] = [
  {
    id: "veo-2",
    name: "Google Veo 2",
    provider: "google",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
    maxDuration: 8,
  },
];

const GOOGLE_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GoogleOperation {
  name: string;
  done?: boolean;
  response?: {
    generatedSamples?: Array<{
      video?: { uri: string };
    }>;
  };
  error?: { message: string };
}

async function googleFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY is not configured");

  const url = `${GOOGLE_API_BASE}/${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${apiKey}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

async function pollGoogleOperation(
  operationName: string,
  timeoutMs = 300_000
): Promise<GoogleOperation> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const op = await googleFetch<GoogleOperation>(operationName);

    if (op.done) {
      if (op.error) {
        throw new Error(`Google video generation failed: ${op.error.message}`);
      }
      return op;
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("Google video generation timed out");
}

class GoogleVideoProvider implements MediaGenerationProvider {
  readonly name = "Google";
  readonly provider = "google";

  isConfigured(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  supportsEditing(): boolean {
    return false;
  }

  supportsVideo(): boolean {
    return true;
  }

  getModels(type?: MediaGenerationType): MediaModelConfig[] {
    if (type && type !== "video") return [];
    return GOOGLE_VIDEO_MODELS;
  }

  getDimensions(
    _model: string,
    _aspectRatio: AspectRatio
  ): { width: number; height: number } {
    return { width: 1920, height: 1080 };
  }

  async generateVideo(
    options: VideoProviderOptions
  ): Promise<ProviderMediaResult> {
    const startTime = Date.now();

    const body: Record<string, unknown> = {
      model: `models/${options.model}`,
      generateVideoConfig: {
        ...(options.aspectRatio && { aspectRatio: options.aspectRatio }),
        ...(options.duration && {
          numberOfSeconds: options.duration,
        }),
      },
    };

    if (options.referenceImageUrl) {
      body.instances = [
        {
          prompt: options.prompt,
          image: { imageUri: options.referenceImageUrl },
        },
      ];
    } else {
      body.instances = [{ prompt: options.prompt }];
    }

    const op = await googleFetch<GoogleOperation>(
      `models/${options.model}:predictLongRunning`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    const result = await pollGoogleOperation(op.name);

    const videoUri =
      result.response?.generatedSamples?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("Google returned no video URL");
    }

    return {
      videoUrl: videoUri,
      generationTimeMs: Date.now() - startTime,
    };
  }
}

export const googleVideoProvider = new GoogleVideoProvider();
