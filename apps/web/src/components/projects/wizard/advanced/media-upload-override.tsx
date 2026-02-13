"use client";

import { useCallback, useState } from "react";
import { Upload, X, FileVideo, FileImage, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaUploadOverrideProps {
  label: string;
  accept: string;
  currentUrl?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

export function MediaUploadOverride({
  label,
  accept,
  currentUrl,
  onUpload,
  onRemove,
}: MediaUploadOverrideProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const FileIcon = accept.includes("video")
    ? FileVideo
    : accept.includes("audio")
      ? FileAudio
      : FileImage;

  if (currentUrl) {
    return (
      <div className="flex items-center gap-2 rounded-md border p-2">
        <FileIcon className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-xs">{currentUrl}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-4 transition-colors",
        isDragOver ? "border-primary bg-primary/5" : "border-muted"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <Upload className="h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <label className="cursor-pointer">
        <span className="text-xs text-primary underline">Browse files</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileSelect}
        />
      </label>
    </div>
  );
}
