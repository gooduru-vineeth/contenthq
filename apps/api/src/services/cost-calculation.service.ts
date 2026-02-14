import {
  CREDIT_COSTS,
  PROVIDER_CREDIT_COSTS,
} from "@contenthq/shared";

/**
 * Operation types that can incur credit costs.
 * Pipeline stages use their canonical names; standalone media/speech
 * generation use separate keys so the caller can distinguish them.
 */
export type OperationType =
  | "INGESTION"
  | "STORY_WRITING"
  | "SCENE_GENERATION"
  | "IMAGE_GENERATION"
  | "VISUAL_VERIFICATION"
  | "VIDEO_GENERATION"
  | "TTS_GENERATION"
  | "AUDIO_MIXING"
  | "CAPTION_GENERATION"
  | "VIDEO_ASSEMBLY"
  | "MEDIA_GEN_IMAGE"
  | "MEDIA_GEN_VIDEO"
  | "SPEECH_GENERATION";

/**
 * Returns the credit cost for a single operation.
 *
 * For provider-aware stages (IMAGE_GENERATION, TTS_GENERATION,
 * VIDEO_GENERATION) the caller can supply a provider and/or model so
 * that the more granular PROVIDER_CREDIT_COSTS table is consulted first.
 * When no match is found we fall back to the flat CREDIT_COSTS table.
 */
function getOperationCredits(
  operationType: OperationType,
  opts?: { provider?: string; model?: string }
): number {
  // --- Image generation (pipeline or standalone) ---
  if (
    operationType === "IMAGE_GENERATION" ||
    operationType === "MEDIA_GEN_IMAGE"
  ) {
    if (operationType === "MEDIA_GEN_IMAGE") {
      // Standalone image generation has its own flat cost
      if (opts?.model) {
        const modelCost =
          PROVIDER_CREDIT_COSTS.IMAGE_GENERATION[
            opts.model as keyof typeof PROVIDER_CREDIT_COSTS.IMAGE_GENERATION
          ];
        if (modelCost !== undefined) return modelCost;
      }
      return PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_IMAGE;
    }

    // Pipeline image generation – prefer model-specific cost
    if (opts?.model) {
      const modelCost =
        PROVIDER_CREDIT_COSTS.IMAGE_GENERATION[
          opts.model as keyof typeof PROVIDER_CREDIT_COSTS.IMAGE_GENERATION
        ];
      if (modelCost !== undefined) return modelCost;
    }
    return PROVIDER_CREDIT_COSTS.IMAGE_GENERATION.default;
  }

  // --- TTS generation (pipeline or standalone) ---
  if (
    operationType === "TTS_GENERATION" ||
    operationType === "SPEECH_GENERATION"
  ) {
    if (operationType === "SPEECH_GENERATION") {
      // Standalone speech generation
      if (opts?.provider) {
        const providerCost =
          PROVIDER_CREDIT_COSTS.TTS[
            opts.provider as keyof typeof PROVIDER_CREDIT_COSTS.TTS
          ];
        if (providerCost !== undefined) return providerCost;
      }
      return PROVIDER_CREDIT_COSTS.SPEECH_GEN_STANDALONE;
    }

    // Pipeline TTS
    if (opts?.provider) {
      const providerCost =
        PROVIDER_CREDIT_COSTS.TTS[
          opts.provider as keyof typeof PROVIDER_CREDIT_COSTS.TTS
        ];
      if (providerCost !== undefined) return providerCost;
    }
    return PROVIDER_CREDIT_COSTS.TTS.default;
  }

  // --- Video generation (pipeline or standalone) ---
  if (
    operationType === "VIDEO_GENERATION" ||
    operationType === "MEDIA_GEN_VIDEO"
  ) {
    if (operationType === "MEDIA_GEN_VIDEO") {
      // Standalone video generation
      if (opts?.model) {
        const modelCost =
          PROVIDER_CREDIT_COSTS.VIDEO_GENERATION_AI[
            opts.model as keyof typeof PROVIDER_CREDIT_COSTS.VIDEO_GENERATION_AI
          ];
        if (modelCost !== undefined) return modelCost;
      }
      return PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_VIDEO;
    }

    // Pipeline video generation.
    // If the caller indicates an AI-based provider (anything other than
    // "ffmpeg" / programmatic), use the AI video cost table.
    const isAI =
      opts?.provider !== undefined && opts.provider !== "ffmpeg";

    if (isAI) {
      if (opts?.model) {
        const modelCost =
          PROVIDER_CREDIT_COSTS.VIDEO_GENERATION_AI[
            opts.model as keyof typeof PROVIDER_CREDIT_COSTS.VIDEO_GENERATION_AI
          ];
        if (modelCost !== undefined) return modelCost;
      }
      return CREDIT_COSTS.VIDEO_GENERATION_AI;
    }

    return CREDIT_COSTS.VIDEO_GENERATION_PROGRAMMATIC;
  }

  // --- Caption generation ---
  if (operationType === "CAPTION_GENERATION") {
    return PROVIDER_CREDIT_COSTS.CAPTION_GENERATION;
  }

  // --- Remaining flat-cost stages ---
  const flatCostMap: Record<string, number> = {
    INGESTION: CREDIT_COSTS.INGESTION,
    STORY_WRITING: CREDIT_COSTS.STORY_WRITING,
    SCENE_GENERATION: CREDIT_COSTS.SCENE_GENERATION,
    VISUAL_VERIFICATION: CREDIT_COSTS.VISUAL_VERIFICATION,
    AUDIO_MIXING: CREDIT_COSTS.AUDIO_MIXING,
    VIDEO_ASSEMBLY: CREDIT_COSTS.FINAL_ASSEMBLY,
  };

  const cost = flatCostMap[operationType];
  if (cost !== undefined) return cost;

  // Unknown operation – default to 1 credit so callers never get a free
  // pass by passing an unrecognised string.
  console.warn(
    `[CostCalculation] Unknown operation type "${operationType}", defaulting to 1 credit`
  );
  return 1;
}

// ─── Pipeline cost estimation ────────────────────────────────────────────

export interface PipelineCostBreakdownItem {
  stage: string;
  credits: number;
  count: number;
}

export interface PipelineCostEstimate {
  totalCredits: number;
  breakdown: PipelineCostBreakdownItem[];
}

export interface PipelineCostConfig {
  sceneCount: number;
  imageProvider?: string;
  imageModel?: string;
  ttsProvider?: string;
  videoProvider?: string;
  videoModel?: string;
  includeVerification?: boolean;
  includeAudioMixing?: boolean;
  includeCaptions?: boolean;
}

/**
 * Estimates the total credit cost for a full pipeline run.
 *
 * The breakdown follows the canonical 10-stage pipeline:
 *
 *   1. INGESTION              — once
 *   2. STORY_WRITING          — once
 *   3. SCENE_GENERATION       — once
 *   4. IMAGE_GENERATION       — per scene
 *   5. VISUAL_VERIFICATION    — per scene (optional, default true)
 *   6. VIDEO_GENERATION       — per scene
 *   7. TTS_GENERATION         — per scene
 *   8. CAPTION_GENERATION     — per scene (optional, default true)
 *   9. AUDIO_MIXING           — per scene (optional, default true)
 *  10. VIDEO_ASSEMBLY         — once
 */
function estimatePipelineCost(config: PipelineCostConfig): PipelineCostEstimate {
  const {
    sceneCount,
    imageModel,
    ttsProvider,
    videoProvider,
    videoModel,
    includeVerification = true,
    includeAudioMixing = true,
    includeCaptions = true,
  } = config;

  const breakdown: PipelineCostBreakdownItem[] = [];

  // --- Once-per-pipeline stages ---
  const ingestionCredits = getOperationCredits("INGESTION");
  breakdown.push({ stage: "INGESTION", credits: ingestionCredits, count: 1 });

  const storyCredits = getOperationCredits("STORY_WRITING");
  breakdown.push({ stage: "STORY_WRITING", credits: storyCredits, count: 1 });

  const sceneGenCredits = getOperationCredits("SCENE_GENERATION");
  breakdown.push({ stage: "SCENE_GENERATION", credits: sceneGenCredits, count: 1 });

  // --- Per-scene stages ---
  const imageCredits = getOperationCredits("IMAGE_GENERATION", {
    model: imageModel,
  });
  breakdown.push({
    stage: "IMAGE_GENERATION",
    credits: imageCredits * sceneCount,
    count: sceneCount,
  });

  if (includeVerification) {
    const verifyCredits = getOperationCredits("VISUAL_VERIFICATION");
    breakdown.push({
      stage: "VISUAL_VERIFICATION",
      credits: verifyCredits * sceneCount,
      count: sceneCount,
    });
  }

  const videoCredits = getOperationCredits("VIDEO_GENERATION", {
    provider: videoProvider,
    model: videoModel,
  });
  breakdown.push({
    stage: "VIDEO_GENERATION",
    credits: videoCredits * sceneCount,
    count: sceneCount,
  });

  const ttsCredits = getOperationCredits("TTS_GENERATION", {
    provider: ttsProvider,
  });
  breakdown.push({
    stage: "TTS_GENERATION",
    credits: ttsCredits * sceneCount,
    count: sceneCount,
  });

  if (includeCaptions) {
    const captionCredits = getOperationCredits("CAPTION_GENERATION");
    breakdown.push({
      stage: "CAPTION_GENERATION",
      credits: captionCredits * sceneCount,
      count: sceneCount,
    });
  }

  if (includeAudioMixing) {
    const mixCredits = getOperationCredits("AUDIO_MIXING");
    breakdown.push({
      stage: "AUDIO_MIXING",
      credits: mixCredits * sceneCount,
      count: sceneCount,
    });
  }

  // --- Final assembly (once) ---
  const assemblyCredits = getOperationCredits("VIDEO_ASSEMBLY");
  breakdown.push({ stage: "VIDEO_ASSEMBLY", credits: assemblyCredits, count: 1 });

  // --- Total ---
  const totalCredits = breakdown.reduce((sum, item) => sum + item.credits, 0);

  return { totalCredits, breakdown };
}

export const costCalculationService = {
  getOperationCredits,
  estimatePipelineCost,
};
