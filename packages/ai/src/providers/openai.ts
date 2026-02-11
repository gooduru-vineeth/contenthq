import { createOpenAI } from "@ai-sdk/openai";

export function getOpenAIProvider(apiKey?: string) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required");
  }
  return createOpenAI({ apiKey: key });
}

export const OPENAI_MODELS = {
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  DALLE3: "dall-e-3",
} as const;
