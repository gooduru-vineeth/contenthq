import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, getBucketName } from "./client";
import type { UploadResult } from "./types";

export class StorageService {
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<UploadResult> {
    const client = getS3Client();
    const bucket = getBucketName();

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );

    return {
      url: this.getPublicUrl(key),
      key,
      size: body.length,
    };
  }

  async uploadFileWithRetry(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string,
    maxRetries = 3
  ): Promise<UploadResult> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.uploadFile(key, body, contentType);
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to upload file after ${maxRetries} attempts: ${lastError.message}`
          );
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(
          `[Storage] Upload attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`,
          lastError.message
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  async downloadFile(key: string): Promise<Buffer> {
    const client = getS3Client();
    const bucket = getBucketName();

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const stream = response.Body;
    if (!stream) {
      throw new Error(`File not found: ${key}`);
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async deleteFile(key: string): Promise<void> {
    const client = getS3Client();
    const bucket = getBucketName();

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = getS3Client();
    const bucket = getBucketName();

    return awsGetSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn }
    );
  }

  getPublicUrl(key: string): string {
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!publicUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "R2_PUBLIC_URL is required in production for public access. " +
            "The default {bucket}.r2.dev URLs are private by default and will return 403 Forbidden."
        );
      }
      console.warn(
        "[Storage] R2_PUBLIC_URL not set, URLs may be inaccessible. " +
          "Set R2_PUBLIC_URL environment variable for public access."
      );
      return `https://${getBucketName()}.r2.dev/${key}`;
    }
    return `${publicUrl.replace(/\/+$/, "")}/${key}`;
  }

  async listFiles(prefix: string): Promise<string[]> {
    const client = getS3Client();
    const bucket = getBucketName();

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      })
    );

    return (response.Contents ?? [])
      .map((item) => item.Key)
      .filter((key): key is string => key !== undefined);
  }

  async deleteDirectory(prefix: string): Promise<void> {
    const keys = await this.listFiles(prefix);
    await Promise.all(keys.map((key) => this.deleteFile(key)));
  }
}

export const storage = new StorageService();
