"use client";

import { useState } from "react";
import { ImageIcon, Film, Music, FolderOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MediaGrid, MediaGridSkeleton } from "@/components/media/media-grid";
import { MediaUpload } from "@/components/media/media-upload";
import { toast } from "sonner";

type MediaFilter = "all" | "image" | "video" | "audio";

export default function MediaPage() {
  const [filter, setFilter] = useState<MediaFilter>("all");

  const { data: allMedia, isLoading } = trpc.media.listAll.useQuery();
  const utils = trpc.useUtils();

  const deleteMutation = trpc.media.delete.useMutation({
    onSuccess: () => {
      utils.media.listAll.invalidate();
      toast.success("Media deleted");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const filteredMedia =
    allMedia?.filter((item) => {
      if (filter === "all") return true;
      if (filter === "image") return item.type === "image" || item.type === "thumbnail";
      return item.type === filter;
    }) ?? [];

  function handleDelete(id: string) {
    deleteMutation.mutate({ id });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <p className="text-sm text-muted-foreground">
          Manage your generated and uploaded media assets
        </p>
      </div>

      <MediaUpload onUploadComplete={() => utils.media.listAll.invalidate()} />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as MediaFilter)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            All
            {allMedia && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({allMedia.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="image" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            Images
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1.5">
            <Film className="h-3.5 w-3.5" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="audio" className="gap-1.5">
            <Music className="h-3.5 w-3.5" />
            Audio
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <MediaGridSkeleton />
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No media assets yet
              </p>
            </div>
          ) : (
            <MediaGrid
              items={filteredMedia}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
