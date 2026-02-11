"use client";

import Image from "next/image";
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/store/scene-store";

interface SceneVisual {
  id: string;
  imageUrl: string | null;
  verified: boolean | null;
  verificationScore: number | null;
}

interface SceneCardProps {
  id: string;
  index: number;
  status: string;
  narrationScript: string | null;
  visualDescription: string | null;
  duration: number | null;
  visuals?: SceneVisual[];
}

const statusBadgeVariant: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  outlined: "secondary",
  scripted: "outline",
  visual_generated: "default",
  visual_verified: "default",
  video_generated: "default",
  completed: "default",
  failed: "destructive",
};

const statusBadgeClass: Record<string, string> = {
  visual_generated: "bg-blue-500 hover:bg-blue-500/80",
  visual_verified: "bg-green-500 hover:bg-green-500/80",
  completed: "bg-green-500 hover:bg-green-500/80",
};

export function SceneCard({
  id,
  index,
  status,
  narrationScript,
  duration,
  visuals,
}: SceneCardProps) {
  const { selectedSceneId, setSelectedScene } = useSceneStore();
  const isSelected = selectedSceneId === id;
  const thumbnail = visuals?.find((v) => v.imageUrl)?.imageUrl ?? null;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary",
      )}
      onClick={() => setSelectedScene(id)}
    >
      {/* Thumbnail */}
      <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={`Scene ${index + 1}`}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-2xl font-bold text-muted-foreground/50">
              {index + 1}
            </span>
          </div>
        )}
        <Badge
          variant={statusBadgeVariant[status] ?? "outline"}
          className={cn("absolute right-2 top-2 text-[10px]", statusBadgeClass[status] ?? "")}
        >
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Scene {index + 1}</span>
          {duration && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {duration}s
            </span>
          )}
        </div>
        {narrationScript && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {narrationScript}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
