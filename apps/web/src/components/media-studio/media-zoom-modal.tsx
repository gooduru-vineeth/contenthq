"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, X } from "lucide-react";

interface MediaZoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaUrl: string;
  mediaType: "image" | "video";
  prompt?: string;
  model?: string;
}

export function MediaZoomModal({
  open,
  onOpenChange,
  mediaUrl,
  mediaType,
  prompt,
  model,
}: MediaZoomModalProps) {
  const handleDownload = () => {
    const timestamp = new Date().getTime();
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = `generated-${mediaType}-${timestamp}.${mediaType === "image" ? "png" : "mp4"}`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{model ?? "Generated Media"}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-2">
          {mediaType === "image" ? (
            <div className="relative w-full aspect-square">
              <Image
                src={mediaUrl}
                alt={prompt || "Generated image"}
                fill
                className="object-contain rounded-lg"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          ) : (
            <video src={mediaUrl} controls className="w-full rounded-lg" />
          )}
          {prompt && (
            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium">Prompt</p>
              <p className="text-sm text-muted-foreground">{prompt}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
