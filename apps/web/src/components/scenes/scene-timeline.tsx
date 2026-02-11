"use client";

import Image from "next/image";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/store/scene-store";

interface SceneVisual {
  id: string;
  imageUrl: string | null;
}

interface TimelineScene {
  id: string;
  index: number;
  duration: number | null;
  visuals?: SceneVisual[];
}

interface SceneTimelineProps {
  scenes: TimelineScene[];
}

export function SceneTimeline({ scenes }: SceneTimelineProps) {
  const { selectedSceneId, setSelectedScene } = useSceneStore();
  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration ?? 0), 0);

  if (scenes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Timeline</CardTitle>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {totalDuration}s total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {scenes.map((scene) => {
            const thumbnail = scene.visuals?.find((v) => v.imageUrl)?.imageUrl ?? null;
            const isSelected = selectedSceneId === scene.id;
            return (
              <button
                key={scene.id}
                onClick={() => setSelectedScene(scene.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border p-1.5 transition-colors hover:bg-muted/50 shrink-0",
                  isSelected && "ring-2 ring-primary bg-muted/50",
                )}
              >
                <div className="relative h-12 w-20 overflow-hidden rounded-sm bg-muted">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt={`Scene ${scene.index + 1}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {scene.index + 1}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-medium">{scene.index + 1}</span>
                  {scene.duration && (
                    <span className="text-[10px] text-muted-foreground">
                      {scene.duration}s
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
