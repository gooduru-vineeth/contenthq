import { generateText, generateObject, streamText, streamObject } from "ai";
import type { z } from "zod";
import { getModelInstance, resolveModelFromDb } from "../providers/model-factory";
import { OPENAI_MODELS } from "../providers/openai";
import type {
  GenerationOptions,
  GenerationResult,
  StructuredGenerationResult,
  StreamingGenerationResult,
} from "../types";

async function getModel(options?: GenerationOptions) {
  // If a DB instance and model ID are provided, resolve from DB
  if (options?.db && options?.dbModelId) {
    const resolved = await resolveModelFromDb(options.db, {
      modelId: options.dbModelId,
    });
    return { model: resolved.model, provider: resolved.provider, modelId: resolved.modelId };
  }

  // If a DB instance is provided with provider/type, resolve from DB
  if (options?.db) {
    const resolved = await resolveModelFromDb(options.db, {
      type: options.provider,
    });
    return { model: resolved.model, provider: resolved.provider, modelId: resolved.modelId };
  }

  // Synchronous path: use provider slug + model name
  const providerName = options?.provider || "openai";
  const modelName = options?.model || OPENAI_MODELS.GPT4O;
  const model = getModelInstance(providerName, modelName);
  return { model, provider: providerName, modelId: modelName };
}

export async function generateTextContent(
  prompt: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const { model, provider, modelId } = await getModel(options);

  const result = await generateText({
    model,
    prompt,
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  return {
    content: result.text,
    tokens: {
      input: result.usage?.promptTokens ?? 0,
      output: result.usage?.completionTokens ?? 0,
    },
    provider,
    model: modelId,
  };
}

export async function generateStructuredContent<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: GenerationOptions
): Promise<StructuredGenerationResult<T>> {
  const { model, provider, modelId } = await getModel(options);

  const result = await generateObject({
    model,
    prompt,
    schema,
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  return {
    data: result.object,
    tokens: {
      input: result.usage?.promptTokens ?? 0,
      output: result.usage?.completionTokens ?? 0,
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

  const result = streamText({
    model,
    prompt,
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  return {
    textStream: result.textStream,
    fullText: result.text,
    tokens: result.usage.then((u) => ({
      input: u.promptTokens,
      output: u.completionTokens,
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

  const result = streamObject({
    model,
    prompt,
    schema,
    system: options?.systemPrompt,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  return {
    partialObjectStream: result.partialObjectStream as AsyncIterable<T>,
    object: result.object as Promise<T>,
    provider,
    model: modelId,
  };
}
