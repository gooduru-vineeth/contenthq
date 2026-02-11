"use client";

import Image from "next/image";
import { ImageOff, RotateCcw, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VisualPreviewProps {
  imageUrl: string | null;
  verified: boolean | null;
  verificationScore: number | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function VisualPreview({
  imageUrl,
  verified,
  verificationScore,
  onRegenerate,
  isRegenerating,
}: VisualPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Scene visual"
            fill
            className="object-contain"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <ImageOff className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No visual generated</p>
          </div>
        )}
        {verified !== null && (
          <Badge
            variant={verified ? "default" : "secondary"}
            className={`absolute left-2 top-2 gap-1 ${verified ? "bg-green-500 hover:bg-green-500/80" : ""}`}
          >
            <ShieldCheck className="h-3 w-3" />
            {verified ? "Verified" : "Unverified"}
            {verificationScore !== null && ` (${verificationScore}%)`}
          </Badge>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="w-full"
      >
        {isRegenerating ? (
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        ) : (
          <RotateCcw className="mr-2 h-3 w-3" />
        )}
        Regenerate Visual
      </Button>
    </div>
  );
}
