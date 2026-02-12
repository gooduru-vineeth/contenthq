import { describe, it, expect, afterAll } from "vitest";
import { StorageService } from "../service";
import { getProjectPath } from "../paths";

/**
 * Integration tests for Cloudflare R2 storage.
 * These tests run against the real R2 bucket using env credentials.
 */

const TEST_KEY = "test/r2-integration-test.txt";
const TEST_CONTENT = "Hello from contenthq R2 integration test!";
const TEST_CONTENT_TYPE = "text/plain";

describe("R2 StorageService integration", () => {
  const storage = new StorageService();

  afterAll(async () => {
    // Cleanup: delete the test file regardless of test outcome
    try {
      await storage.deleteFile(TEST_KEY);
    } catch {
      // ignore if already deleted
    }
  });

  it("should upload a file to R2", async () => {
    const body = Buffer.from(TEST_CONTENT, "utf-8");
    const result = await storage.uploadFile(TEST_KEY, body, TEST_CONTENT_TYPE);

    expect(result).toBeDefined();
    expect(result.key).toBe(TEST_KEY);
    expect(result.size).toBe(body.length);
    expect(result.url).toContain(TEST_KEY);
    console.warn("Upload result:", result);
  });

  it("should list the uploaded file", async () => {
    const files = await storage.listFiles("test/");

    expect(files).toContain(TEST_KEY);
    console.warn("Listed files:", files);
  });

  it("should download the file and match content", async () => {
    const downloaded = await storage.downloadFile(TEST_KEY);

    expect(downloaded).toBeInstanceOf(Buffer);
    expect(downloaded.toString("utf-8")).toBe(TEST_CONTENT);
    console.warn("Downloaded content matches!");
  });

  it("should generate a signed URL", async () => {
    const signedUrl = await storage.getSignedUrl(TEST_KEY, 300);

    expect(signedUrl).toBeDefined();
    expect(typeof signedUrl).toBe("string");
    expect(signedUrl).toContain(TEST_KEY);
    expect(signedUrl).toContain("X-Amz-Signature");
    console.warn("Signed URL:", signedUrl.substring(0, 120) + "...");
  });

  it("should generate a public URL", () => {
    const publicUrl = storage.getPublicUrl(TEST_KEY);

    expect(publicUrl).toBeDefined();
    expect(publicUrl).toContain(TEST_KEY);
    console.warn("Public URL:", publicUrl);
  });

  it("should delete the file", async () => {
    await storage.deleteFile(TEST_KEY);

    // Verify deletion by listing
    const files = await storage.listFiles("test/");
    expect(files).not.toContain(TEST_KEY);
    console.warn("File deleted and verified!");
  });
});

describe("Path utilities", () => {
  it("should generate correct project paths", () => {
    const path = getProjectPath("user123", "proj456");
    expect(path).toBe("users/user123/projects/proj456");
  });

  it("should sanitize dangerous path segments", () => {
    const path = getProjectPath("../../../etc", "proj/../secret");
    expect(path).not.toContain("..");
    // sanitizer strips dots and slashes, leaving "etc" and "projsecret"
    expect(path).toBe("users/etc/projects/projsecret");
  });
});
