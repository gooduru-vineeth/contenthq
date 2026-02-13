import { Hono } from "hono";
import { auth } from "../lib/auth";
import { storage } from "@contenthq/storage";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const referenceUploadRoutes = new Hono();

referenceUploadRoutes.post("/", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = session.user.id;

  const body = await c.req.parseBody({ all: true });

  const rawFile = body["file"];
  if (!rawFile || !(rawFile instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_MIME_TYPES.has(rawFile.type)) {
    return c.json(
      { error: `Unsupported file type: ${rawFile.type}. Allowed: PNG, JPEG, WebP` },
      400
    );
  }

  if (rawFile.size > MAX_FILE_SIZE) {
    return c.json(
      { error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` },
      400
    );
  }

  try {
    const arrayBuffer = await rawFile.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const ext = rawFile.type.split("/")[1] ?? "png";
    const uuid = crypto.randomUUID();
    const storageKey = `generated-media/${userId}/references/${uuid}.${ext}`;

    const result = await storage.uploadFileWithRetry(
      storageKey,
      data,
      rawFile.type
    );

    return c.json({
      success: true,
      data: { url: result.url },
    });
  } catch (err) {
    console.error("[ReferenceUpload] Failed to upload:", err);
    return c.json({ error: "Upload failed" }, 500);
  }
});

export { referenceUploadRoutes };
