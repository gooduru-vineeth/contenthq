import Replicate from "replicate";
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
  ImageEditOptions,
} from "./types";

// ============================================
// REPLICATE MEDIA PROVIDER
// Supports FLUX 1.1 Pro, FLUX Schnell, FLUX Kontext, SD 3.5,
// Nano Banana, Seedream, Playground v2.5, and MiniMax Video 01
// ============================================

// Max time to wait for a single Replicate prediction attempt (2 minutes)
const PREDICTION_TIMEOUT_MS = 120_000;

// Retry config for transient failures (model overloaded, high demand, etc.)
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 5_000;

// Error patterns that indicate a transient/retriable failure
const TRANSIENT_ERROR_PATTERNS = [
  "unavailable",
  "high demand",
  "overloaded",
  "capacity",
  "try again later",
  "temporarily",
  "cold boot",
];

function isTransientError(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => lower.includes(pattern));
}

function isDataUrl(url: string): boolean {
  return url.startsWith("data:");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const REPLICATE_IMAGE_MODELS: MediaModelConfig[] = [
  {
    id: "black-forest-labs/flux-1.1-pro",
    name: "FLUX 1.1 Pro",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
  },
  {
    id: "black-forest-labs/flux-schnell",
    name: "FLUX Schnell",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: false,
    maxCount: 4,
  },
  {
    id: "stability-ai/stable-diffusion-3.5-large",
    name: "Stable Diffusion 3.5 Large",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
  },
  {
    id: "google/nano-banana-pro",
    name: "Nano Banana Pro",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: true,
    maxCount: 1,
  },
  {
    id: "google/nano-banana",
    name: "Nano Banana",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: true,
    maxCount: 1,
  },
  {
    id: "black-forest-labs/flux-kontext-pro",
    name: "FLUX Kontext Pro",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: true,
    maxCount: 1,
  },
  {
    id: "black-forest-labs/flux-kontext-max",
    name: "FLUX Kontext Max",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: true,
    maxCount: 1,
  },
  {
    id: "bytedance/seedream-4",
    name: "Seedream 4",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: ["1024x1024", "2048x2048", "4096x4096"],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: true,
    maxCount: 1,
  },
  {
    id: "playgroundai/playground-v2.5-1024px-aesthetic",
    name: "Playground v2.5",
    provider: "replicate",
    mediaType: "image",
    supportsAspectRatio: true,
    supportedSizes: [
      "1024x1024",
      "1360x768",
      "768x1360",
      "1152x864",
      "864x1152",
    ],
    supportsStyle: false,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
  },
];

const REPLICATE_VIDEO_MODELS: MediaModelConfig[] = [
  {
    id: "minimax/video-01",
    name: "MiniMax Video 01",
    provider: "replicate",
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
];

const ALL_REPLICATE_MODELS: MediaModelConfig[] = [
  ...REPLICATE_IMAGE_MODELS,
  ...REPLICATE_VIDEO_MODELS,
];

const IMG2IMG_MODELS = new Set([
  "google/nano-banana-pro",
  "google/nano-banana",
  "black-forest-labs/flux-kontext-pro",
  "black-forest-labs/flux-kontext-max",
  "bytedance/seedream-4",
]);

// Aspect ratio to size mapping per model type
const SIZE_MAP: Record<AspectRatio, Record<string, string>> = {
  "1:1": { default: "1024x1024" },
  "16:9": { default: "1360x768" },
  "9:16": { default: "768x1360" },
  "4:3": { default: "1152x864" },
  "3:4": { default: "864x1152" },
  "21:9": { default: "1456x624" },
};

// Models that accept aspect_ratio as a direct parameter instead of width/height
const ASPECT_RATIO_NATIVE_MODELS = new Set([
  "black-forest-labs/flux-1.1-pro",
  "black-forest-labs/flux-schnell",
  "black-forest-labs/flux-kontext-pro",
  "black-forest-labs/flux-kontext-max",
  "stability-ai/stable-diffusion-3.5-large",
  "google/nano-banana-pro",
  "google/nano-banana",
  "bytedance/seedream-4",
]);

// Version hashes for Replicate models to ensure stable API calls
const MODEL_VERSIONS: Record<string, string> = {
  "black-forest-labs/flux-1.1-pro":
    "609793a667ed94b210242837d3c3c9fc9a64ae93685f15d75002ba0ed9a97f2b",
  "black-forest-labs/flux-schnell":
    "c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e",
  "stability-ai/stable-diffusion-3.5-large":
    "2fdf9488b53c1e0fd3aef7b477def1c00d1856a38466733711f9c769942598f5",
  "google/nano-banana-pro":
    "fdf4cb96614227f3021c42f35bc92d4fd2e3e1ae9f50ca4004ffa8da64bf8dca",
  "google/nano-banana":
    "5bdc2c7cd642ae33611d8c33f79615f98ff02509ab8db9d8ec1cc6c36d378fba",
  "playgroundai/playground-v2.5-1024px-aesthetic":
    "a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24",
};

// Quality to inference steps mapping (only for models that accept num_inference_steps)
const QUALITY_STEPS_MAP: Record<string, { standard: number; hd: number }> = {
  "playgroundai/playground-v2.5-1024px-aesthetic": {
    standard: 25,
    hd: 50,
  },
};

function getModelRef(
  model: string
): `${string}/${string}` | `${string}/${string}:${string}` {
  const version = MODEL_VERSIONS[model];
  return (version ? `${model}:${version}` : model) as
    | `${string}/${string}`
    | `${string}/${string}:${string}`;
}

function getSizeForModel(model: string, aspectRatio: AspectRatio): string {
  const sizes = SIZE_MAP[aspectRatio];
  return sizes[model] || sizes.default || "1024x1024";
}

function parseDimensions(size: string): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w, height: h };
}

// Extract URLs from Replicate output, handling FileOutput objects from SDK v1.x
// FileOutput.url() returns a URL object (not string), but String(fileOutput) works correctly
function extractUrlsFromOutput(output: unknown): string[] {
  const urls: string[] = [];

  const pushIfValid = (item: unknown): void => {
    // FileOutput objects: String() calls toString() which returns the URL string
    const str = String(item);
    if (str && str.startsWith("http")) {
      urls.push(str);
    }
  };

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) {
        urls.push(item);
      } else if (item && typeof item === "object") {
        pushIfValid(item);
      }
    }
  } else if (typeof output === "string" && output.startsWith("http")) {
    urls.push(output);
  } else if (output && typeof output === "object") {
    pushIfValid(output);
  }

  return urls;
}

async function fetchImageAsBase64(
  url: string,
  timeoutMs: number = 30000
): Promise<{ base64: string; mediaType: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/png";
    return {
      base64: buffer.toString("base64"),
      mediaType: contentType,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

class ReplicateMediaProvider implements MediaGenerationProvider {
  readonly name = "Replicate";
  readonly provider = "replicate";

  private getClient(): Replicate {
    return new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }

  isConfigured(): boolean {
    return !!process.env.REPLICATE_API_TOKEN;
  }

  supportsEditing(modelId: string): boolean {
    return IMG2IMG_MODELS.has(modelId);
  }

  supportsVideo(): boolean {
    return true;
  }

  getModels(type?: MediaGenerationType): MediaModelConfig[] {
    if (type === "image") return REPLICATE_IMAGE_MODELS;
    if (type === "video") return REPLICATE_VIDEO_MODELS;
    return ALL_REPLICATE_MODELS;
  }

  getDimensions(
    model: string,
    aspectRatio: AspectRatio
  ): { width: number; height: number } {
    const size = getSizeForModel(model, aspectRatio);
    return parseDimensions(size);
  }

  /**
   * Run a Replicate prediction with timeout + automatic retry on transient errors.
   * Retries up to MAX_RETRIES times with exponential backoff for errors like
   * "Service is currently unavailable due to high demand."
   */
  private async runWithRetry(
    replicate: Replicate,
    modelRef: `${string}/${string}` | `${string}/${string}:${string}`,
    input: Record<string, string | number | string[] | boolean>
  ): Promise<unknown> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[Replicate] Retry ${attempt}/${MAX_RETRIES} for ${String(modelRef)} after ${backoff}ms`
        );
        await delay(backoff);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        PREDICTION_TIMEOUT_MS
      );

      try {
        const output = await replicate.run(modelRef, {
          input,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return output;
      } catch (error) {
        clearTimeout(timeoutId);

        if (controller.signal.aborted) {
          throw new Error(
            `Prediction timed out after ${PREDICTION_TIMEOUT_MS / 1000}s — the model may be unavailable or under high demand`
          );
        }

        const message = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(message);

        // Only retry on transient errors
        if (!isTransientError(message)) {
          throw lastError;
        }

        // Don't retry after the last attempt
        if (attempt === MAX_RETRIES) {
          throw lastError;
        }
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error("Prediction failed");
  }

  async generateImage(
    options: ImageProviderOptions
  ): Promise<ProviderMediaResult> {
    const { prompt, model, aspectRatio, quality, count } = options;
    const replicate = this.getClient();
    const size = getSizeForModel(model, aspectRatio);
    const { width, height } = parseDimensions(size);
    const startTime = Date.now();

    // Build model-specific input parameters
    const input: Record<string, string | number> = { prompt };

    // For models that accept aspect_ratio natively
    if (ASPECT_RATIO_NATIVE_MODELS.has(model)) {
      input.aspect_ratio = aspectRatio;
    } else {
      // Other models use width/height
      input.width = width;
      input.height = height;
    }

    // Map quality to inference steps (only for models that accept num_inference_steps)
    const qualitySteps = QUALITY_STEPS_MAP[model];
    if (qualitySteps) {
      const steps = quality === "hd" ? qualitySteps.hd : qualitySteps.standard;
      input.num_inference_steps = steps;
    }

    // Model-specific quality parameters
    if (model === "stability-ai/stable-diffusion-3.5-large") {
      // SD 3.5 uses cfg (guidance scale) instead of steps
      input.cfg = quality === "hd" ? 7.5 : 5;
    } else if (model === "google/nano-banana-pro") {
      // Nano Banana Pro uses resolution for quality
      input.resolution = quality === "hd" ? 4096 : 2048;
    }

    // FLUX Schnell supports num_outputs for multiple images
    if (model === "black-forest-labs/flux-schnell" && count > 1) {
      input.num_outputs = count;
    }

    // Request PNG output for models that support output_format
    if (
      model.startsWith("black-forest-labs/") ||
      model.startsWith("stability-ai/") ||
      model.startsWith("google/nano-banana")
    ) {
      input.output_format = "png";
    }

    // Call Replicate API with retry + timeout for transient failures
    const output = await this.runWithRetry(
      replicate,
      getModelRef(model),
      input
    );

    const generationTimeMs = Date.now() - startTime;

    // Extract URLs from Replicate output (handles FileOutput objects from SDK v1.x)
    const urls = extractUrlsFromOutput(output);

    if (urls.length === 0) {
      throw new Error(
        `Model ${model} returned no valid image URLs. ` +
          `Output type: ${typeof output}, isArray: ${Array.isArray(output)}`
      );
    }

    // Fetch images from URLs and convert to base64
    const images = await Promise.all(
      urls.map(async (url, index) => {
        if (typeof url === "string" && url.startsWith("http")) {
          try {
            return await fetchImageAsBase64(url);
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : "Unknown error";
            throw new Error(
              `Failed to fetch image ${index + 1}/${urls.length} from ${model}: ${errorMsg}`
            );
          }
        }
        // If output is already base64 or other format
        if (typeof url === "string" && url.length > 0) {
          return {
            base64: url,
            mediaType: "image/png",
          };
        }
        throw new Error(`Invalid image data at index ${index} from ${model}`);
      })
    );

    return {
      images,
      generationTimeMs,
    };
  }

  async generateVideo(
    options: VideoProviderOptions
  ): Promise<ProviderMediaResult> {
    const { prompt, model, aspectRatio, referenceImageUrl } = options;
    const replicate = this.getClient();
    const startTime = Date.now();

    const input: Record<string, string | number | boolean> = { prompt };

    if (aspectRatio) {
      input.aspect_ratio = aspectRatio;
    }

    if (referenceImageUrl) {
      input.first_frame_image = referenceImageUrl;
    }

    const output = await this.runWithRetry(
      replicate,
      getModelRef(model),
      input
    );

    const generationTimeMs = Date.now() - startTime;

    // Extract video URL from output
    const urls = extractUrlsFromOutput(output);

    if (urls.length === 0) {
      throw new Error(
        `Model ${model} returned no valid video URLs. ` +
          `Output type: ${typeof output}, isArray: ${Array.isArray(output)}`
      );
    }

    return {
      videoUrl: urls[0],
      generationTimeMs,
    };
  }

  async editImage(options: ImageEditOptions): Promise<ProviderMediaResult> {
    const {
      image,
      prompt,
      model,
      strength = 0.8,
      referenceImage,
      styleDescription,
    } = options;
    const replicate = this.getClient();
    const startTime = Date.now();

    if (!this.supportsEditing(model)) {
      throw new Error(`Model ${model} does not support image editing`);
    }

    // Validate image URL - Replicate models require HTTP URLs, not data URLs
    if (isDataUrl(image)) {
      throw new Error(
        "Image editing requires images stored with HTTP URLs. " +
          "Data URLs are not supported. Please ensure cloud storage is configured."
      );
    }

    if (referenceImage && isDataUrl(referenceImage)) {
      throw new Error(
        "Reference image must be an HTTP URL, not a data URL. " +
          "Please ensure cloud storage is configured."
      );
    }

    // Enhance prompt with style description if available (from pre-analyzed reference image)
    // Include instructions to preserve the scene/background
    const enhancedPrompt = styleDescription
      ? `CRITICAL INSTRUCTION: Edit this image while PRESERVING the EXACT same scene, background, environment, and composition. Do NOT change the setting or location.

Apply the following visual style to this edit:
${styleDescription}

Edit instruction: ${prompt}

REMEMBER: Keep the same background, scenery, and environment. Only modify elements as described in the edit instruction. Do not replace the background or change the scene.`
      : prompt;

    const input: Record<string, string | number | string[]> = {
      prompt: enhancedPrompt,
    };

    if (model.startsWith("google/nano-banana")) {
      // Nano Banana uses conversational editing via prompt (no strength parameter)
      input.image_input = [image];
      input.aspect_ratio = "match_input_image";
      input.output_format = "png";
    } else if (model.startsWith("black-forest-labs/flux-kontext")) {
      // FLUX Kontext uses 'input_image' as single URI - designed for editing
      input.input_image = image;
      input.aspect_ratio = "match_input_image";
      input.output_format = "png";
    } else if (model === "bytedance/seedream-4") {
      // Seedream uses conversational editing via prompt (no strength parameter)
      input.image_input = [image];
      input.aspect_ratio = "match_input_image";
      input.output_format = "png";
    } else {
      // Fallback for other models that may support strength
      input.image = image;
      input.prompt_strength = strength;
    }

    // Call Replicate API with retry + timeout for transient failures
    const output = await this.runWithRetry(
      replicate,
      getModelRef(model),
      input
    );

    const generationTimeMs = Date.now() - startTime;

    // Extract URLs from Replicate output (handles FileOutput objects from SDK v1.x)
    const urls = extractUrlsFromOutput(output);

    if (urls.length === 0) {
      throw new Error(
        `Model ${model} returned no valid image URLs during edit`
      );
    }

    const images = await Promise.all(
      urls.map(async (url, index) => {
        if (typeof url === "string" && url.startsWith("http")) {
          try {
            return await fetchImageAsBase64(url);
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : "Unknown error";
            throw new Error(
              `Failed to fetch edited image ${index + 1}: ${errorMsg}`
            );
          }
        }
        if (typeof url === "string" && url.length > 0) {
          return {
            base64: url,
            mediaType: "image/png",
          };
        }
        throw new Error(`Invalid edited image data at index ${index}`);
      })
    );

    return {
      images,
      generationTimeMs,
    };
  }
}

export const replicateMediaProvider = new ReplicateMediaProvider();
