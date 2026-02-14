/**
 * Provider-aware prompt caching utilities for AI SDK calls.
 *
 * - Anthropic: adds `cacheControl: { type: 'ephemeral' }` to system messages (90% cheaper cached reads, 5-min TTL)
 * - OpenAI: adds `promptCacheRetention: '24h'` at call level (50% cheaper, extended retention)
 */

/** JSON-compatible value type matching @ai-sdk/provider's JSONValue */
type JSONValue = null | string | number | boolean | { [key: string]: JSONValue | undefined } | JSONValue[];

/** JSON-compatible object matching @ai-sdk/provider's JSONObject */
type JSONObject = { [key: string]: JSONValue | undefined };

/** Provider options type compatible with AI SDK's SharedV3ProviderOptions */
export type ProviderOptions = Record<string, JSONObject>;

const ANTHROPIC_PROVIDERS = new Set(["anthropic", "vertex-anthropic"]);
const OPENAI_PROVIDERS = new Set(["openai"]);

const ANTHROPIC_CACHE_PROVIDER_OPTIONS: ProviderOptions = {
  anthropic: { cacheControl: { type: "ephemeral" } },
};

/**
 * Wrap a system prompt with provider-specific cache control.
 *
 * For Anthropic providers, returns a SystemModelMessage with `providerOptions`
 * for ephemeral caching. For all others, returns the plain string unchanged.
 *
 * Returns `undefined` if no system prompt is provided.
 */
export function withSystemCacheControl(
  provider: string,
  systemPrompt: string | undefined
): string | { role: "system"; content: string; providerOptions: ProviderOptions } | undefined {
  if (!systemPrompt) return undefined;

  if (ANTHROPIC_PROVIDERS.has(provider)) {
    return {
      role: "system" as const,
      content: systemPrompt,
      providerOptions: ANTHROPIC_CACHE_PROVIDER_OPTIONS,
    };
  }

  return systemPrompt;
}

/**
 * Return call-level providerOptions for providers that support prompt cache retention.
 *
 * OpenAI: `{ openai: { promptCacheRetention: '24h' } }` — extends automatic cache TTL.
 * Others: `undefined` (no call-level cache options needed).
 */
export function getCallLevelCacheOptions(
  provider: string
): ProviderOptions | undefined {
  if (OPENAI_PROVIDERS.has(provider)) {
    return { openai: { promptCacheRetention: "24h" } };
  }
  return undefined;
}

/**
 * Shallow-merge multiple providerOptions objects by provider key.
 *
 * Each argument is a `Record<providerName, JSONObject>` or `undefined`.
 * Per-provider keys are merged (later values override earlier ones for the same key within a provider).
 *
 * Returns `undefined` if all inputs are undefined or empty.
 */
export function mergeProviderOptions(
  ...optionsList: (ProviderOptions | Record<string, Record<string, unknown>> | undefined)[]
): ProviderOptions | undefined {
  let merged: ProviderOptions | undefined;

  for (const opts of optionsList) {
    if (!opts) continue;
    for (const [providerKey, providerOpts] of Object.entries(opts)) {
      if (!merged) merged = {};
      merged[providerKey] = { ...merged[providerKey], ...providerOpts } as JSONObject;
    }
  }

  return merged;
}
