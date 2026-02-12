"use client";

import type { FC } from "react";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Eye } from "lucide-react";

interface MediaCardProps {
  id: string;
  url: string;
  mediaType: "image" | "video" | "audio" | "thumbnail";
  status: "pending" | "generating" | "completed" | "failed";
  modelName?: string;
  provider?: string;
  aspectRatio?: string;
  prompt?: string;
  error?: string;
}

export const MediaCard: FC<MediaCardProps> = ({
  id,
  url,
  mediaType,
  status,
  modelName,
  provider,
  aspectRatio,
  prompt,
  error,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const utils = trpc.useUtils();

  const deleteMutation = trpc.mediaGeneration.delete.useMutation({
    onSuccess: () => {
      toast.success("Media deleted successfully");
      void utils.mediaGeneration.list.invalidate();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete media");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id });
  };

  const getStatusBadge = () => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
            Pending
          </Badge>
        );
      case "generating":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
            Generating
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600">
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">Failed</Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-lg">
        <CardContent className="p-0">
          <div
            className="relative aspect-square cursor-pointer bg-muted"
            onClick={() => status === "completed" && setShowPreview(true)}
          >
            {status === "completed" ? (
              mediaType === "image" || mediaType === "thumbnail" ? (
                <Image
                  src={url}
                  alt={prompt || "Generated image"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : mediaType === "video" ? (
                <video
                  src={url}
                  controls
                  className="h-full w-full object-cover"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <audio
                  src={url}
                  controls
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              )
            ) : status === "generating" || status === "pending" ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {status === "pending" ? "Queued" : "Generating..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-destructive">
                  {error || "Generation failed"}
                </p>
              </div>
            )}
            <div className="absolute top-2 right-2">{getStatusBadge()}</div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 p-4">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {modelName && (
                <p className="text-sm font-medium truncate">{modelName}</p>
              )}
              {provider && (
                <p className="text-xs text-muted-foreground">{provider}</p>
              )}
            </div>
            {aspectRatio && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {aspectRatio}
              </Badge>
            )}
          </div>
          {prompt && (
            <p className="text-xs text-muted-foreground line-clamp-2 w-full">
              {prompt}
            </p>
          )}
          <div className="flex w-full gap-2 mt-2">
            {status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={status === "completed" ? "w-auto" : "flex-1"}
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {modelName && provider ? `${modelName} (${provider})` : "Preview"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {mediaType === "image" || mediaType === "thumbnail" ? (
              <div className="relative w-full aspect-square">
                <Image
                  src={url}
                  alt={prompt || "Generated image"}
                  fill
                  className="object-contain rounded-lg"
                  sizes="(max-width: 768px) 100vw, 80vw"
                />
              </div>
            ) : mediaType === "video" ? (
              <video src={url} controls className="w-full rounded-lg" />
            ) : (
              <audio src={url} controls className="w-full" />
            )}
            {prompt && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Prompt:</p>
                <p className="text-sm text-muted-foreground">{prompt}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this media. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
