import type { LanguageModel } from "ai";
import { getOpenAIProvider, OPENAI_MODELS } from "./openai";
import { getAnthropicProvider, ANTHROPIC_MODELS } from "./anthropic";
import { getGoogleProvider, GOOGLE_MODELS } from "./google";
import { getXAIProvider, XAI_MODELS } from "./xai";
import {
  getVertexGoogleProvider,
  getVertexAnthropicProvider,
} from "./google-vertex";

export { ANTHROPIC_MODELS } from "./anthropic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export const SUPPORTED_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "vertex-google",
  "vertex-anthropic",
] as const;

export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number];

const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: ANTHROPIC_MODELS.CLAUDE_SONNET_4_5,
  openai: OPENAI_MODELS.GPT4O,
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
      return p(modelId) as LanguageModel;
    }
    case "anthropic": {
      const p = getAnthropicProvider();
      return p(modelId) as LanguageModel;
    }
    case "google": {
      const p = getGoogleProvider();
      return p(modelId) as LanguageModel;
    }
    case "xai": {
      const p = getXAIProvider();
      return p(modelId) as LanguageModel;
    }
    case "vertex-google": {
      const p = getVertexGoogleProvider();
      return p(modelId) as LanguageModel;
    }
    case "vertex-anthropic": {
      const p = getVertexAnthropicProvider();
      return p(modelId) as LanguageModel;
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
 * Async factory: resolves model from DB with 4-tier resolution:
 * 1. Explicit modelId (from agent or stageConfig)
 * 2. User preference (user_model_preferences table)
 * 3. Admin default (ai_models.isDefault=true for the type)
 * 4. Hardcoded fallback (PROVIDER_DEFAULTS)
 */
export async function resolveModelFromDb(
  db: DrizzleDb,
  options?: {
    providerId?: string;
    modelId?: string;
    type?: string;
    userId?: string;
  }
): Promise<ResolvedModel> {
  // Dynamic imports to avoid circular dependency at module load
  const { aiModels } = await import("@contenthq/db/schema");
  const { aiProviders } = await import("@contenthq/db/schema");
  const { eq, and } = await import("drizzle-orm");

  try {
    // Tier 1: Explicit modelId (from agent or stageConfig)
    if (options?.modelId) {
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
        .where(and(eq(aiModels.id, options.modelId), eq(aiProviders.isEnabled, true)))
        .limit(1);

      if (results.length > 0) {
        const row = results[0];
        console.warn(`[ModelFactory] Resolved from explicit modelId: provider=${row.providerSlug}, model=${row.modelId}, name="${row.modelName}"`);
        return {
          provider: row.providerSlug,
          modelId: row.modelId,
          model: getModelInstance(row.providerSlug, row.modelId),
          costs: row.costs as Record<string, unknown> | undefined,
        };
      }
    }

    // Tier 2: User preference
    if (options?.userId && options?.type) {
      try {
        const { userModelPreferences } = await import("@contenthq/db/schema");
        const userPrefResults = await db
          .select({
            modelId: aiModels.modelId,
            modelName: aiModels.name,
            costs: aiModels.costs,
            providerSlug: aiProviders.slug,
          })
          .from(userModelPreferences)
          .innerJoin(aiModels, eq(userModelPreferences.aiModelId, aiModels.id))
          .innerJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
          .where(
            and(
              eq(userModelPreferences.userId, options.userId),
              eq(userModelPreferences.purposeType, options.type),
              eq(aiProviders.isEnabled, true)
            )
          )
          .limit(1);

        if (userPrefResults.length > 0) {
          const row = userPrefResults[0];
          console.warn(`[ModelFactory] Resolved from user preference: provider=${row.providerSlug}, model=${row.modelId}, name="${row.modelName}", userId=${options.userId}, type=${options.type}`);
          return {
            provider: row.providerSlug,
            modelId: row.modelId,
            model: getModelInstance(row.providerSlug, row.modelId),
            costs: row.costs as Record<string, unknown> | undefined,
          };
        }
      } catch {
        // user_model_preferences table may not exist yet — skip
        console.warn("[ModelFactory] User preference lookup failed, continuing to admin default");
      }
    }

    // Tier 3: Admin default (isDefault=true for the type)
    if (options?.type) {
      const adminResults = await db
        .select({
          modelId: aiModels.modelId,
          modelName: aiModels.name,
          isDefault: aiModels.isDefault,
          costs: aiModels.costs,
          providerSlug: aiProviders.slug,
        })
        .from(aiModels)
        .innerJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
        .where(
          and(
            eq(aiModels.isDefault, true),
            eq(aiModels.type, options.type),
            eq(aiProviders.isEnabled, true)
          )
        )
        .limit(1);

      if (adminResults.length > 0) {
        const row = adminResults[0];
        console.warn(`[ModelFactory] Resolved from admin default: provider=${row.providerSlug}, model=${row.modelId}, name="${row.modelName}", type=${options.type}`);
        return {
          provider: row.providerSlug,
          modelId: row.modelId,
          model: getModelInstance(row.providerSlug, row.modelId),
          costs: row.costs as Record<string, unknown> | undefined,
        };
      }
    }

    // Legacy: providerId-based lookup (for backward compatibility)
    if (options?.providerId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [
        eq(aiProviders.isEnabled, true),
        eq(aiModels.providerId, options.providerId),
      ];
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
        console.warn(`[ModelFactory] Resolved from DB (providerId): provider=${row.providerSlug}, model=${row.modelId}, name="${row.modelName}"`);
        return {
          provider: row.providerSlug,
          modelId: row.modelId,
          model: getModelInstance(row.providerSlug, row.modelId),
          costs: row.costs as Record<string, unknown> | undefined,
        };
      }
    }
  } catch {
    // DB query failed — fall back to defaults
    console.warn("[ModelFactory] DB resolution failed, falling back to hardcoded defaults");
  }

  // Tier 4: Hardcoded fallback
  const fallbackProvider = options?.type === "image" ? "fal" : options?.type === "vision" ? "anthropic" : "anthropic";
  const fallbackModelId = options?.type === "image"
    ? "fal-ai/flux/schnell"
    : PROVIDER_DEFAULTS[fallbackProvider] ?? ANTHROPIC_MODELS.CLAUDE_SONNET_4_5;
  console.warn(`[ModelFactory] Using hardcoded fallback: provider=${fallbackProvider}, model=${fallbackModelId}, type=${options?.type ?? "default"}`);

  // For non-LLM types (image, video, audio), the LanguageModel instance is not used by callers
  let model: LanguageModel;
  try {
    model = getModelInstance(fallbackProvider, fallbackModelId);
  } catch {
    model = null as unknown as LanguageModel;
  }

  return {
    provider: fallbackProvider,
    modelId: fallbackModelId,
    model,
  };
}
