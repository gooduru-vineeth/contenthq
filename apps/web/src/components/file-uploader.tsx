"use client";

import type { FC, DragEvent } from "react";
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploaderProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  onUpload: (files: File[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const FileUploader: FC<FileUploaderProps> = ({
  accept = "image/png,image/jpeg,image/webp",
  maxSize = 10 * 1024 * 1024,
  maxFiles = 1,
  onUpload,
  disabled = false,
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (fileList: FileList | File[]): File[] | null => {
    const filesArray = Array.from(fileList);

    if (filesArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} file${maxFiles > 1 ? "s" : ""} allowed`);
      return null;
    }

    const acceptedTypes = accept.split(",").map((type) => type.trim());
    const validFiles: File[] = [];

    for (const file of filesArray) {
      if (!acceptedTypes.some((type) => file.type.match(type))) {
        setError(`File type ${file.type} not accepted`);
        return null;
      }

      if (file.size > maxSize) {
        setError(
          `File size exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
        );
        return null;
      }

      validFiles.push(file);
    }

    return validFiles;
  };

  const handleFiles = (fileList: FileList | File[]) => {
    setError(null);
    const validFiles = validateFiles(fileList);

    if (validFiles) {
      setFiles(validFiles);
      onUpload(validFiles);

      const newPreviews = validFiles.map((file) => {
        if (file.type.startsWith("image/")) {
          return URL.createObjectURL(file);
        }
        return "";
      });
      setPreviews(newPreviews);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    if (previews[index]) {
      URL.revokeObjectURL(previews[index]);
    }

    setFiles(newFiles);
    setPreviews(newPreviews);
    setError(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }

    onUpload(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        {children || (
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Drop files here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                {accept.includes("image")
                  ? "PNG, JPEG, WEBP"
                  : accept.split(",").join(", ")}{" "}
                up to {(maxSize / 1024 / 1024).toFixed(0)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative group rounded-lg border overflow-hidden"
            >
              {previews[index] ? (
                <div className="relative aspect-square">
                  <Image
                    src={previews[index]}
                    alt={file.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <p className="text-xs text-muted-foreground truncate px-2">
                    {file.name}
                  </p>
                </div>
              )}

              <div className="p-2 bg-background/95">
                <p className="text-xs truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
