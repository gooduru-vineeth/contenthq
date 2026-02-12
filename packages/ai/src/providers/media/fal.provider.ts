import { experimental_generateImage as generateImage } from "ai";
import { fal } from "@ai-sdk/fal";
import type {
  AspectRatio,
  MediaModelConfig,
  MediaGenerationType,
} from "@contenthq/shared";
import type {
  MediaGenerationProvider,
  ImageProviderOptions,
  VideoProviderOptions,
  ProviderMediaResult,
} from "./types";

// ============================================
// FAL.AI MEDIA PROVIDER
// Supports image generation (AI SDK) and video generation (REST API)
// ============================================

const FAL_IMAGE_MODELS: MediaModelConfig[] = [
  {
    id: "fal-ai/flux-2-pro",
    name: "FLUX.2 Pro",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux-2-max",
    name: "FLUX.2 Max",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    name: "FLUX Pro 1.1 Ultra",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    name: "FLUX Pro 1.1",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux-pro/kontext",
    name: "FLUX Kontext Pro",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux-pro/kontext/max",
    name: "FLUX Kontext Max",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux/dev",
    name: "FLUX Dev",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/flux/schnell",
    name: "FLUX Schnell",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/ideogram/v3",
    name: "Ideogram V3",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: true,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/recraft/v3/text-to-image",
    name: "Recraft V3",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: true,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    name: "Seedream v4.5",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/luma-photon",
    name: "Luma Photon",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "fal-ai/qwen-image",
    name: "Qwen Image",
    provider: "fal",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
];

const FAL_VIDEO_MODELS: MediaModelConfig[] = [
  {
    id: "fal-ai/veo3.1",
    name: "Veo 3.1",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    supportsImageToVideo: true,
    maxCount: 1,
    maxDuration: 8,
  },
  {
    id: "fal-ai/veo3.1/fast",
    name: "Veo 3.1 Fast",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
    maxDuration: 8,
  },
  {
    id: "fal-ai/kling-video/o3/standard/text-to-video",
    name: "Kling O3 Standard",
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
    id: "fal-ai/kling-video/o3/pro/text-to-video",
    name: "Kling O3 Pro",
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
    id: "fal-ai/sora-2/text-to-video",
    name: "Sora 2",
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
    id: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
    name: "Seedance 1.5 Pro",
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
    id: "fal-ai/vidu/q3/text-to-video",
    name: "Vidu Q3",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    supportsImageToVideo: true,
    maxCount: 1,
    maxDuration: 8,
  },
  {
    id: "fal-ai/minimax/hailuo-02/standard/image-to-video",
    name: "MiniMax Hailuo-02",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    supportsImageToVideo: true,
    maxCount: 1,
    maxDuration: 6,
  },
  {
    id: "fal-ai/wan/v2.2-a14b/image-to-video",
    name: "Wan 2.2",
    provider: "fal",
    mediaType: "video",
    supportsAspectRatio: true,
    supportedSizes: [],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    supportsImageToVideo: true,
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

const ASPECT_RATIO_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "4:3": { width: 1152, height: 896 },
  "3:4": { width: 896, height: 1152 },
  "21:9": { width: 1536, height: 640 },
};

class FalMediaProvider implements MediaGenerationProvider {
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
    if (!type) return [...FAL_IMAGE_MODELS, ...FAL_VIDEO_MODELS];
    if (type === "image") return FAL_IMAGE_MODELS;
    if (type === "video") return FAL_VIDEO_MODELS;
    return [];
  }

  getDimensions(
    _model: string,
    aspectRatio: AspectRatio
  ): { width: number; height: number } {
    return ASPECT_RATIO_DIMENSIONS[aspectRatio] ?? { width: 1024, height: 1024 };
  }

  async generateImage(
    options: ImageProviderOptions
  ): Promise<ProviderMediaResult> {
    const { prompt, model, aspectRatio, count } = options;
    const startTime = Date.now();

    const result = await generateImage({
      model: fal.image(model),
      prompt,
      n: count,
      aspectRatio,
    });

    const generationTimeMs = Date.now() - startTime;

    const images = result.images.map((img) => ({
      base64: img.base64,
      mediaType: img.mediaType || "image/png",
    }));

    return {
      images,
      generationTimeMs,
    };
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

export const falMediaProvider = new FalMediaProvider();
