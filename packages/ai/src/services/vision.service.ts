import { generateObject } from "ai";
import { getModelInstance } from "../providers/model-factory";
import { OPENAI_MODELS } from "../providers/openai";
import { z } from "zod";

const verificationSchema = z.object({
  relevance: z.number().min(0).max(30).describe("How relevant the image is to the description (0-30)"),
  quality: z.number().min(0).max(25).describe("Image quality and clarity (0-25)"),
  consistency: z.number().min(0).max(25).describe("Visual consistency and coherence (0-25)"),
  safety: z.number().min(0).max(20).describe("Content safety score (0-20)"),
  totalScore: z.number().min(0).max(100),
  feedback: z.string().describe("Brief feedback on the image"),
  approved: z.boolean().describe("Whether the image passes verification"),
});

export type VerificationResult = z.infer<typeof verificationSchema>;

export async function verifyImage(
  imageUrl: string,
  sceneDescription: string,
  threshold = 60,
  customPrompt?: string,
  provider = "openai",
  modelId?: string,
): Promise<VerificationResult> {
  const model = getModelInstance(provider, modelId ?? OPENAI_MODELS.GPT4O);

  const result = await generateObject({
    model,
    schema: verificationSchema,
    messages: [
      {
        role: "system",
        content: customPrompt ?? `You are a visual quality assessor for AI-generated video content. Score the image against the scene description on four criteria:
- Relevance (0-30): How well does the image match the description?
- Quality (0-25): Is the image clear, well-composed, and visually appealing?
- Consistency (0-25): Is the image internally consistent (no artifacts, distortions)?
- Safety (0-20): Is the content appropriate and safe for general audiences?

Total score = sum of all criteria (0-100). Approved if total >= ${threshold}.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: `Scene description: ${sceneDescription}\n\nPlease evaluate this image against the scene description.` },
          { type: "image", image: new URL(imageUrl) },
        ],
      },
    ],
  });

  return result.object;
}
