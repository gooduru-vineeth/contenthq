import { generateText } from "../tracing";
import { getAnthropicProvider } from "../providers/anthropic";
import { ANTHROPIC_MODELS } from "../providers/model-factory";
import { buildAnthropicToolsAndOptions, extractSourcesFromResult } from "./anthropic-tools";
import { truncateForLog } from "../utils/log-helpers";
import { withSystemCacheControl, mergeProviderOptions } from "../utils/cache-control";

export interface WebSearchRequest {
  query: string;
  systemPrompt?: string;
  model?: string;
  maxSearches?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  enableThinking?: boolean;
  thinkingBudget?: number;
  maxTokens?: number;
}

export interface WebSearchResult {
  answer: string;
  sources: Array<{ url: string; title: string | null; snippet?: string }>;
  tokens: { input: number; output: number };
  reasoningText?: string;
  provider: string;
  model: string;
}

/**
 * Perform a web-grounded search using Claude with the web search tool.
 * Always uses the Anthropic provider.
 */
export async function searchWeb(request: WebSearchRequest): Promise<WebSearchResult> {
  const modelId = request.model ?? ANTHROPIC_MODELS.CLAUDE_SONNET_4_5;
  const anthropic = getAnthropicProvider();

  console.warn(
    `[SearchService] searchWeb: model=${modelId}, maxSearches=${request.maxSearches ?? 5}, query="${truncateForLog(request.query, 200)}"`
  );

  const { tools, providerOptions, maxSteps } = buildAnthropicToolsAndOptions({
    webSearch: {
      maxUses: request.maxSearches ?? 5,
      allowedDomains: request.allowedDomains,
      blockedDomains: request.blockedDomains,
    },
    ...(request.enableThinking && {
      thinking: {
        type: "enabled" as const,
        budgetTokens: request.thinkingBudget ?? 10000,
      },
    }),
  });

  // Add provider-level prompt caching for Anthropic
  const systemParam = withSystemCacheControl("anthropic", request.systemPrompt);
  const mergedOpts = mergeProviderOptions(providerOptions);

  const result = await generateText({
    model: anthropic(modelId),
    prompt: request.query,
    system: systemParam,
    maxOutputTokens: request.maxTokens,
    ...(tools && { tools }),
    ...(maxSteps && { maxSteps }),
    ...(mergedOpts && { providerOptions: mergedOpts }),
  });

  const sources = extractSourcesFromResult(result);

  // Log cache metrics for observability
  const cacheMeta = (result as { providerMetadata?: { anthropic?: { cacheCreationInputTokens?: number; cacheReadInputTokens?: number } } }).providerMetadata?.anthropic;
  if (cacheMeta?.cacheCreationInputTokens || cacheMeta?.cacheReadInputTokens) {
    console.warn(`[SearchService] Cache: created=${cacheMeta.cacheCreationInputTokens ?? 0}, read=${cacheMeta.cacheReadInputTokens ?? 0}`);
  }

  console.warn(
    `[SearchService] searchWeb complete: model=${modelId}, inputTokens=${result.usage?.inputTokens ?? 0}, outputTokens=${result.usage?.outputTokens ?? 0}, sources=${sources.length}`
  );

  return {
    answer: result.text,
    sources,
    tokens: {
      input: result.usage?.inputTokens ?? 0,
      output: result.usage?.outputTokens ?? 0,
    },
    reasoningText: (result as { reasoningText?: string }).reasoningText,
    provider: "anthropic",
    model: modelId,
  };
}

/**
 * Fetch a specific URL and analyze it using Claude with the web fetch tool.
 */
export async function fetchAndAnalyze(
  url: string,
  analysisPrompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    enableThinking?: boolean;
    thinkingBudget?: number;
    maxTokens?: number;
  }
): Promise<WebSearchResult> {
  const modelId = options?.model ?? ANTHROPIC_MODELS.CLAUDE_SONNET_4_5;
  const anthropic = getAnthropicProvider();

  console.warn(
    `[SearchService] fetchAndAnalyze: model=${modelId}, url="${truncateForLog(url, 100)}", prompt="${truncateForLog(analysisPrompt, 200)}"`
  );

  const { tools, providerOptions, maxSteps } = buildAnthropicToolsAndOptions({
    webFetch: { maxUses: 1 },
    ...(options?.enableThinking && {
      thinking: {
        type: "enabled" as const,
        budgetTokens: options.thinkingBudget ?? 10000,
      },
    }),
  });

  const prompt = `${analysisPrompt}\n\nURL: ${url}`;

  // Add provider-level prompt caching for Anthropic
  const systemParam = withSystemCacheControl("anthropic", options?.systemPrompt);
  const mergedOpts = mergeProviderOptions(providerOptions);

  const result = await generateText({
    model: anthropic(modelId),
    prompt,
    system: systemParam,
    maxOutputTokens: options?.maxTokens,
    ...(tools && { tools }),
    ...(maxSteps && { maxSteps }),
    ...(mergedOpts && { providerOptions: mergedOpts }),
  });

  const sources = extractSourcesFromResult(result);

  // Log cache metrics for observability
  const cacheMeta = (result as { providerMetadata?: { anthropic?: { cacheCreationInputTokens?: number; cacheReadInputTokens?: number } } }).providerMetadata?.anthropic;
  if (cacheMeta?.cacheCreationInputTokens || cacheMeta?.cacheReadInputTokens) {
    console.warn(`[SearchService] Cache: created=${cacheMeta.cacheCreationInputTokens ?? 0}, read=${cacheMeta.cacheReadInputTokens ?? 0}`);
  }

  console.warn(
    `[SearchService] fetchAndAnalyze complete: model=${modelId}, inputTokens=${result.usage?.inputTokens ?? 0}, outputTokens=${result.usage?.outputTokens ?? 0}`
  );

  return {
    answer: result.text,
    sources,
    tokens: {
      input: result.usage?.inputTokens ?? 0,
      output: result.usage?.outputTokens ?? 0,
    },
    reasoningText: (result as { reasoningText?: string }).reasoningText,
    provider: "anthropic",
    model: modelId,
  };
}
