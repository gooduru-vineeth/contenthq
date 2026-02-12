import type { LanguageModel } from "ai";
import { getOpenAIProvider, OPENAI_MODELS } from "./openai";
import { getAnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
import { getGoogleProvider, GOOGLE_MODELS } from "./google";
import { getXAIProvider, XAI_MODELS } from "./xai";
import {
  getVertexGoogleProvider,
  getVertexAnthropicProvider,
} from "./google-vertex";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export const SUPPORTED_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "xai",
  "vertex-google",
  "vertex-anthropic",
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

const PROVIDER_DEFAULTS: Record<string, string> = {
  openai: OPENAI_MODELS.GPT4O,
  anthropic: ANTHROPIC_MODELS.CLAUDE_SONNET,
  google: GOOGLE_MODELS.GEMINI_PRO,
  xai: XAI_MODELS.GROK_3,
  "vertex-google": GOOGLE_MODELS.GEMINI_2_FLASH,
  "vertex-anthropic": ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
};

/**
 * Check if a provider slug is supported.
 */
export function isProviderSupported(provider: string): provider is SupportedProvider {
  return (SUPPORTED_PROVIDERS as readonly string[]).includes(provider);
}

/**
 * Get the list of all supported provider slugs.
 */
export function getSupportedProviders(): readonly string[] {
  return SUPPORTED_PROVIDERS;
}

/**
 * Synchronous factory: provider slug -> AI SDK model instance.
 * Falls back to env-var-based provider creation.
 */
export function getModelInstance(provider: string, modelId: string): LanguageModel {
  switch (provider) {
    case "openai": {
      const p = getOpenAIProvider();
      return p(modelId);
    }
    case "anthropic": {
      const p = getAnthropicProvider();
      return p(modelId);
    }
    case "google": {
      const p = getGoogleProvider();
      return p(modelId);
    }
    case "xai": {
      const p = getXAIProvider();
      // SDK v3+ returns LanguageModelV3; cast through unknown for V1 compat
      return p(modelId) as unknown as LanguageModel;
    }
    case "vertex-google": {
      const p = getVertexGoogleProvider();
      return p(modelId) as unknown as LanguageModel;
    }
    case "vertex-anthropic": {
      const p = getVertexAnthropicProvider();
      return p(modelId) as unknown as LanguageModel;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export interface ResolvedModel {
  provider: string;
  modelId: string;
  model: LanguageModel;
  costs?: Record<string, unknown>;
}

/**
 * Async factory: resolves model from DB ai_providers + ai_models tables.
 * Falls back to env-var-based defaults when no DB records found.
 */
export async function resolveModelFromDb(
  db: DrizzleDb,
  options?: {
    providerId?: string;
    modelId?: string;
    type?: string;
  }
): Promise<ResolvedModel> {
  // Dynamic imports to avoid circular dependency at module load
  const { aiModels } = await import("@contenthq/db/schema");
  const { aiProviders } = await import("@contenthq/db/schema");
  const { eq, and } = await import("drizzle-orm");

  try {
    // Build query conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: any[] = [eq(aiProviders.isEnabled, true)];

    if (options?.providerId) {
      conditions.push(eq(aiModels.providerId, options.providerId));
    }
    if (options?.modelId) {
      conditions.push(eq(aiModels.id, options.modelId));
    }
    if (options?.type) {
      // Cast to the enum type expected by the column
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(eq(aiProviders.type, options.type as any));
    }

    const results = await db
      .select({
        modelDbId: aiModels.id,
        modelId: aiModels.modelId,
        modelName: aiModels.name,
        isDefault: aiModels.isDefault,
        costs: aiModels.costs,
        providerSlug: aiProviders.slug,
        providerName: aiProviders.name,
      })
      .from(aiModels)
      .innerJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .where(and(...conditions))
      .limit(1);

    if (results.length > 0) {
      const row = results[0];
      const model = getModelInstance(row.providerSlug, row.modelId);
      return {
        provider: row.providerSlug,
        modelId: row.modelId,
        model,
        costs: row.costs as Record<string, unknown> | undefined,
      };
    }
  } catch {
    // DB query failed — fall back to defaults
    console.warn("[ModelFactory] DB resolution failed, falling back to defaults");
  }

  // Fallback: use openai/gpt-4o by default, or match provider type
  const fallbackProvider = options?.type === "vision" ? "openai" : "openai";
  const fallbackModelId = PROVIDER_DEFAULTS[fallbackProvider] ?? OPENAI_MODELS.GPT4O;
  const model = getModelInstance(fallbackProvider, fallbackModelId);

  return {
    provider: fallbackProvider,
    modelId: fallbackModelId,
    model,
  };
}
