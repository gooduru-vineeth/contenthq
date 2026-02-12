import { Hono } from "hono";
import { auth } from "../lib/auth";
import { storage, getMediaUploadPath } from "@contenthq/storage";
import { db } from "@contenthq/db/client";
import { mediaAssets } from "@contenthq/db/schema";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getMediaType(mimeType: string): "image" | "video" | "audio" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "audio";
}

const uploadRoutes = new Hono();

uploadRoutes.post("/", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = session.user.id;

  const body = await c.req.parseBody({ all: true });

  const rawFiles = body["file"] ?? body["files"];
  if (!rawFiles) {
    return c.json({ error: "No files provided" }, 400);
  }

  const files = Array.isArray(rawFiles) ? rawFiles : [rawFiles];
  const fileObjects = files.filter((f): f is File => f instanceof File);

  if (fileObjects.length === 0) {
    return c.json({ error: "No valid files provided" }, 400);
  }

  const projectId =
    typeof body["projectId"] === "string" ? body["projectId"] : null;

  const uploaded: Array<{
    id: string;
    name: string;
    url: string | null;
    type: string;
  }> = [];
  const errors: Array<{ name: string; error: string }> = [];

  for (const file of fileObjects) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      errors.push({
        name: file.name,
        error: `Unsupported file type: ${file.type}`,
      });
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push({
        name: file.name,
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      });
      continue;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const storageKey = getMediaUploadPath(userId, file.name);

      const result = await storage.uploadFileWithRetry(
        storageKey,
        data,
        file.type
      );

      const [inserted] = await db
        .insert(mediaAssets)
        .values({
          userId,
          projectId,
          type: getMediaType(file.type),
          url: result.url,
          storageKey,
          mimeType: file.type,
          sizeBytes: file.size,
        })
        .returning({ id: mediaAssets.id });

      uploaded.push({
        id: inserted.id,
        name: file.name,
        url: result.url,
        type: getMediaType(file.type),
      });
    } catch (err) {
      console.error(`[Upload] Failed to upload ${file.name}:`, err);
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

export { uploadRoutes };
