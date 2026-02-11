"use client";

import Image from "next/image";
import { ImageIcon, Film, Music } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MediaItem {
  id: string;
  type: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

interface MediaPreviewProps {
  item: MediaItem;
  open: boolean;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaPreview({ item, open, onClose }: MediaPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize">
            {item.type === "image" && <ImageIcon className="h-4 w-4" />}
            {item.type === "video" && <Film className="h-4 w-4" />}
            {item.type === "audio" && <Music className="h-4 w-4" />}
            {item.type} Preview
          </DialogTitle>
          <DialogDescription>
            {item.mimeType ?? "Unknown type"}
            {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
            {" · "}
            {new Date(item.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {(item.type === "image" || item.type === "thumbnail") && item.url && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={item.url}
                alt="Media preview"
                fill
                className="object-contain"
              />
            </div>
          )}

          {item.type === "video" && item.url && (
            <video
              src={item.url}
              controls
              className="w-full rounded-lg"
            >
              <track kind="captions" />
            </video>
          )}

          {item.type === "audio" && item.url && (
            <div className="flex items-center justify-center rounded-lg bg-muted p-8">
              <audio src={item.url} controls className="w-full">
                <track kind="captions" />
              </audio>
            </div>
          )}

          {!item.url && (
            <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">
                Preview not available
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
