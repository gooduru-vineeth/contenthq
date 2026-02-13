import type { AnthropicCapabilities, WebSearchOptions, WebFetchOptions } from "../types";
import { getAnthropicProvider } from "../providers/anthropic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolRecord = Record<string, any>;

export interface AnthropicToolsAndOptions {
  tools?: ToolRecord;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  providerOptions?: Record<string, any>;
  maxSteps?: number;
}

/**
 * Build Anthropic provider tools and providerOptions from capabilities config.
 * Returns tools for web search, web fetch, code execution, and providerOptions for thinking.
 */
export function buildAnthropicToolsAndOptions(
  capabilities: AnthropicCapabilities
): AnthropicToolsAndOptions {
  const tools: ToolRecord = {};
  let providerOptions: Record<string, unknown> | undefined;
  let needsMaxSteps = false;

  const anthropic = getAnthropicProvider();

  // Web Search
  if (capabilities.webSearch) {
    const opts: WebSearchOptions =
      typeof capabilities.webSearch === "boolean" ? {} : capabilities.webSearch;

    tools.web_search = anthropic.tools.webSearch_20250305({
      maxUses: opts.maxUses ?? 5,
      ...(opts.allowedDomains && { allowedDomains: opts.allowedDomains }),
      ...(opts.blockedDomains && { blockedDomains: opts.blockedDomains }),
      ...(opts.userLocation && { userLocation: opts.userLocation }),
    });
    needsMaxSteps = true;
  }

  // Web Fetch
  if (capabilities.webFetch) {
    const opts: WebFetchOptions =
      typeof capabilities.webFetch === "boolean" ? {} : capabilities.webFetch;

    tools.web_fetch = anthropic.tools.webFetch_20250910({
      maxUses: opts.maxUses ?? 1,
      ...(opts.allowedDomains && { allowedDomains: opts.allowedDomains }),
      ...(opts.blockedDomains && { blockedDomains: opts.blockedDomains }),
    });
    needsMaxSteps = true;
  }

  // Code Execution
  if (capabilities.codeExecution) {
    tools.code_execution = anthropic.tools.codeExecution_20250825();
    needsMaxSteps = true;
  }

  // Extended Thinking
  if (capabilities.thinking && capabilities.thinking.type !== "disabled") {
    providerOptions = {
      anthropic: {
        thinking: {
          type: capabilities.thinking.type,
          ...(capabilities.thinking.type === "enabled" &&
            capabilities.thinking.budgetTokens && {
              budgetTokens: capabilities.thinking.budgetTokens,
            }),
        },
      },
    };
  }

  const result: AnthropicToolsAndOptions = {};
  if (Object.keys(tools).length > 0) {
    result.tools = tools;
  }
  if (providerOptions) {
    result.providerOptions = providerOptions;
  }
  if (needsMaxSteps) {
    result.maxSteps = 5;
  }

  return result;
}

/**
 * Extract source URLs from an AI SDK generateText result.
 * Sources come from web search tool calls in the result's sources array.
 */
export function extractSourcesFromResult(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
): Array<{ url: string; title: string | null; snippet?: string }> {
  const sources: Array<{ url: string; title: string | null; snippet?: string }> = [];

  // AI SDK v6 returns sources as result.sources for provider tools
  if (result.sources && Array.isArray(result.sources)) {
    for (const source of result.sources) {
      if (source.sourceType === "url" && source.url) {
        sources.push({
          url: source.url,
          title: source.title ?? null,
          snippet: undefined,
        });
      }
    }
  }

  return sources;
}
