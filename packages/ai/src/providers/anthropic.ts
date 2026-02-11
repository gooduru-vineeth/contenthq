import { createAnthropic } from "@ai-sdk/anthropic";

export function getAnthropicProvider(apiKey?: string) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }
  return createAnthropic({ apiKey: key });
}

export const ANTHROPIC_MODELS = {
  CLAUDE_SONNET: "claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
} as const;
