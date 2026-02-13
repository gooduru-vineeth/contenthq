import { generateObject } from "../tracing";
import { getModelInstance, resolveModelFromDb, ANTHROPIC_MODELS } from "../providers/model-factory";
import { z } from "zod";
import { truncateForLog } from "../utils/log-helpers";

async function downloadImageToBuffer(imageUrl: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Image download failed: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") ?? "image/png";
    const mimeType = contentType.split(";")[0].trim();
    return { buffer: Buffer.from(arrayBuffer), mimeType };
  } finally {
    clearTimeout(timeout);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

const verificationSchema = z.object({
  relevance: z.number().describe("How relevant the image is to the description (0-30)"),
  quality: z.number().describe("Image quality and clarity (0-25)"),
  consistency: z.number().describe("Visual consistency and coherence (0-25)"),
  safety: z.number().describe("Content safety score (0-20)"),
  totalScore: z.number().describe("Total score (0-100), sum of all criteria"),
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

  // Download image locally to avoid ephemeral URL timeout issues with AI providers
  let imageData: { buffer: Buffer; mimeType: string };
  try {
    imageData = await downloadImageToBuffer(imageUrl);
    console.warn(`[VisionService] Downloaded image: ${imageData.buffer.length} bytes, mimeType=${imageData.mimeType}`);
  } catch (downloadError) {
    console.error(`[VisionService] Failed to download image from ${imageUrl.substring(0, 80)}: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`);
    return {
      relevance: 0,
      quality: 0,
      consistency: 0,
      safety: 0,
      totalScore: 0,
      feedback: `Image download failed: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`,
      approved: false,
    };
  }

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
          { type: "image", image: imageData.buffer, mediaType: imageData.mimeType },
        ],
      },
    ],
  });

  console.warn(`[VisionService] Verification result: provider=${resolvedProvider}, model=${resolvedModelId}, approved=${result.object.approved}, totalScore=${result.object.totalScore}, relevance=${result.object.relevance}, quality=${result.object.quality}`);

  return result.object;
}
