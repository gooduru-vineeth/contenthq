"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ImageIcon,
  Film,
  Music,
  Trash2,
  Loader2,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MediaPreview } from "./media-preview";

interface MediaItem {
  id: string;
  type: string;
  url: string | null;
  storageKey: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: Date;
}

interface MediaGridProps {
  items: MediaItem[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

const typeIcons: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  thumbnail: ImageIcon,
};

const typeBadgeClass: Record<string, string> = {
  image: "bg-blue-500 hover:bg-blue-500/80 text-white",
  video: "bg-purple-500 hover:bg-purple-500/80 text-white",
  audio: "bg-amber-500 hover:bg-amber-500/80 text-white",
  thumbnail: "bg-gray-500 hover:bg-gray-500/80 text-white",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function MediaGrid({ items, onDelete, isDeleting }: MediaGridProps) {
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => {
          const Icon = typeIcons[item.type] ?? ImageIcon;
          return (
            <Card
              key={item.id}
              className="group relative overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="relative aspect-square w-full overflow-hidden bg-muted">
                {item.url && (item.type === "image" || item.type === "thumbnail") ? (
                  <Image
                    src={item.url}
                    alt="Media asset"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => setPreviewItem(item)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => onDelete(item.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <Badge
                  className={cn("absolute left-1.5 top-1.5 text-[10px]", typeBadgeClass[item.type] ?? "")}
                >
                  {item.type}
                </Badge>
              </div>

              <CardContent className="p-2 space-y-0.5">
                {item.sizeBytes && (
                  <p className="text-[10px] text-muted-foreground">
                    {formatBytes(item.sizeBytes)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(item.createdAt)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewItem && (
        <MediaPreview
          item={previewItem}
          open={!!previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </>
  );
}

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
