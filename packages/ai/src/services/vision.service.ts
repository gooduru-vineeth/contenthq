import { generateObject } from "ai";
import { getModelInstance, resolveModelFromDb, ANTHROPIC_MODELS } from "../providers/model-factory";
import { z } from "zod";
import { truncateForLog } from "../utils/log-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

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
  provider = "anthropic",
  modelId?: string,
  db?: DrizzleDb,
  userId?: string,
): Promise<VerificationResult> {
  let resolvedProvider = provider;
  let resolvedModelId = modelId ?? ANTHROPIC_MODELS.CLAUDE_SONNET_4_5;

  // Resolve model from DB if available and no explicit provider/model given
  if (db && provider === "anthropic" && !modelId) {
    try {
      const resolved = await resolveModelFromDb(db, {
        type: "vision",
        userId,
      });
      resolvedProvider = resolved.provider;
      resolvedModelId = resolved.modelId;
    } catch {
      console.warn("[VisionService] DB model resolution failed, using hardcoded default");
    }
  }

  const model = getModelInstance(resolvedProvider, resolvedModelId);

  console.warn(`[VisionService] Verifying image: provider=${resolvedProvider}, model=${resolvedModelId}, threshold=${threshold}, imageUrl="${imageUrl.substring(0, 80)}", sceneDescription="${truncateForLog(sceneDescription, 150)}", hasCustomPrompt=${!!customPrompt}`);

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

  console.warn(`[VisionService] Verification result: provider=${resolvedProvider}, model=${resolvedModelId}, approved=${result.object.approved}, totalScore=${result.object.totalScore}, relevance=${result.object.relevance}, quality=${result.object.quality}`);

  return result.object;
}
