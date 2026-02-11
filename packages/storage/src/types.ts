export interface UploadResult {
  url: string;
  key: string;
  size: number;
}

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
}
