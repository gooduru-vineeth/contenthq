import { generateText, generateObject, streamText, streamObject } from "../tracing";
import type { z } from "zod";
import { getModelInstance, resolveModelFromDb, ANTHROPIC_MODELS } from "../providers/model-factory";
import type {
  GenerationOptions,
  ExtendedGenerationResult,
  StructuredGenerationResult,
  StreamingGenerationResult,
} from "../types";
import { truncateForLog } from "../utils/log-helpers";
import { buildAnthropicToolsAndOptions, extractSourcesFromResult } from "./anthropic-tools";

async function getModel(options?: GenerationOptions) {
  // If a DB instance and model ID are provided, resolve from DB
  if (options?.db && options?.dbModelId) {
    const resolved = await resolveModelFromDb(options.db, {
      modelId: options.dbModelId,
      userId: options.userId,
    });
    return { model: resolved.model, provider: resolved.provider, modelId: resolved.modelId };
  }

  // If a DB instance is provided, resolve from DB with 4-tier resolution
  if (options?.db) {
    const resolved = await resolveModelFromDb(options.db, {
      type: options.provider ?? "llm",
      userId: options.userId,
    });
    return { model: resolved.model, provider: resolved.provider, modelId: resolved.modelId };
  }

  // Synchronous path: use provider slug + model name
  const providerName = options?.provider || "anthropic";
  const modelName = options?.model || ANTHROPIC_MODELS.CLAUDE_SONNET_4_5;
  const model = getModelInstance(providerName, modelName);
  return { model, provider: providerName, modelId: modelName };
}

export async function generateTextContent(
  prompt: string,
  options?: GenerationOptions
): Promise<ExtendedGenerationResult> {
  const { model, provider, modelId } = await getModel(options);

  console.warn(`[LLMService] generateTextContent: provider=${provider}, model=${modelId}, temperature=${options?.temperature ?? "default"}, maxTokens=${options?.maxTokens ?? "default"}, promptLength=${prompt.length}, prompt="${truncateForLog(prompt, 200)}"`);

  // Build Anthropic-specific tools/options if capabilities are requested and provider is anthropic
  const anthropicExtras =
    options?.anthropic && provider === "anthropic"
      ? buildAnthropicToolsAndOptions(options.anthropic)
      : undefined;

  const result = await generateText({
    model,
    prompt,
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
    ...(anthropicExtras?.tools && { tools: anthropicExtras.tools }),
    ...(anthropicExtras?.maxSteps && { maxSteps: anthropicExtras.maxSteps }),
    ...(anthropicExtras?.providerOptions && { providerOptions: anthropicExtras.providerOptions }),
  });

  console.warn(`[LLMService] generateTextContent complete: provider=${provider}, model=${modelId}, inputTokens=${result.usage?.inputTokens ?? 0}, outputTokens=${result.usage?.outputTokens ?? 0}, responseLength=${result.text.length}`);

  const extendedResult: ExtendedGenerationResult = {
    content: result.text,
    tokens: {
      input: result.usage?.inputTokens ?? 0,
      output: result.usage?.outputTokens ?? 0,
    },
    provider,
    model: modelId,
  };

  // Extract reasoning text if thinking was enabled
  if (anthropicExtras?.providerOptions) {
    extendedResult.reasoningText = (result as { reasoningText?: string }).reasoningText;
  }

  // Extract sources if web search/fetch tools were used
  if (anthropicExtras?.tools) {
    const sources = extractSourcesFromResult(result);
    if (sources.length > 0) {
      extendedResult.sources = sources;
    }
  }

  return extendedResult;
}

export async function generateStructuredContent<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: GenerationOptions
): Promise<StructuredGenerationResult<T>> {
  const { model, provider, modelId } = await getModel(options);

  console.warn(`[LLMService] generateStructuredContent: provider=${provider}, model=${modelId}, temperature=${options?.temperature ?? "default"}, maxTokens=${options?.maxTokens ?? "default"}, promptLength=${prompt.length}, prompt="${truncateForLog(prompt, 200)}"`);

  // Build Anthropic-specific options if capabilities are requested and provider is anthropic
  const anthropicExtras =
    options?.anthropic && provider === "anthropic"
      ? buildAnthropicToolsAndOptions(options.anthropic)
      : undefined;

  // When thinking is enabled, omit mode: 'json' to let AI SDK auto-select
  const hasThinking = !!anthropicExtras?.providerOptions;

  const result = await generateObject({
    model,
    prompt,
    schema,
    ...(!hasThinking && { mode: 'json' as const }),
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
    ...(anthropicExtras?.providerOptions && { providerOptions: anthropicExtras.providerOptions }),
  });

  console.warn(`[LLMService] generateStructuredContent complete: provider=${provider}, model=${modelId}, inputTokens=${result.usage?.inputTokens ?? 0}, outputTokens=${result.usage?.outputTokens ?? 0}`);

  return {
    data: result.object,
    tokens: {
      input: result.usage?.inputTokens ?? 0,
      output: result.usage?.outputTokens ?? 0,
    },
    provider,
    model: modelId,
  };
}

export async function streamTextContent(
  prompt: string,
  options?: GenerationOptions
): Promise<StreamingGenerationResult> {
  const { model, provider, modelId } = await getModel(options);

  // Build Anthropic-specific tools/options if capabilities are requested and provider is anthropic
  const anthropicExtras =
    options?.anthropic && provider === "anthropic"
      ? buildAnthropicToolsAndOptions(options.anthropic)
      : undefined;

  const result = streamText({
    model,
    prompt,
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
    ...(anthropicExtras?.tools && { tools: anthropicExtras.tools }),
    ...(anthropicExtras?.maxSteps && { maxSteps: anthropicExtras.maxSteps }),
    ...(anthropicExtras?.providerOptions && { providerOptions: anthropicExtras.providerOptions }),
  });

  return {
    textStream: result.textStream,
    fullText: Promise.resolve(result.text),
    tokens: Promise.resolve(result.usage).then((u) => ({
      input: u.inputTokens ?? 0,
      output: u.outputTokens ?? 0,
    })),
    provider,
    model: modelId,
  };
}

export async function streamStructuredContent<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: GenerationOptions
): Promise<{ partialObjectStream: AsyncIterable<T>; object: Promise<T>; provider: string; model: string }> {
  const { model, provider, modelId } = await getModel(options);

  // Build Anthropic-specific options if capabilities are requested and provider is anthropic
  const anthropicExtras =
    options?.anthropic && provider === "anthropic"
      ? buildAnthropicToolsAndOptions(options.anthropic)
      : undefined;

  const hasThinking = !!anthropicExtras?.providerOptions;

  const result = streamObject({
    model,
    prompt,
    schema,
    ...(!hasThinking && { mode: 'json' as const }),
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxOutputTokens: options?.maxTokens,
    ...(anthropicExtras?.providerOptions && { providerOptions: anthropicExtras.providerOptions }),
  });

  return {
    partialObjectStream: result.partialObjectStream as AsyncIterable<T>,
    object: result.object as Promise<T>,
    provider,
    model: modelId,
  };
}
