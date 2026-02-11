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
