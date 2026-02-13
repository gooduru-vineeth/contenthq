import type { ImageGenerationOptions, ImageGenerationResult } from "../types";
import { OPENAI_MODELS } from "../providers/openai";
import { resolveModelFromDb } from "../providers/model-factory";
import { truncateForLog } from "../utils/log-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export async function generateImage(
  options: ImageGenerationOptions & { model?: string; db?: DrizzleDb; userId?: string }
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for image generation");
  }

  let model = options.model || OPENAI_MODELS.DALLE3;
  let provider = "openai";

  // Resolve model from DB if available (4-tier: explicit > user pref > admin default > hardcoded)
  if (options.db && !options.model) {
    try {
      const resolved = await resolveModelFromDb(options.db, {
        type: "image",
        userId: options.userId,
      });
      provider = resolved.provider;
      model = resolved.modelId;
    } catch {
      console.warn("[ImageService] DB model resolution failed, using hardcoded default");
    }
  }

  console.warn(`[ImageService] Generating image: provider=${provider}, model=${model}, size=${options.size || "1024x1024"}, quality=${options.quality || "standard"}, style=${options.style || "vivid"}, prompt="${truncateForLog(options.prompt, 200)}"`);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      n: 1,
      size: options.size || "1024x1024",
      quality: options.quality || "standard",
      style: options.style || "vivid",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[ImageService] Image generation failed: provider=${provider}, model=${model}, status=${response.status}, prompt="${truncateForLog(options.prompt, 100)}", error="${truncateForLog(error, 300)}"`);
    throw new Error(`Image generation failed: ${error}`);
  }

  const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };

  console.warn(`[ImageService] Image generated: provider=${provider}, model=${model}, url="${data.data[0].url?.substring(0, 80)}", revisedPrompt="${truncateForLog(data.data[0].revised_prompt, 150)}"`);

  return {
    url: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt,
    provider,
  };
}
