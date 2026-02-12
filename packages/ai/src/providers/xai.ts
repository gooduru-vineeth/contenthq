import { createXai } from "@ai-sdk/xai";

export function getXAIProvider(apiKey?: string) {
  const key = apiKey || process.env.XAI_API_KEY;
  if (!key) {
    throw new Error("XAI_API_KEY is required");
  }
  return createXai({ apiKey: key });
}

export const XAI_MODELS = {
  GROK_4: "grok-4",
  GROK_3: "grok-3",
  GROK_3_FAST: "grok-3-fast",
  GROK_3_MINI: "grok-3-mini",
  GROK_3_MINI_FAST: "grok-3-mini-fast",
} as const;
