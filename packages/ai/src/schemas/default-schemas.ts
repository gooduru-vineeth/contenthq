import { z } from "zod";
import { registerSchema } from "./registry";

/**
 * Story output schema — matches what story-writing.worker.ts expects.
 */
export const storyOutputSchema = z.object({
  title: z.string(),
  hook: z.string(),
  synopsis: z.string(),
  narrativeArc: z.object({
    setup: z.string(),
    risingAction: z.string(),
    climax: z.string(),
    resolution: z.string(),
  }),
  scenes: z.array(
    z.object({
      index: z.number(),
      visualDescription: z.string(),
      narrationScript: z.string(),
      duration: z.number(),
      motionSpec: z.object({
        type: z.string(),
        speed: z.number(),
      }).optional(),
      transition: z.string().optional(),
    })
  ),
});

/**
 * Scene output schema — for scene generation/refinement.
 */
export const sceneOutputSchema = z.object({
  scenes: z.array(
    z.object({
      index: z.number(),
      visualDescription: z.string(),
      imagePrompt: z.string(),
      narrationScript: z.string(),
      motionSpec: z.string(),
      transition: z.string(),
      duration: z.number(),
    })
  ),
});

/**
 * Verification output schema — matches vision.service.ts verificationSchema.
 */
export const verificationOutputSchema = z.object({
  relevance: z
    .number()
    .min(0)
    .max(30)
    .describe("How relevant the image is to the description (0-30)"),
  quality: z.number().min(0).max(25).describe("Image quality and clarity (0-25)"),
  consistency: z
    .number()
    .min(0)
    .max(25)
    .describe("Visual consistency and coherence (0-25)"),
  safety: z.number().min(0).max(20).describe("Content safety score (0-20)"),
  totalScore: z.number().min(0).max(100),
  feedback: z.string().describe("Brief feedback on the image"),
  approved: z.boolean().describe("Whether the image passes verification"),
});

/**
 * Register all default schemas. Call once at application startup.
 */
export function registerDefaultSchemas(): void {
  registerSchema("story_output", storyOutputSchema);
  registerSchema("scene_output", sceneOutputSchema);
  registerSchema("verification_output", verificationOutputSchema);
}
