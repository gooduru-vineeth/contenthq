import type { ImageGenerationOptions, ImageGenerationResult } from "../types";
import { OPENAI_MODELS } from "../providers/openai";

export async function generateImage(
  options: ImageGenerationOptions & { model?: string }
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for image generation");
  }

  const model = options.model || OPENAI_MODELS.DALLE3;

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
    throw new Error(`Image generation failed: ${error}`);
  }

  const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };

  return {
    url: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt,
    provider: "openai",
  };
}
