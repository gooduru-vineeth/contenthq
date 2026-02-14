import type { PlanRateLimits } from "../types/billing";

export const CREDIT_COSTS = {
  INGESTION: 1,
  STORY_WRITING: 5,
  SCENE_GENERATION: 2,
  IMAGE_GENERATION: 3,
  VISUAL_VERIFICATION: 1,
  VIDEO_GENERATION_PROGRAMMATIC: 3,
  VIDEO_GENERATION_AI: 10,
  TTS_VOICEOVER: 2,
  AUDIO_MIXING: 1,
  FINAL_ASSEMBLY: 5,
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: { name: "Free", monthlyCredits: 50, price: 0 },
  STARTER: { name: "Starter", monthlyCredits: 500, price: 29 },
  PRO: { name: "Pro", monthlyCredits: 2000, price: 79 },
  ENTERPRISE: { name: "Enterprise", monthlyCredits: 10000, price: 249 },
} as const;

// Provider-aware credit costs for more granular billing
export const PROVIDER_CREDIT_COSTS = {
  IMAGE_GENERATION: {
    "dall-e-3": 3,
    "dall-e-2": 2,
    "flux-schnell": 1,
    "flux-pro": 2,
    "stable-diffusion-xl": 1,
    default: 3,
  },
  TTS: {
    openai: 2,
    elevenlabs: 5,
    google: 2,
    "google-gemini": 1,
    sarvam: 2,
    inworld: 3,
    default: 2,
  },
  VIDEO_GENERATION_AI: {
    veo: 10,
    "animate-diff": 8,
    zeroscope: 8,
    default: 10,
  },
  MEDIA_GEN_STANDALONE_IMAGE: 3,
  MEDIA_GEN_STANDALONE_VIDEO: 10,
  SPEECH_GEN_STANDALONE: 2,
  CAPTION_GENERATION: 1,
} as const;

export const DEFAULT_RATE_LIMITS: Record<string, PlanRateLimits> = {
  FREE: {
    media_generation: { hourly: 20 },
    speech_generation: { hourly: 10 },
    pipeline_start: { daily: 5 },
    ai_generation: { hourly: 30 },
  },
  STARTER: {
    media_generation: { hourly: 50 },
    speech_generation: { hourly: 30 },
    pipeline_start: { daily: 20 },
    ai_generation: { hourly: 100 },
  },
  PRO: {
    media_generation: { hourly: 100 },
    speech_generation: { hourly: 60 },
    pipeline_start: { daily: 50 },
    ai_generation: { hourly: 200 },
  },
  ENTERPRISE: {
    media_generation: { hourly: 500 },
    speech_generation: { hourly: 200 },
    pipeline_start: { daily: 200 },
    ai_generation: { hourly: 1000 },
  },
};

export const DEFAULT_FREE_CREDITS = 50;

export const DEFAULT_CREDIT_PACKS = [
  {
    name: "Starter Pack",
    credits: 100,
    priceInr: 49900,
    priceUsd: 599,
    description: "Great for trying out the platform",
    popular: false,
    sortOrder: 1,
  },
  {
    name: "Creator Pack",
    credits: 500,
    priceInr: 199900,
    priceUsd: 2499,
    description: "Most popular for content creators",
    popular: true,
    sortOrder: 2,
  },
  {
    name: "Agency Pack",
    credits: 2000,
    priceInr: 699900,
    priceUsd: 8999,
    description: "Best value for agencies",
    popular: false,
    sortOrder: 3,
  },
  {
    name: "Enterprise Pack",
    credits: 10000,
    priceInr: 2999900,
    priceUsd: 39999,
    description: "For large-scale production",
    popular: false,
    sortOrder: 4,
  },
] as const;
