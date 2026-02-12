import { createAnthropic } from "@ai-sdk/anthropic";

export function getAnthropicProvider(apiKey?: string) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY is required");
  }
  return createAnthropic({ apiKey: key });
}

export const ANTHROPIC_MODELS = {
  CLAUDE_OPUS_4_6: "claude-opus-4-6",
  CLAUDE_OPUS_4_5: "claude-opus-4-5-20250929",
  CLAUDE_SONNET_4_5: "claude-sonnet-4-5-20250929",
  CLAUDE_HAIKU_4_5: "claude-haiku-4-5-20251001",
  CLAUDE_OPUS_4_1: "claude-opus-4-1-20250414",
  CLAUDE_SONNET_4: "claude-sonnet-4-20250514",
  CLAUDE_OPUS_4: "claude-opus-4-20250514",
  /** @deprecated Use CLAUDE_SONNET_4_5 */
  CLAUDE_SONNET: "claude-sonnet-4-5-20250929",
  /** @deprecated Use CLAUDE_HAIKU_4_5 */
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
} as const;
