import { generateText, generateObject } from "ai";
import type { z } from "zod";
import { getOpenAIProvider, OPENAI_MODELS } from "../providers/openai";
import { getAnthropicProvider, ANTHROPIC_MODELS } from "../providers/anthropic";
import type { GenerationOptions, GenerationResult, StructuredGenerationResult } from "../types";

function getModel(options?: GenerationOptions) {
  const providerName = options?.provider || "openai";
  const modelName = options?.model;

  switch (providerName) {
    case "openai": {
      const provider = getOpenAIProvider();
      return provider(modelName || OPENAI_MODELS.GPT4O);
    }
    case "anthropic": {
      const provider = getAnthropicProvider();
      return provider(modelName || ANTHROPIC_MODELS.CLAUDE_SONNET);
    }
    default:
      throw new Error(`Unknown provider: ${providerName}`);
  }
}

export async function generateTextContent(
  prompt: string,
  options?: GenerationOptions
): Promise<GenerationResult> {
  const model = getModel(options);

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
    provider: options?.provider || "openai",
    model: options?.model || OPENAI_MODELS.GPT4O,
  };
}

export async function generateStructuredContent<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options?: GenerationOptions
): Promise<StructuredGenerationResult<T>> {
  const model = getModel(options);

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
    provider: options?.provider || "openai",
    model: options?.model || OPENAI_MODELS.GPT4O,
  };
}
