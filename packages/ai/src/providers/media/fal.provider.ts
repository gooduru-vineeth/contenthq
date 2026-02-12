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
// FAL.AI VIDEO PROVIDER
// Uses fal.ai REST API for video generation
// ============================================

const FAL_MODELS: MediaModelConfig[] = [
  {
    id: "fal-ai/luma-dream-machine/ray-2",
    name: "Luma Ray 2",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    supportsImageToVideo: true,
    maxCount: 1,
    maxDuration: 10,
  },
  {
    id: "fal-ai/hunyuan-video",
    name: "Hunyuan Video",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
    maxDuration: 5,
  },
];

const FAL_API_BASE = "https://queue.fal.run";

interface FalQueueResponse {
  request_id: string;
  status: string;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  response_url?: string;
}

interface FalResultResponse {
  video?: { url: string };
  images?: Array<{ url: string }>;
}

async function falFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) throw new Error("FAL_API_KEY is not configured");

  const res = await fetch(`${FAL_API_BASE}/${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal.ai API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

async function pollForResult(
  modelId: string,
  requestId: string,
  timeoutMs = 300_000
): Promise<FalResultResponse> {
  const startTime = Date.now();
  const statusUrl = `${FAL_API_BASE}/${modelId}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${modelId}/requests/${requestId}`;
  const apiKey = process.env.FAL_API_KEY;

  while (Date.now() - startTime < timeoutMs) {
    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const status = (await statusRes.json()) as FalStatusResponse;

    if (status.status === "COMPLETED") {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      return resultRes.json() as Promise<FalResultResponse>;
    }

    if (status.status === "FAILED") {
      throw new Error("fal.ai video generation failed");
    }

    // Wait 5 seconds between polls
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("fal.ai video generation timed out");
}

class FalVideoProvider implements MediaGenerationProvider {
  readonly name = "fal.ai";
  readonly provider = "fal";

  isConfigured(): boolean {
    return !!process.env.FAL_API_KEY;
  }

  supportsEditing(): boolean {
    return false;
  }

  supportsVideo(): boolean {
    return true;
  }

  getModels(type?: MediaGenerationType): MediaModelConfig[] {
    if (type && type !== "video") return [];
    return FAL_MODELS;
  }

  getDimensions(
    _model: string,
    _aspectRatio: AspectRatio
  ): { width: number; height: number } {
    return { width: 1280, height: 720 };
  }

  async generateVideo(
    options: VideoProviderOptions
  ): Promise<ProviderMediaResult> {
    const startTime = Date.now();

    const body: Record<string, unknown> = {
      prompt: options.prompt,
    };

    if (options.aspectRatio) {
      body.aspect_ratio = options.aspectRatio;
    }
    if (options.duration) {
      body.duration = options.duration;
    }
    if (options.referenceImageUrl) {
      body.image_url = options.referenceImageUrl;
    }

    // Submit to queue
    const queueResponse = await falFetch<FalQueueResponse>(options.model, {
      method: "POST",
      body: JSON.stringify(body),
    });

    // Poll for completion
    const result = await pollForResult(options.model, queueResponse.request_id);

    if (!result.video?.url) {
      throw new Error("fal.ai returned no video URL");
    }

    return {
      videoUrl: result.video.url,
      generationTimeMs: Date.now() - startTime,
    };
  }
}

export const falVideoProvider = new FalVideoProvider();
