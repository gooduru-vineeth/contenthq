"use client";

import type { FC } from "react";
import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageZoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: Array<{ url: string; prompt?: string; model?: string }>;
  initialIndex?: number;
}

export const ImageZoomModal: FC<ImageZoomModalProps> = ({
  open,
  onOpenChange,
  images,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleDownload = async () => {
    if (!currentImage) return;

    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `image-${currentIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  if (!currentImage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] bg-black/95 border-0 p-0 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>

          {hasMultiple && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <div className="relative w-full h-[85vh] flex items-center justify-center p-8">
            <Image
              src={currentImage.url}
              alt={currentImage.prompt || "Generated image"}
              fill
              className="object-contain"
              sizes="(max-width: 1536px) 100vw, 1536px"
              priority
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
            {hasMultiple && (
              <div className="bg-black/60 text-white px-3 py-1.5 rounded-md text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          {currentImage.prompt && (
            <div className="absolute bottom-16 left-4 right-4 bg-black/60 text-white p-4 rounded-md text-sm max-w-2xl mx-auto">
              <p className="font-medium mb-1">Prompt:</p>
              <p className="text-muted-foreground">{currentImage.prompt}</p>
              {currentImage.model && (
                <p className="text-xs text-muted-foreground mt-2">
                  Model: {currentImage.model}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
