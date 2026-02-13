import { Hono } from "hono";
import { auth } from "../lib/auth";
import { storage, getVoiceCloneSamplePath } from "@contenthq/storage";
import { db } from "@contenthq/db/client";
import { clonedVoices, clonedVoiceSamples } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";

const ALLOWED_MIME_TYPES = new Set([
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/webm",
  "audio/x-wav",
]);

const MAX_TOTAL_SIZE = 16 * 1024 * 1024; // 16MB total
const MAX_FILES = 3;

const voiceCloneUploadRoutes = new Hono();

voiceCloneUploadRoutes.post("/", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = session.user.id;
  const body = await c.req.parseBody({ all: true });

  const clonedVoiceId =
    typeof body["clonedVoiceId"] === "string" ? body["clonedVoiceId"] : null;

  if (!clonedVoiceId) {
    return c.json({ error: "clonedVoiceId is required" }, 400);
  }

  // Verify ownership
  const [voice] = await db
    .select()
    .from(clonedVoices)
    .where(
      and(
        eq(clonedVoices.id, clonedVoiceId),
        eq(clonedVoices.userId, userId)
      )
    );

  if (!voice) {
    return c.json({ error: "Cloned voice not found" }, 404);
  }

  const rawFiles = body["file"] ?? body["files"];
  if (!rawFiles) {
    return c.json({ error: "No files provided" }, 400);
  }

  const files = Array.isArray(rawFiles) ? rawFiles : [rawFiles];
  const fileObjects = files.filter((f): f is File => f instanceof File);

  if (fileObjects.length === 0) {
    return c.json({ error: "No valid files provided" }, 400);
  }

  if (fileObjects.length > MAX_FILES) {
    return c.json(
      { error: `Maximum ${MAX_FILES} audio samples allowed` },
      400
    );
  }

  const totalSize = fileObjects.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return c.json(
      {
        error: `Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`,
      },
      400
    );
  }

  const uploaded: Array<{
    id: string;
    filename: string;
    url: string;
    sizeBytes: number;
  }> = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const file of fileObjects) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      errors.push({
        name: file.name,
        error: `Unsupported audio type: ${file.type}. Use WAV, MP3, or WebM.`,
      });
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const storageKey = getVoiceCloneSamplePath(
        userId,
        clonedVoiceId,
        file.name
      );

      const result = await storage.uploadFileWithRetry(
        storageKey,
        data,
        file.type
      );

      const [inserted] = await db
        .insert(clonedVoiceSamples)
        .values({
          clonedVoiceId,
          userId,
          filename: file.name,
          storageKey,
          url: result.url,
          mimeType: file.type,
          sizeBytes: file.size,
        })
        .returning();

      uploaded.push({
        id: inserted.id,
        filename: file.name,
        url: result.url,
        sizeBytes: file.size,
      });
    } catch (err) {
      console.error(
        `[VoiceCloneUpload] Failed to upload ${file.name}:`,
        err
      );
      errors.push({
        name: file.name,
        error: "Upload failed",
      });
    }
  }

  return c.json({
    uploaded,
    errors,
    successful: uploaded.length,
    failed: errors.length,
  });
});

export { voiceCloneUploadRoutes };
