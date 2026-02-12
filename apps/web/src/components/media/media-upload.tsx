"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileUp, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { env } from "@/lib/env";
import { toast } from "sonner";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

type FileUploadState = {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
};

interface MediaUploadProps {
  onUploadComplete?: () => void;
}

export function MediaUpload({ onUploadComplete }: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const isUploading = uploads.some(
    (u) => u.status === "uploading" || u.status === "pending"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];

      for (const file of files) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`Unsupported file type: ${file.name}`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File too large (max 100MB): ${file.name}`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      const newUploads: FileUploadState[] = validFiles.map((file) => ({
        file,
        status: "pending" as const,
        progress: 0,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      const formData = new FormData();
      for (const file of validFiles) {
        formData.append("files", file);
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (!e.lengthComputable) return;
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploads((prev) =>
          prev.map((u) =>
            validFiles.includes(u.file)
              ? { ...u, status: "uploading" as const, progress: percent }
              : u
          )
        );
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const failedNames = new Set(
              (response.errors ?? []).map(
                (e: { name: string }) => e.name
              )
            );

            setUploads((prev) =>
              prev.map((u) => {
                if (!validFiles.includes(u.file)) return u;
                if (failedNames.has(u.file.name)) {
                  const err = response.errors.find(
                    (e: { name: string }) => e.name === u.file.name
                  );
                  return {
                    ...u,
                    status: "error" as const,
                    progress: 100,
                    error: err?.error ?? "Upload failed",
                  };
                }
                return { ...u, status: "success" as const, progress: 100 };
              })
            );

            if (response.successful > 0) {
              toast.success(
                `Uploaded ${response.successful} file${response.successful > 1 ? "s" : ""}`
              );
              onUploadComplete?.();
            }
            if (response.failed > 0) {
              toast.error(`${response.failed} file(s) failed to upload`);
            }
          } catch {
            setUploads((prev) =>
              prev.map((u) =>
                validFiles.includes(u.file)
                  ? {
                      ...u,
                      status: "error" as const,
                      progress: 100,
                      error: "Invalid response",
                    }
                  : u
              )
            );
          }

          setTimeout(() => {
            setUploads((prev) =>
              prev.filter(
                (u) => u.status !== "success" && u.status !== "error"
              )
            );
          }, 3000);
        } else {
          setUploads((prev) =>
            prev.map((u) =>
              validFiles.includes(u.file)
                ? {
                    ...u,
                    status: "error" as const,
                    progress: 100,
                    error: `Upload failed (${xhr.status})`,
                  }
                : u
            )
          );
          toast.error("Upload failed");
        }
      });

      xhr.addEventListener("error", () => {
        setUploads((prev) =>
          prev.map((u) =>
            validFiles.includes(u.file)
              ? {
                  ...u,
                  status: "error" as const,
                  progress: 100,
                  error: "Network error",
                }
              : u
          )
        );
        toast.error("Upload failed — network error");
      });

      xhr.open("POST", `${env.NEXT_PUBLIC_API_URL}/api/upload`);
      xhr.withCredentials = true;
      xhr.send(formData);
    },
    [onUploadComplete]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isUploading) setIsDragging(true);
    },
    [isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (isUploading) return;
      const files = Array.from(e.dataTransfer.files);
      uploadFiles(files);
    },
    [isUploading, uploadFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isUploading) return;
      const files = Array.from(e.target.files ?? []);
      uploadFiles(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [isUploading, uploadFiles]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
          isUploading
            ? "pointer-events-none border-muted-foreground/25 opacity-60"
            : isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : isDragging ? (
            <FileUp className="h-6 w-6 text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            {isUploading
              ? "Uploading..."
              : isDragging
                ? "Drop files here"
                : "Drag & drop files"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PNG, JPG, WebP, GIF, MP4, WebM, MP3, WAV, OGG (max 100MB)
          </p>
        </div>
        {!isUploading && (
          <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
            Browse files
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileSelect}
            />
          </label>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, i) => (
            <div
              key={`${upload.file.name}-${i}`}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {upload.file.name}
                </p>
                <Progress
                  value={upload.progress}
                  className="mt-1 h-1.5"
                />
              </div>
              <div className="flex-shrink-0">
                {upload.status === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {upload.status === "error" && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                {(upload.status === "uploading" ||
                  upload.status === "pending") && (
                  <span className="text-xs text-muted-foreground">
                    {upload.progress}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
