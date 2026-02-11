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
      return `https://${getBucketName()}.r2.dev/${key}`;
    }
    return `${publicUrl}/${key}`;
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
