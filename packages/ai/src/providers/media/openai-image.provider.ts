import { experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";
import OpenAI from "openai";
import type {
  AspectRatio,
  MediaModelConfig,
  MediaGenerationType,
} from "@contenthq/shared";
import type {
  MediaGenerationProvider,
  ImageProviderOptions,
  ProviderMediaResult,
  ImageEditOptions,
} from "./types";

// ============================================
// OPENAI IMAGE PROVIDER
// Supports DALL-E 3 and GPT Image 1
// ============================================

const OPENAI_MODELS: MediaModelConfig[] = [
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "openai",
    mediaType: "image",
    supportsAspectRatio: false,
    supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    supportsStyle: true,
    supportsMultiple: false,
    supportsEditing: false,
    maxCount: 1,
  },
  {
    id: "gpt-image-1",
    name: "GPT Image 1",
    provider: "openai",
    mediaType: "image",
    supportsAspectRatio: false,
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536"],
    supportsStyle: false,
    supportsMultiple: true,
    supportsEditing: true,
    maxCount: 4,
  },
];

const EDIT_SIZE_MAP: Record<string, string> = {
  "gpt-image-1": "1024x1024",
};

const SIZE_MAP: Record<AspectRatio, Record<string, string>> = {
  "1:1": { "dall-e-3": "1024x1024", "gpt-image-1": "1024x1024" },
  "16:9": { "dall-e-3": "1792x1024", "gpt-image-1": "1536x1024" },
  "9:16": { "dall-e-3": "1024x1792", "gpt-image-1": "1024x1536" },
  "4:3": { "dall-e-3": "1792x1024", "gpt-image-1": "1536x1024" },
  "3:4": { "dall-e-3": "1024x1792", "gpt-image-1": "1024x1536" },
  "21:9": { "dall-e-3": "1792x1024", "gpt-image-1": "1536x1024" },
};

function parseDimensions(size: string): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w, height: h };
}

/**
 * Analyze a reference image using GPT-4o-mini to extract style description.
 * Used to enhance edit prompts when OpenAI models are selected with a reference image.
 */
async function analyzeReferenceImage(
  imageUrl: string,
  client: OpenAI
): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe this image's visual style in 1-2 sentences. Focus on: art style, color palette, lighting, mood, and composition. Be concise.",
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });
    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Failed to analyze reference image:", error);
    return "";
  }
}

class OpenAIImageProvider implements MediaGenerationProvider {
  readonly name = "OpenAI";
  readonly provider = "openai";

  private getClient(): OpenAI {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  supportsEditing(modelId: string): boolean {
    const model = OPENAI_MODELS.find((m) => m.id === modelId);
    return model?.supportsEditing ?? false;
  }

  supportsVideo(): boolean {
    return false;
  }

  getModels(type?: MediaGenerationType): MediaModelConfig[] {
    if (type && type !== "image") return [];
    return OPENAI_MODELS;
  }

  getDimensions(
    model: string,
    aspectRatio: AspectRatio
  ): { width: number; height: number } {
    const sizes = SIZE_MAP[aspectRatio];
    const size = sizes[model] || "1024x1024";
    return parseDimensions(size);
  }

  async generateImage(
    options: ImageProviderOptions
  ): Promise<ProviderMediaResult> {
    const { prompt, model, aspectRatio, quality, style, count } = options;
    const sizes = SIZE_MAP[aspectRatio];
    const size = sizes[model] || "1024x1024";
    const startTime = Date.now();

    const providerOptions: Record<string, Record<string, string>> = {};

    if (model === "dall-e-3") {
      providerOptions.openai = {
        quality: quality === "hd" ? "hd" : "standard",
      };
      if (style) {
        providerOptions.openai.style = style;
      }
    } else if (model === "gpt-image-1") {
      providerOptions.openai = {
        quality: quality === "hd" ? "high" : "medium",
      };
    }

    const result = await generateImage({
      model: openai.image(model),
      prompt,
      n: count,
      size: size as `${number}x${number}`,
      providerOptions,
    });

    const generationTimeMs = Date.now() - startTime;

    const images = result.images.map((img) => {
      return {
        base64: img.base64,
        mediaType: img.mimeType || "image/png",
      };
    });

    return {
      images,
      generationTimeMs,
    };
  }

  async editImage(options: ImageEditOptions): Promise<ProviderMediaResult> {
    const { image, prompt, model, count, referenceImage, styleDescription } =
      options;
    const client = this.getClient();
    const startTime = Date.now();

    if (!this.supportsEditing(model)) {
      throw new Error(`Model ${model} does not support image editing`);
    }

    const size = EDIT_SIZE_MAP[model] || "1024x1024";

    // Enhance prompt with pre-computed style description if available,
    // otherwise fall back to local analysis for backwards compatibility
    // Include instructions to preserve scene/background
    let enhancedPrompt = prompt;
    if (styleDescription) {
      enhancedPrompt = `CRITICAL: Edit this image while PRESERVING the EXACT same scene, background, and composition.

Apply this visual style:
${styleDescription}

Edit instruction: ${prompt}

REMEMBER: Keep the same background and environment. Only modify elements as instructed.`;
    } else if (referenceImage) {
      const localStyleDesc = await analyzeReferenceImage(
        referenceImage,
        client
      );
      if (localStyleDesc) {
        enhancedPrompt = `CRITICAL: Edit this image while PRESERVING the EXACT same scene, background, and composition.

Apply this visual style:
${localStyleDesc}

Edit instruction: ${prompt}

REMEMBER: Keep the same background and environment. Only modify elements as instructed.`;
      }
    }

    const imageResponse = await fetch(image);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch source image");
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const imageFile = new File([imageBuffer], "image.png", {
      type: "image/png",
    });

    const result = await client.images.edit({
      image: imageFile,
      prompt: enhancedPrompt,
      model: model as "gpt-image-1" | "dall-e-2",
      size: size as "1024x1024" | "1536x1024" | "1024x1536",
      n: count,
    });

    const generationTimeMs = Date.now() - startTime;

    if (!result.data || result.data.length === 0) {
      throw new Error("OpenAI edit returned no image data");
    }

    const images = await Promise.all(
      result.data.map(async (img) => {
        if (img.url) {
          const res = await fetch(img.url);
          const buffer = Buffer.from(await res.arrayBuffer());
          return {
            base64: buffer.toString("base64"),
            mediaType: "image/png",
            revisedPrompt: img.revised_prompt,
          };
        } else if (img.b64_json) {
          return {
            base64: img.b64_json,
            mediaType: "image/png",
            revisedPrompt: img.revised_prompt,
          };
        }
        throw new Error("No image data returned from OpenAI");
      })
    );

    return {
      images,
      generationTimeMs,
    };
  }
}

export const openaiImageProvider = new OpenAIImageProvider();
