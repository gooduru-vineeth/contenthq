import { describe, it, expect } from "vitest";
import { costCalculationService } from "../../services/cost-calculation.service";

describe("costCalculationService", () => {
  describe("getOperationCredits", () => {
    // --- Flat-cost stages ---

    it("returns correct cost for INGESTION", () => {
      expect(costCalculationService.getOperationCredits("INGESTION")).toBe(1);
    });

    it("returns correct cost for STORY_WRITING", () => {
      expect(costCalculationService.getOperationCredits("STORY_WRITING")).toBe(5);
    });

    it("returns correct cost for SCENE_GENERATION", () => {
      expect(costCalculationService.getOperationCredits("SCENE_GENERATION")).toBe(2);
    });

    it("returns correct cost for VISUAL_VERIFICATION", () => {
      expect(costCalculationService.getOperationCredits("VISUAL_VERIFICATION")).toBe(1);
    });

    it("returns correct cost for AUDIO_MIXING", () => {
      expect(costCalculationService.getOperationCredits("AUDIO_MIXING")).toBe(1);
    });

    it("returns correct cost for VIDEO_ASSEMBLY", () => {
      expect(costCalculationService.getOperationCredits("VIDEO_ASSEMBLY")).toBe(5);
    });

    // --- Image generation (pipeline) ---

    it("returns default cost for IMAGE_GENERATION without model", () => {
      expect(costCalculationService.getOperationCredits("IMAGE_GENERATION")).toBe(3);
    });

    it("returns provider-specific cost for IMAGE_GENERATION with dall-e-3", () => {
      expect(
        costCalculationService.getOperationCredits("IMAGE_GENERATION", { model: "dall-e-3" })
      ).toBe(3);
    });

    it("returns cheaper cost for IMAGE_GENERATION with flux-schnell", () => {
      expect(
        costCalculationService.getOperationCredits("IMAGE_GENERATION", { model: "flux-schnell" })
      ).toBe(1);
    });

    it("returns cost for IMAGE_GENERATION with dall-e-2", () => {
      expect(
        costCalculationService.getOperationCredits("IMAGE_GENERATION", { model: "dall-e-2" })
      ).toBe(2);
    });

    it("returns default cost for IMAGE_GENERATION with unknown model", () => {
      expect(
        costCalculationService.getOperationCredits("IMAGE_GENERATION", { model: "unknown-model" })
      ).toBe(3);
    });

    // --- Image generation (standalone) ---

    it("returns standalone image generation cost without model", () => {
      expect(costCalculationService.getOperationCredits("MEDIA_GEN_IMAGE")).toBe(3);
    });

    it("returns model-specific cost for standalone image generation", () => {
      expect(
        costCalculationService.getOperationCredits("MEDIA_GEN_IMAGE", { model: "flux-schnell" })
      ).toBe(1);
    });

    // --- TTS generation (pipeline) ---

    it("returns default cost for TTS_GENERATION without provider", () => {
      expect(costCalculationService.getOperationCredits("TTS_GENERATION")).toBe(2);
    });

    it("returns provider-specific cost for TTS with elevenlabs", () => {
      expect(
        costCalculationService.getOperationCredits("TTS_GENERATION", { provider: "elevenlabs" })
      ).toBe(5);
    });

    it("returns provider-specific cost for TTS with openai", () => {
      expect(
        costCalculationService.getOperationCredits("TTS_GENERATION", { provider: "openai" })
      ).toBe(2);
    });

    it("returns provider-specific cost for TTS with google-gemini", () => {
      expect(
        costCalculationService.getOperationCredits("TTS_GENERATION", { provider: "google-gemini" })
      ).toBe(1);
    });

    it("returns default cost for TTS with unknown provider", () => {
      expect(
        costCalculationService.getOperationCredits("TTS_GENERATION", { provider: "unknown" })
      ).toBe(2);
    });

    // --- TTS generation (standalone) ---

    it("returns standalone speech generation cost without provider", () => {
      expect(costCalculationService.getOperationCredits("SPEECH_GENERATION")).toBe(2);
    });

    it("returns provider-specific cost for standalone speech generation", () => {
      expect(
        costCalculationService.getOperationCredits("SPEECH_GENERATION", { provider: "elevenlabs" })
      ).toBe(5);
    });

    // --- Video generation (pipeline) ---

    it("returns programmatic video generation cost (no provider)", () => {
      expect(costCalculationService.getOperationCredits("VIDEO_GENERATION")).toBe(3);
    });

    it("returns programmatic video generation cost with ffmpeg provider", () => {
      expect(
        costCalculationService.getOperationCredits("VIDEO_GENERATION", { provider: "ffmpeg" })
      ).toBe(3);
    });

    it("returns AI video generation cost with non-ffmpeg provider", () => {
      expect(
        costCalculationService.getOperationCredits("VIDEO_GENERATION", { provider: "replicate" })
      ).toBe(10);
    });

    it("returns model-specific AI video generation cost", () => {
      expect(
        costCalculationService.getOperationCredits("VIDEO_GENERATION", {
          provider: "replicate",
          model: "animate-diff",
        })
      ).toBe(8);
    });

    // --- Video generation (standalone) ---

    it("returns standalone video generation cost without model", () => {
      expect(costCalculationService.getOperationCredits("MEDIA_GEN_VIDEO")).toBe(10);
    });

    it("returns model-specific cost for standalone video generation", () => {
      expect(
        costCalculationService.getOperationCredits("MEDIA_GEN_VIDEO", { model: "zeroscope" })
      ).toBe(8);
    });

    // --- Caption generation ---

    it("returns cost for CAPTION_GENERATION", () => {
      expect(costCalculationService.getOperationCredits("CAPTION_GENERATION")).toBe(1);
    });
  });

  describe("estimatePipelineCost", () => {
    it("estimates cost for minimal pipeline (3 scenes)", () => {
      const result = costCalculationService.estimatePipelineCost({ sceneCount: 3 });
      expect(result.totalCredits).toBeGreaterThan(0);
      expect(result.breakdown).toBeInstanceOf(Array);
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it("scales with scene count", () => {
      const small = costCalculationService.estimatePipelineCost({ sceneCount: 3 });
      const large = costCalculationService.estimatePipelineCost({ sceneCount: 10 });
      expect(large.totalCredits).toBeGreaterThan(small.totalCredits);
    });

    it("respects provider-specific image model costs", () => {
      const expensive = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        imageModel: "dall-e-3",
      });
      const cheap = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        imageModel: "flux-schnell",
      });
      expect(expensive.totalCredits).toBeGreaterThan(cheap.totalCredits);
    });

    it("respects provider-specific TTS costs", () => {
      const expensive = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        ttsProvider: "elevenlabs",
      });
      const cheap = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        ttsProvider: "google-gemini",
      });
      expect(expensive.totalCredits).toBeGreaterThan(cheap.totalCredits);
    });

    it("includes verification by default", () => {
      const withVerification = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
      });
      const withoutVerification = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        includeVerification: false,
      });
      expect(withVerification.totalCredits).toBeGreaterThan(
        withoutVerification.totalCredits
      );
    });

    it("includes audio mixing by default", () => {
      const withMixing = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
      });
      const withoutMixing = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        includeAudioMixing: false,
      });
      expect(withMixing.totalCredits).toBeGreaterThan(withoutMixing.totalCredits);
    });

    it("includes captions by default", () => {
      const withCaptions = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
      });
      const withoutCaptions = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        includeCaptions: false,
      });
      expect(withCaptions.totalCredits).toBeGreaterThan(withoutCaptions.totalCredits);
    });

    it("breakdown contains correct once-per-pipeline stages", () => {
      const result = costCalculationService.estimatePipelineCost({ sceneCount: 5 });
      const stageNames = result.breakdown.map((b) => b.stage);
      expect(stageNames).toContain("INGESTION");
      expect(stageNames).toContain("STORY_WRITING");
      expect(stageNames).toContain("SCENE_GENERATION");
      expect(stageNames).toContain("VIDEO_ASSEMBLY");
    });

    it("breakdown contains correct per-scene stages", () => {
      const result = costCalculationService.estimatePipelineCost({ sceneCount: 5 });
      const stageNames = result.breakdown.map((b) => b.stage);
      expect(stageNames).toContain("IMAGE_GENERATION");
      expect(stageNames).toContain("VIDEO_GENERATION");
      expect(stageNames).toContain("TTS_GENERATION");
      expect(stageNames).toContain("VISUAL_VERIFICATION");
      expect(stageNames).toContain("CAPTION_GENERATION");
      expect(stageNames).toContain("AUDIO_MIXING");
    });

    it("once-per-pipeline stages have count = 1", () => {
      const result = costCalculationService.estimatePipelineCost({ sceneCount: 7 });
      const onceStages = ["INGESTION", "STORY_WRITING", "SCENE_GENERATION", "VIDEO_ASSEMBLY"];
      for (const stage of onceStages) {
        const item = result.breakdown.find((b) => b.stage === stage);
        expect(item).toBeDefined();
        expect(item!.count).toBe(1);
      }
    });

    it("per-scene stages have count = sceneCount", () => {
      const sceneCount = 7;
      const result = costCalculationService.estimatePipelineCost({ sceneCount });
      const perSceneStages = [
        "IMAGE_GENERATION",
        "VIDEO_GENERATION",
        "TTS_GENERATION",
        "VISUAL_VERIFICATION",
        "CAPTION_GENERATION",
        "AUDIO_MIXING",
      ];
      for (const stage of perSceneStages) {
        const item = result.breakdown.find((b) => b.stage === stage);
        expect(item).toBeDefined();
        expect(item!.count).toBe(sceneCount);
      }
    });

    it("totalCredits equals sum of all breakdown items", () => {
      const result = costCalculationService.estimatePipelineCost({
        sceneCount: 5,
        imageModel: "dall-e-3",
        ttsProvider: "elevenlabs",
      });
      const breakdownSum = result.breakdown.reduce((sum, item) => sum + item.credits, 0);
      expect(result.totalCredits).toBe(breakdownSum);
    });

    it("calculates exact cost for a known configuration", () => {
      // 5 scenes, default models, all optional stages included
      // Once: INGESTION(1) + STORY_WRITING(5) + SCENE_GENERATION(2) + VIDEO_ASSEMBLY(5) = 13
      // Per scene (x5): IMAGE(3) + VERIFY(1) + VIDEO(3) + TTS(2) + CAPTION(1) + MIX(1) = 11 * 5 = 55
      // Total = 13 + 55 = 68
      const result = costCalculationService.estimatePipelineCost({ sceneCount: 5 });
      expect(result.totalCredits).toBe(68);
    });
  });
});
