import { db } from "./client";
import { aiProviders, aiModels, subscriptionPlans, promptTemplates, personas } from "./schema";
import { sql, eq, and, isNull } from "drizzle-orm";

// ── Providers ──────────────────────────────────────────────────────────

const providers = [
  {
    id: "provider_openai",
    name: "OpenAI",
    slug: "openai",
    type: "llm" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://api.openai.com/v1",
      supportedTypes: ["llm", "image", "tts", "vision"],
    },
  },
  {
    id: "provider_anthropic",
    name: "Anthropic",
    slug: "anthropic",
    type: "llm" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://api.anthropic.com/v1",
      supportedTypes: ["llm"],
    },
  },
  {
    id: "provider_google",
    name: "Google AI",
    slug: "google",
    type: "llm" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1",
      supportedTypes: ["llm", "image", "video", "vision"],
    },
  },
  {
    id: "provider_elevenlabs",
    name: "ElevenLabs",
    slug: "elevenlabs",
    type: "tts" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://api.elevenlabs.io/v1",
      supportedTypes: ["tts"],
    },
  },
  {
    id: "provider_replicate",
    name: "Replicate",
    slug: "replicate",
    type: "image" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://api.replicate.com/v1",
      supportedTypes: ["image", "video"],
    },
  },
  {
    id: "provider_fal",
    name: "FAL.ai",
    slug: "fal",
    type: "image" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://fal.run",
      supportedTypes: ["image", "video", "tts", "music", "audio"],
    },
  },
  {
    id: "provider_stability",
    name: "Stability AI",
    slug: "stability",
    type: "image" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://api.stability.ai/v1",
      supportedTypes: ["image"],
    },
  },
  {
    id: "provider_xai",
    name: "xAI",
    slug: "xai",
    type: "llm" as const,
    isEnabled: true,
    config: {
      apiBaseUrl: "https://api.x.ai/v1",
      supportedTypes: ["llm"],
    },
  },
];

// ── LLM Models ─────────────────────────────────────────────────────────

const llmModels = [
  {
    id: "model_gpt-5",
    providerId: "provider_openai",
    name: "GPT-5",
    modelId: "gpt-5",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.25, outputPerMillion: 10.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gpt-4.1",
    providerId: "provider_openai",
    name: "GPT-4.1",
    modelId: "gpt-4.1",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 2.0, outputPerMillion: 8.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gpt-4.1-mini",
    providerId: "provider_openai",
    name: "GPT-4.1 Mini",
    modelId: "gpt-4.1-mini",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.4, outputPerMillion: 1.6, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gpt-4.1-nano",
    providerId: "provider_openai",
    name: "GPT-4.1 Nano",
    modelId: "gpt-4.1-nano",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.1, outputPerMillion: 0.4, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_o4-mini",
    providerId: "provider_openai",
    name: "o4-mini",
    modelId: "o4-mini",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.1, outputPerMillion: 4.4, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 100_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_o3-mini",
    providerId: "provider_openai",
    name: "o3-mini",
    modelId: "o3-mini",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.1, outputPerMillion: 4.4, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 100_000,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gpt-4o",
    providerId: "provider_openai",
    name: "GPT-4o",
    modelId: "gpt-4o",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 2.5, outputPerMillion: 10.0, currency: "USD" },
    capabilities: {
      contextWindow: 128_000,
      maxOutput: 16_384,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gpt-4o-mini",
    providerId: "provider_openai",
    name: "GPT-4o Mini",
    modelId: "gpt-4o-mini",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.15, outputPerMillion: 0.6, currency: "USD" },
    capabilities: {
      contextWindow: 128_000,
      maxOutput: 16_384,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_claude-opus-4-6",
    providerId: "provider_anthropic",
    name: "Claude Opus 4.6",
    modelId: "claude-opus-4-6",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 5.0, outputPerMillion: 25.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 32_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_claude-sonnet-4-5",
    providerId: "provider_anthropic",
    name: "Claude Sonnet 4.5",
    modelId: "claude-sonnet-4-5-20250929",
    type: "llm",
    isDefault: true,
    costs: { inputPerMillion: 3.0, outputPerMillion: 15.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 16_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_claude-haiku-4-5",
    providerId: "provider_anthropic",
    name: "Claude Haiku 4.5",
    modelId: "claude-haiku-4-5-20251001",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.0, outputPerMillion: 5.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 8_192,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gemini-3-pro",
    providerId: "provider_google",
    name: "Gemini 3 Pro",
    modelId: "gemini-3-pro-preview",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 2.0, outputPerMillion: 12.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gemini-3-flash",
    providerId: "provider_google",
    name: "Gemini 3 Flash",
    modelId: "gemini-3-flash-preview",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.5, outputPerMillion: 3.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gemini-2.5-pro",
    providerId: "provider_google",
    name: "Gemini 2.5 Pro",
    modelId: "gemini-2.5-pro",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.25, outputPerMillion: 10.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gemini-2.5-flash",
    providerId: "provider_google",
    name: "Gemini 2.5 Flash",
    modelId: "gemini-2.5-flash",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.3, outputPerMillion: 2.5, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gemini-2.5-flash-lite",
    providerId: "provider_google",
    name: "Gemini 2.5 Flash Lite",
    modelId: "gemini-2.5-flash-lite",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.1, outputPerMillion: 0.4, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gemini-2.0-flash",
    providerId: "provider_google",
    name: "Gemini 2.0 Flash",
    modelId: "gemini-2.0-flash",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.1, outputPerMillion: 0.4, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 8_192,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gemini-2.0-flash-lite",
    providerId: "provider_google",
    name: "Gemini 2.0 Flash Lite",
    modelId: "gemini-2.0-flash-lite",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.075, outputPerMillion: 0.3, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 8_192,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: false,
    },
  },
  // ── OpenAI: GPT-5.x family + reasoning models ──
  {
    id: "model_gpt-5.2",
    providerId: "provider_openai",
    name: "GPT-5.2",
    modelId: "gpt-5.2",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.75, outputPerMillion: 14.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gpt-5.1",
    providerId: "provider_openai",
    name: "GPT-5.1",
    modelId: "gpt-5.1",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 1.25, outputPerMillion: 10.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gpt-5-mini",
    providerId: "provider_openai",
    name: "GPT-5 Mini",
    modelId: "gpt-5-mini",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.25, outputPerMillion: 2.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_gpt-5-nano",
    providerId: "provider_openai",
    name: "GPT-5 Nano",
    modelId: "gpt-5-nano",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.05, outputPerMillion: 0.4, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_o1",
    providerId: "provider_openai",
    name: "o1",
    modelId: "o1",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 15.0, outputPerMillion: 60.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 100_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_o1-pro",
    providerId: "provider_openai",
    name: "o1-pro",
    modelId: "o1-pro",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 150.0, outputPerMillion: 600.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 100_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_o3",
    providerId: "provider_openai",
    name: "o3",
    modelId: "o3",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 2.0, outputPerMillion: 8.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 100_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_o3-pro",
    providerId: "provider_openai",
    name: "o3-pro",
    modelId: "o3-pro",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 20.0, outputPerMillion: 80.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 100_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  // ── Anthropic: additional Claude models ──
  {
    id: "model_claude-opus-4-5",
    providerId: "provider_anthropic",
    name: "Claude Opus 4.5",
    modelId: "claude-opus-4-5-20250929",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 15.0, outputPerMillion: 75.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 32_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_claude-opus-4-1",
    providerId: "provider_anthropic",
    name: "Claude Opus 4.1",
    modelId: "claude-opus-4-1-20250414",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 15.0, outputPerMillion: 75.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 32_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_claude-sonnet-4",
    providerId: "provider_anthropic",
    name: "Claude Sonnet 4",
    modelId: "claude-sonnet-4-20250514",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 3.0, outputPerMillion: 15.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 16_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_claude-opus-4",
    providerId: "provider_anthropic",
    name: "Claude Opus 4",
    modelId: "claude-opus-4-20250514",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 15.0, outputPerMillion: 75.0, currency: "USD" },
    capabilities: {
      contextWindow: 200_000,
      maxOutput: 32_000,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  // ── xAI: Grok models ──
  {
    id: "model_grok-4",
    providerId: "provider_xai",
    name: "Grok 4",
    modelId: "grok-4",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 3.0, outputPerMillion: 15.0, currency: "USD" },
    capabilities: {
      contextWindow: 256_000,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_grok-3",
    providerId: "provider_xai",
    name: "Grok 3",
    modelId: "grok-3",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 2.0, outputPerMillion: 10.0, currency: "USD" },
    capabilities: {
      contextWindow: 131_072,
      maxOutput: 32_768,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_grok-3-fast",
    providerId: "provider_xai",
    name: "Grok 3 Fast",
    modelId: "grok-3-fast",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.4, outputPerMillion: 0.8, currency: "USD" },
    capabilities: {
      contextWindow: 131_072,
      maxOutput: 32_768,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: false,
    },
  },
  {
    id: "model_grok-3-mini",
    providerId: "provider_xai",
    name: "Grok 3 Mini",
    modelId: "grok-3-mini",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.1, outputPerMillion: 0.3, currency: "USD" },
    capabilities: {
      contextWindow: 131_072,
      maxOutput: 32_768,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_grok-3-mini-fast",
    providerId: "provider_xai",
    name: "Grok 3 Mini Fast",
    modelId: "grok-3-mini-fast",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.05, outputPerMillion: 0.15, currency: "USD" },
    capabilities: {
      contextWindow: 131_072,
      maxOutput: 32_768,
      functionCalling: true,
      vision: false,
      streaming: true,
      reasoning: false,
    },
  },
  // ── Google: stable Gemini 3 models ──
  {
    id: "model_gemini-3-pro-stable",
    providerId: "provider_google",
    name: "Gemini 3 Pro",
    modelId: "gemini-3-pro",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 2.0, outputPerMillion: 12.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: true,
    },
  },
  {
    id: "model_gemini-3-flash-stable",
    providerId: "provider_google",
    name: "Gemini 3 Flash",
    modelId: "gemini-3-flash",
    type: "llm",
    isDefault: false,
    costs: { inputPerMillion: 0.5, outputPerMillion: 3.0, currency: "USD" },
    capabilities: {
      contextWindow: 1_000_000,
      maxOutput: 65_536,
      functionCalling: true,
      vision: true,
      streaming: true,
      reasoning: false,
    },
  },
];

// ── Image Models ───────────────────────────────────────────────────────

const imageModels = [
  {
    id: "model_dall-e-3",
    providerId: "provider_openai",
    name: "DALL-E 3",
    modelId: "dall-e-3",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "1024x1024",
      supportedFormats: ["png"],
      styleControl: true,
    },
  },
  {
    id: "model_dall-e-3-hd",
    providerId: "provider_openai",
    name: "DALL-E 3 HD",
    modelId: "dall-e-3-hd",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.08, currency: "USD" },
    capabilities: {
      maxResolution: "1024x1792",
      supportedFormats: ["png"],
      styleControl: true,
    },
  },
  {
    id: "model_flux-schnell",
    providerId: "provider_replicate",
    name: "FLUX.1 Schnell",
    modelId: "black-forest-labs/flux-schnell",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.003, currency: "USD" },
    capabilities: {
      maxResolution: "1024x1024",
      supportedFormats: ["png", "webp"],
      styleControl: false,
    },
  },
  {
    id: "model_flux-pro",
    providerId: "provider_replicate",
    name: "FLUX.1 Pro",
    modelId: "black-forest-labs/flux-pro",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.055, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "webp"],
      styleControl: true,
    },
  },
  {
    id: "model_flux-dev",
    providerId: "provider_replicate",
    name: "FLUX.1 Dev",
    modelId: "black-forest-labs/flux-dev",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.025, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "webp"],
      styleControl: true,
    },
  },
  {
    id: "model_imagen-4",
    providerId: "provider_google",
    name: "Imagen 4",
    modelId: "imagen-4",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: true,
      textRendering: true,
    },
  },
  {
    id: "model_imagen-3",
    providerId: "provider_google",
    name: "Imagen 3",
    modelId: "imagen-3.0-generate-002",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.03, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: true,
      textRendering: true,
    },
  },
  {
    id: "model_sdxl",
    providerId: "provider_stability",
    name: "Stable Diffusion XL",
    modelId: "stable-diffusion-xl",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.004, currency: "USD" },
    capabilities: {
      maxResolution: "1024x1024",
      supportedFormats: ["png", "webp"],
      styleControl: true,
    },
  },
  // ── FAL.ai image models ──
  {
    id: "model_fal-flux-2-pro",
    providerId: "provider_fal",
    name: "FLUX.2 Pro",
    modelId: "fal-ai/flux-2-pro",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.03, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-2-max",
    providerId: "provider_fal",
    name: "FLUX.2 Max",
    modelId: "fal-ai/flux-2-max",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.06, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-pro-v1.1-ultra",
    providerId: "provider_fal",
    name: "FLUX Pro 1.1 Ultra",
    modelId: "fal-ai/flux-pro/v1.1-ultra",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.06, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-pro-v1.1",
    providerId: "provider_fal",
    name: "FLUX Pro 1.1",
    modelId: "fal-ai/flux-pro/v1.1",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-kontext-pro",
    providerId: "provider_fal",
    name: "FLUX Kontext Pro",
    modelId: "fal-ai/flux-pro/kontext",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-kontext-max",
    providerId: "provider_fal",
    name: "FLUX Kontext Max",
    modelId: "fal-ai/flux-pro/kontext/max",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.08, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-dev",
    providerId: "provider_fal",
    name: "FLUX Dev",
    modelId: "fal-ai/flux/dev",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.025, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-flux-schnell",
    providerId: "provider_fal",
    name: "FLUX Schnell",
    modelId: "fal-ai/flux/schnell",
    type: "image",
    isDefault: true,
    costs: { perImage: 0.003, currency: "USD" },
    capabilities: {
      maxResolution: "1024x1024",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-ideogram-v3",
    providerId: "provider_fal",
    name: "Ideogram V3",
    modelId: "fal-ai/ideogram/v3",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.08, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: true,
      textRendering: true,
    },
  },
  {
    id: "model_fal-recraft-v3",
    providerId: "provider_fal",
    name: "Recraft V3",
    modelId: "fal-ai/recraft/v3/text-to-image",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: true,
    },
  },
  {
    id: "model_fal-seedream-v4.5",
    providerId: "provider_fal",
    name: "Seedream v4.5",
    modelId: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-seedream-v4",
    providerId: "provider_fal",
    name: "Seedream v4",
    modelId: "fal-ai/bytedance/seedream/v4/text-to-image",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.03, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-dreamina-v3.1",
    providerId: "provider_fal",
    name: "Dreamina v3.1",
    modelId: "fal-ai/bytedance/dreamina/v3.1/text-to-image",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.03, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-luma-photon",
    providerId: "provider_fal",
    name: "Luma Photon",
    modelId: "fal-ai/luma-photon",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.03, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-luma-photon-flash",
    providerId: "provider_fal",
    name: "Luma Photon Flash",
    modelId: "fal-ai/luma-photon/flash",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.01, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-qwen-image",
    providerId: "provider_fal",
    name: "Qwen Image",
    modelId: "fal-ai/qwen-image",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.02, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-omnigen-v2",
    providerId: "provider_fal",
    name: "OmniGen V2",
    modelId: "fal-ai/omnigen-v2",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.03, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
  {
    id: "model_fal-kling-image-v3",
    providerId: "provider_fal",
    name: "Kling Image V3",
    modelId: "fal-ai/kling-image/v3/text-to-image",
    type: "image",
    isDefault: false,
    costs: { perImage: 0.04, currency: "USD" },
    capabilities: {
      maxResolution: "2048x2048",
      supportedFormats: ["png", "jpeg"],
      styleControl: false,
    },
  },
];

// ── TTS Models ─────────────────────────────────────────────────────────

const ttsModels = [
  {
    id: "model_tts-1",
    providerId: "provider_openai",
    name: "TTS-1",
    modelId: "tts-1",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 15.0, currency: "USD" },
    capabilities: {
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      maxChars: 4096,
      streaming: true,
    },
  },
  {
    id: "model_tts-1-hd",
    providerId: "provider_openai",
    name: "TTS-1 HD",
    modelId: "tts-1-hd",
    type: "tts",
    isDefault: true,
    costs: { perMillionChars: 30.0, currency: "USD" },
    capabilities: {
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      maxChars: 4096,
      streaming: true,
    },
  },
  {
    id: "model_gpt-4o-mini-tts",
    providerId: "provider_openai",
    name: "GPT-4o Mini TTS",
    modelId: "gpt-4o-mini-tts",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 60.0, currency: "USD" },
    capabilities: {
      voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      maxChars: 4096,
      streaming: true,
      emotionInstructions: true,
    },
  },
  {
    id: "model_eleven-v3",
    providerId: "provider_elevenlabs",
    name: "Eleven v3",
    modelId: "eleven_v3",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 300.0, currency: "USD" },
    capabilities: {
      customVoices: true,
      voiceCloning: true,
      maxChars: 5000,
      streaming: true,
      emotionControl: true,
    },
  },
  {
    id: "model_eleven-turbo-v2.5",
    providerId: "provider_elevenlabs",
    name: "Eleven Turbo v2.5",
    modelId: "eleven_turbo_v2_5",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 150.0, currency: "USD" },
    capabilities: {
      customVoices: true,
      voiceCloning: true,
      maxChars: 5000,
      streaming: true,
      lowLatency: true,
    },
  },
  // ── FAL.ai TTS models ──
  {
    id: "model_fal-minimax-speech-02-hd",
    providerId: "provider_fal",
    name: "MiniMax Speech-02 HD",
    modelId: "fal-ai/minimax/speech-02-hd",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 100.0, currency: "USD" },
    capabilities: {
      maxChars: 5000,
      streaming: false,
      highQuality: true,
    },
  },
  {
    id: "model_fal-minimax-speech-02-turbo",
    providerId: "provider_fal",
    name: "MiniMax Speech-02 Turbo",
    modelId: "fal-ai/minimax/speech-02-turbo",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 50.0, currency: "USD" },
    capabilities: {
      maxChars: 5000,
      streaming: false,
      lowLatency: true,
    },
  },
  {
    id: "model_fal-dia-tts",
    providerId: "provider_fal",
    name: "Dia TTS",
    modelId: "fal-ai/dia-tts",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 80.0, currency: "USD" },
    capabilities: {
      maxChars: 5000,
      streaming: false,
      voiceCloning: true,
    },
  },
  {
    id: "model_fal-chatterbox-tts",
    providerId: "provider_fal",
    name: "Chatterbox HD TTS",
    modelId: "resemble-ai/chatterboxhd/text-to-speech",
    type: "tts",
    isDefault: false,
    costs: { perMillionChars: 120.0, currency: "USD" },
    capabilities: {
      maxChars: 5000,
      streaming: false,
      highQuality: true,
    },
  },
];

// ── Vision Models ──────────────────────────────────────────────────────

const visionModels = [
  {
    id: "model_gpt-4o-vision",
    providerId: "provider_openai",
    name: "GPT-4o Vision",
    modelId: "gpt-4o",
    type: "vision",
    isDefault: false,
    costs: { inputPerMillion: 2.5, outputPerMillion: 10.0, currency: "USD" },
    capabilities: {
      maxImageSize: "20MB",
      supportedFormats: ["png", "jpeg", "gif", "webp"],
      detailLevels: ["auto", "low", "high"],
    },
  },
  {
    id: "model_claude-sonnet-4-5-vision",
    providerId: "provider_anthropic",
    name: "Claude Sonnet 4.5 Vision",
    modelId: "claude-sonnet-4-5-20250929",
    type: "vision",
    isDefault: true,
    costs: { inputPerMillion: 3.0, outputPerMillion: 15.0, currency: "USD" },
    capabilities: {
      maxImageSize: "20MB",
      supportedFormats: ["png", "jpeg", "gif", "webp"],
      detailLevels: ["auto", "low", "high"],
    },
  },
  {
    id: "model_gemini-2.5-flash-vision",
    providerId: "provider_google",
    name: "Gemini 2.5 Flash Vision",
    modelId: "gemini-2.5-flash",
    type: "vision",
    isDefault: false,
    costs: { inputPerMillion: 0.3, outputPerMillion: 2.5, currency: "USD" },
    capabilities: {
      maxImageSize: "20MB",
      supportedFormats: ["png", "jpeg", "gif", "webp"],
      videoInput: true,
    },
  },
];

// ── Video Models ───────────────────────────────────────────────────────

const videoModels = [
  {
    id: "model_kling-2.5-turbo",
    providerId: "provider_replicate",
    name: "Kling 2.5 Turbo",
    modelId: "kwaai/kling-v2.5-turbo",
    type: "video",
    isDefault: true,
    costs: { perSecond: 0.1, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_luma-ray2",
    providerId: "provider_replicate",
    name: "Luma Ray2",
    modelId: "luma/ray2",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.5, currency: "USD" },
    capabilities: {
      maxDuration: 5,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_veo-2",
    providerId: "provider_google",
    name: "Veo 2",
    modelId: "veo-2.0-generate-001",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.35, currency: "USD" },
    capabilities: {
      maxDuration: 8,
      resolutions: ["720p", "1080p", "4K"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_minimax-hailuo",
    providerId: "provider_replicate",
    name: "Minimax Hailuo",
    modelId: "minimax/hailuo-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.4, currency: "USD" },
    capabilities: {
      maxDuration: 6,
      resolutions: ["720p", "1080p"],
      textToVideo: true,
    },
  },
  // ── FAL.ai video models ──
  {
    id: "model_fal-veo-3.1",
    providerId: "provider_fal",
    name: "Veo 3.1",
    modelId: "fal-ai/veo3.1",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.2, currency: "USD" },
    capabilities: {
      maxDuration: 8,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
      audioGeneration: true,
    },
  },
  {
    id: "model_fal-veo-3.1-fast",
    providerId: "provider_fal",
    name: "Veo 3.1 Fast",
    modelId: "fal-ai/veo3.1/fast",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.25, currency: "USD" },
    capabilities: {
      maxDuration: 8,
      resolutions: ["720p", "1080p"],
      textToVideo: true,
      audioGeneration: true,
    },
  },
  {
    id: "model_fal-kling-o3-standard",
    providerId: "provider_fal",
    name: "Kling O3 Standard",
    modelId: "fal-ai/kling-video/o3/standard/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.168, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_fal-kling-o3-pro",
    providerId: "provider_fal",
    name: "Kling O3 Pro",
    modelId: "fal-ai/kling-video/o3/pro/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.224, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
      audioGeneration: true,
    },
  },
  {
    id: "model_fal-kling-v3-pro",
    providerId: "provider_fal",
    name: "Kling V3 Pro",
    modelId: "fal-ai/kling-video/v3/pro/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.224, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_fal-sora-2",
    providerId: "provider_fal",
    name: "Sora 2",
    modelId: "fal-ai/sora-2/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 1.0, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_fal-luma-ray2",
    providerId: "provider_fal",
    name: "Luma Ray 2",
    modelId: "fal-ai/luma-dream-machine/ray-2",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.5, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_fal-luma-ray2-flash",
    providerId: "provider_fal",
    name: "Luma Ray 2 Flash",
    modelId: "fal-ai/luma-dream-machine/ray-2-flash/image-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.25, currency: "USD" },
    capabilities: {
      maxDuration: 5,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
    },
  },
  {
    id: "model_fal-seedance-1.5-pro",
    providerId: "provider_fal",
    name: "Seedance 1.5 Pro",
    modelId: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.5, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
    },
  },
  {
    id: "model_fal-seedance-1.0-pro",
    providerId: "provider_fal",
    name: "Seedance 1.0 Pro",
    modelId: "fal-ai/bytedance/seedance/v1/pro/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.4, currency: "USD" },
    capabilities: {
      maxDuration: 8,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_fal-wan-2.2",
    providerId: "provider_fal",
    name: "Wan 2.2",
    modelId: "fal-ai/wan/v2.2-a14b/image-to-video",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.05, currency: "USD" },
    capabilities: {
      maxDuration: 5,
      resolutions: ["720p"],
      imageToVideo: true,
    },
  },
  {
    id: "model_fal-minimax-hailuo-02",
    providerId: "provider_fal",
    name: "MiniMax Hailuo-02",
    modelId: "fal-ai/minimax/hailuo-02/standard/image-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.4, currency: "USD" },
    capabilities: {
      maxDuration: 6,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
    },
  },
  {
    id: "model_fal-vidu-q3",
    providerId: "provider_fal",
    name: "Vidu Q3",
    modelId: "fal-ai/vidu/q3/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.5, currency: "USD" },
    capabilities: {
      maxDuration: 8,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
  {
    id: "model_fal-pixverse-v5",
    providerId: "provider_fal",
    name: "PixVerse V5",
    modelId: "fal-ai/pixverse/v5/image-to-video",
    type: "video",
    isDefault: false,
    costs: { perGeneration: 0.4, currency: "USD" },
    capabilities: {
      maxDuration: 5,
      resolutions: ["720p", "1080p"],
      imageToVideo: true,
    },
  },
  {
    id: "model_fal-grok-imagine-video",
    providerId: "provider_fal",
    name: "Grok Imagine Video",
    modelId: "xai/grok-imagine-video/text-to-video",
    type: "video",
    isDefault: false,
    costs: { perSecond: 0.07, currency: "USD" },
    capabilities: {
      maxDuration: 10,
      resolutions: ["480p", "720p"],
      imageToVideo: true,
      textToVideo: true,
    },
  },
];

// ── Music & Audio Models ──────────────────────────────────────────────

const musicAudioModels = [
  // ── FAL.ai music generation ──
  {
    id: "model_fal-beatoven-music",
    providerId: "provider_fal",
    name: "Beatoven Music",
    modelId: "beatoven/music-generation",
    type: "music",
    isDefault: true,
    costs: { perGeneration: 0.1, currency: "USD" },
    capabilities: {
      textToMusic: true,
      maxDuration: 60,
    },
  },
  {
    id: "model_fal-beatoven-sfx",
    providerId: "provider_fal",
    name: "Beatoven Sound Effects",
    modelId: "beatoven/sound-effect-generation",
    type: "music",
    isDefault: false,
    costs: { perGeneration: 0.05, currency: "USD" },
    capabilities: {
      textToSfx: true,
      maxDuration: 30,
    },
  },
  {
    id: "model_fal-stable-audio-2.5",
    providerId: "provider_fal",
    name: "Stable Audio 2.5",
    modelId: "fal-ai/stable-audio-25/audio-to-audio",
    type: "music",
    isDefault: false,
    costs: { perGeneration: 0.2, currency: "USD" },
    capabilities: {
      textToMusic: true,
      audioToAudio: true,
      maxDuration: 47,
    },
  },
  // ── FAL.ai audio/video sound ──
  {
    id: "model_fal-mmaudio-v2",
    providerId: "provider_fal",
    name: "MMAudio V2",
    modelId: "fal-ai/mmaudio-v2",
    type: "audio",
    isDefault: true,
    costs: { perSecond: 0.001, currency: "USD" },
    capabilities: {
      videoToAudio: true,
      textToAudio: true,
      maxDuration: 30,
    },
  },
  {
    id: "model_fal-mirelo-sfx-v1",
    providerId: "provider_fal",
    name: "Mirelo SFX v1",
    modelId: "mirelo-ai/sfx-v1/video-to-audio",
    type: "audio",
    isDefault: false,
    costs: { perGeneration: 0.15, currency: "USD" },
    capabilities: {
      videoToAudio: true,
      maxDuration: 30,
    },
  },
];

// ── Seed Functions ─────────────────────────────────────────────────────

async function seedProviders() {
  console.warn("Seeding AI providers...");

  await db
    .insert(aiProviders)
    .values(providers)
    .onConflictDoNothing({ target: aiProviders.slug });

  console.warn(`  Inserted up to ${providers.length} providers`);
}

async function seedModels() {
  console.warn("Seeding AI models...");

  const allModels = [
    ...llmModels,
    ...imageModels,
    ...ttsModels,
    ...visionModels,
    ...videoModels,
    ...musicAudioModels,
  ];

  await db
    .insert(aiModels)
    .values(allModels)
    .onConflictDoUpdate({
      target: aiModels.id,
      set: {
        isDefault: sql`excluded.is_default`,
        costs: sql`excluded.costs`,
        capabilities: sql`excluded.capabilities`,
        updatedAt: sql`now()`,
      },
    });

  console.warn(`  Upserted ${allModels.length} models`);
}

// ── Subscription Plans ─────────────────────────────────────────────────

const plans = [
  {
    id: "plan_free",
    name: "Free",
    slug: "free",
    description: "Get started with AI content creation",
    monthlyCredits: 500,
    price: "0",
    credits: 500,
    bonusCredits: 0,
    priceInr: 0,
    priceUsd: 0,
    billingInterval: "monthly" as const,
    active: true,
    isDefault: true,
    popular: false,
    sortOrder: 0,
    features: {
      maxProjects: 3,
      maxConcurrentPipelines: 1,
      pipelinesPerDay: 5,
      pipelinesPerMonth: 30,
      priorityProcessing: false,
      dedicatedSupport: false,
      apiAccess: false,
    },
  },
  {
    id: "plan_starter",
    name: "Starter",
    slug: "starter",
    description: "For individual creators getting serious about content",
    monthlyCredits: 5000,
    price: "999",
    credits: 5000,
    bonusCredits: 500,
    priceInr: 99900,
    priceUsd: 1200,
    billingInterval: "monthly" as const,
    active: true,
    isDefault: false,
    popular: false,
    sortOrder: 1,
    features: {
      maxProjects: 15,
      maxConcurrentPipelines: 2,
      pipelinesPerDay: 20,
      pipelinesPerMonth: 200,
      priorityProcessing: false,
      dedicatedSupport: false,
      apiAccess: false,
    },
  },
  {
    id: "plan_pro",
    name: "Pro",
    slug: "pro",
    description: "For professional creators and small teams",
    monthlyCredits: 20000,
    price: "2999",
    credits: 20000,
    bonusCredits: 2000,
    priceInr: 299900,
    priceUsd: 3600,
    billingInterval: "monthly" as const,
    active: true,
    isDefault: false,
    popular: true,
    sortOrder: 2,
    features: {
      maxProjects: 50,
      maxConcurrentPipelines: 5,
      pipelinesPerDay: 50,
      pipelinesPerMonth: 500,
      priorityProcessing: true,
      dedicatedSupport: false,
      apiAccess: true,
    },
  },
  {
    id: "plan_business",
    name: "Business",
    slug: "business",
    description: "For agencies and teams scaling content production",
    monthlyCredits: 100000,
    price: "9999",
    credits: 100000,
    bonusCredits: 10000,
    priceInr: 999900,
    priceUsd: 12000,
    billingInterval: "monthly" as const,
    active: true,
    isDefault: false,
    popular: false,
    sortOrder: 3,
    features: {
      maxProjects: 200,
      maxConcurrentPipelines: 10,
      pipelinesPerDay: 200,
      pipelinesPerMonth: 2000,
      priorityProcessing: true,
      dedicatedSupport: true,
      apiAccess: true,
    },
  },
];

async function seedSubscriptionPlans() {
  console.warn("Seeding subscription plans...");

  await db
    .insert(subscriptionPlans)
    .values(plans)
    .onConflictDoUpdate({
      target: subscriptionPlans.slug,
      set: {
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        credits: sql`excluded.credits`,
        bonusCredits: sql`excluded.bonus_credits`,
        priceInr: sql`excluded.price_inr`,
        priceUsd: sql`excluded.price_usd`,
        features: sql`excluded.features`,
        popular: sql`excluded.popular`,
        sortOrder: sql`excluded.sort_order`,
        isDefault: sql`excluded.is_default`,
        updatedAt: sql`now()`,
      },
    });

  console.warn(`  Upserted ${plans.length} subscription plans`);
}

// ── Prompt Templates & Personas ──────────────────────────────────────

async function seedPromptTemplatesAndPersonas() {
  console.warn("Seeding prompt templates & personas...");

  const { DEFAULT_PROMPT_TEMPLATES, DEFAULT_PERSONAS } = await import(
    "../../ai/src/prompts/seed-data"
  );

  let templatesSeeded = 0;
  for (const tmpl of DEFAULT_PROMPT_TEMPLATES) {
    const [existing] = await db
      .select({ id: promptTemplates.id })
      .from(promptTemplates)
      .where(
        and(
          eq(promptTemplates.type, tmpl.type),
          isNull(promptTemplates.createdBy)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(promptTemplates).values({
        ...tmpl,
        createdBy: null,
        isActive: true,
        version: 1,
      });
      templatesSeeded++;
    }
  }
  console.warn(`  Seeded ${templatesSeeded} new prompt templates (${DEFAULT_PROMPT_TEMPLATES.length - templatesSeeded} already existed)`);

  let personasSeeded = 0;
  for (const p of DEFAULT_PERSONAS) {
    const [existing] = await db
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(
          eq(personas.category, p.category),
          eq(personas.name, p.name),
          isNull(personas.createdBy)
        )
      )
      .limit(1);

    if (!existing) {
      await db.insert(personas).values({
        ...p,
        createdBy: null,
      });
      personasSeeded++;
    }
  }
  console.warn(`  Seeded ${personasSeeded} new personas (${DEFAULT_PERSONAS.length - personasSeeded} already existed)`);
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.warn("Starting ContentHQ seed...");

  try {
    await seedProviders();
    await seedModels();
    await seedSubscriptionPlans();
    await seedPromptTemplatesAndPersonas();
    console.warn("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
