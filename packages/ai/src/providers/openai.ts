import { createOpenAI } from "@ai-sdk/openai";

export function getOpenAIProvider(apiKey?: string) {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required");
  }
  return createOpenAI({ apiKey: key });
}

export const OPENAI_MODELS = {
  GPT5_2: "gpt-5.2",
  GPT5_1: "gpt-5.1",
  GPT5: "gpt-5",
  GPT5_MINI: "gpt-5-mini",
  GPT5_NANO: "gpt-5-nano",
  GPT4_1: "gpt-4.1",
  GPT4_1_MINI: "gpt-4.1-mini",
  GPT4_1_NANO: "gpt-4.1-nano",
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  O1: "o1",
  O1_PRO: "o1-pro",
  O3: "o3",
  O3_PRO: "o3-pro",
  O3_MINI: "o3-mini",
  O4_MINI: "o4-mini",
  DALLE3: "dall-e-3",
} as const;
