import { db } from "./client";
import { aiProviders, aiModels } from "./schema";

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
      supportedTypes: ["image"],
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
    isDefault: true,
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
];

// ── Image Models ───────────────────────────────────────────────────────

const imageModels = [
  {
    id: "model_dall-e-3",
    providerId: "provider_openai",
    name: "DALL-E 3",
    modelId: "dall-e-3",
    type: "image",
    isDefault: true,
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
];

// ── Vision Models ──────────────────────────────────────────────────────

const visionModels = [
  {
    id: "model_gpt-4o-vision",
    providerId: "provider_openai",
    name: "GPT-4o Vision",
    modelId: "gpt-4o",
    type: "vision",
    isDefault: true,
    costs: { inputPerMillion: 2.5, outputPerMillion: 10.0, currency: "USD" },
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
  ];

  await db
    .insert(aiModels)
    .values(allModels)
    .onConflictDoNothing({ target: aiModels.id });

  console.warn(`  Inserted up to ${allModels.length} models`);
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.warn("Starting ContentHQ seed...");

  try {
    await seedProviders();
    await seedModels();
    console.warn("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();
