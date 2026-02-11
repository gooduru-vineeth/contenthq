"use client";

import { useCallback, useState } from "react";
import { Upload, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
];

export function MediaUpload() {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const _files = Array.from(e.dataTransfer.files).filter((f) =>
      ACCEPTED_TYPES.includes(f.type)
    );
    // Upload endpoint placeholder - will be connected in Phase 3
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const _files = Array.from(e.target.files ?? []).filter((f) =>
      ACCEPTED_TYPES.includes(f.type)
    );
    // Upload endpoint placeholder - will be connected in Phase 3
  }, []);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isDragging ? (
          <FileUp className="h-6 w-6 text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">
          {isDragging ? "Drop files here" : "Drag & drop files"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPG, WebP, MP4, WebM, MP3, WAV
        </p>
      </div>
      <label className="cursor-pointer text-sm font-medium text-primary hover:underline">
        Browse files
        <input
          type="file"
          className="hidden"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileSelect}
        />
      </label>
    </div>
  );
}
