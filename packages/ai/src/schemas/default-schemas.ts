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
      visualDescription: z.string().describe("Detailed description of what the viewer sees"),
      narrationScript: z.string().describe("What the narrator says during this scene"),
      imagePrompt: z.string().optional().describe(
        "Optimized prompt for AI image generation. Include art style, lighting, mood, composition. Under 300 chars. No text/watermarks."
      ),
      duration: z.number().describe("Scene duration in seconds, typically 5-10"),
      motionSpec: z.object({
        type: z.enum([
          "zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down",
          "kenburns_in", "kenburns_out", "static",
        ]).describe("Camera motion effect"),
        speed: z.number().describe("Motion speed from 0.1 (subtle) to 1.0 (dramatic)"),
      }),
      transition: z.enum([
        "fade", "fadeblack", "fadewhite", "dissolve",
        "wipeleft", "wiperight", "slideleft", "slideright",
        "circleopen", "circleclose", "radial",
        "smoothleft", "smoothright", "zoomin", "none",
      ]).describe("Transition to next scene. Use 'none' for the last scene."),
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
      visualDescription: z.string().describe("Detailed description of what the viewer sees"),
      imagePrompt: z.string().describe("Optimized prompt for AI image generation"),
      narrationScript: z.string().describe("What the narrator says"),
      motionSpec: z.object({
        type: z.enum([
          "zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down",
          "kenburns_in", "kenburns_out", "static",
        ]).describe("Camera motion effect"),
        speed: z.number().describe("Motion speed from 0.1 (subtle) to 1.0 (dramatic)"),
      }),
      transition: z.enum([
        "fade", "fadeblack", "fadewhite", "dissolve",
        "wipeleft", "wiperight", "slideleft", "slideright",
        "circleopen", "circleclose", "radial",
        "smoothleft", "smoothright", "zoomin", "none",
      ]).describe("Transition to next scene. Use 'none' for the last scene."),
      duration: z.number().describe("Scene duration in seconds"),
    })
  ),
});

/**
 * Verification output schema — matches vision.service.ts verificationSchema.
 */
export const verificationOutputSchema = z.object({
  relevance: z
    .number()
    .describe("How relevant the image is to the description (0-30)"),
  quality: z.number().describe("Image quality and clarity (0-25)"),
  consistency: z
    .number()
    .describe("Visual consistency and coherence (0-25)"),
  safety: z.number().describe("Content safety score (0-20)"),
  totalScore: z.number().describe("Total score (0-100), sum of all criteria"),
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
