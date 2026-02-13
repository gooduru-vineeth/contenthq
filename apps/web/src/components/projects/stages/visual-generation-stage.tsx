"use client";

import Image from "next/image";
import { Image as ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StageEmptyState } from "./stage-empty-state";
import { StageJobStatus } from "./stage-job-status";

interface Job {
  id: string;
  jobType: string;
  status: string;
  createdAt: Date;
  result: Record<string, unknown> | null;
}

interface VisualGenerationStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

export function VisualGenerationStage({ projectId, isActive, jobs }: VisualGenerationStageProps) {
  const { data: scenes, isLoading } = trpc.scene.listByProject.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const hasVisuals = scenes?.some((s) => s.visuals && s.visuals.length > 0);

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="VISUAL_GENERATION" />
      {!scenes || scenes.length === 0 || !hasVisuals ? (
        <StageEmptyState
          icon={ImageIcon}
          title={isActive ? "Generating visuals..." : "No visuals generated"}
          description={
            isActive
              ? "Creating images for each scene using AI"
              : "Visual assets will be generated from scene descriptions."
          }
          isActive={isActive}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {scenes.map((scene) => {
            const visual = scene.visuals?.[0];
            return (
              <div
                key={scene.id}
                className="group relative overflow-hidden rounded-md border"
              >
                {visual?.imageUrl ? (
                  <div className="relative aspect-square w-full">
                    <Image
                      src={visual.imageUrl}
                      alt={scene.visualDescription ?? `Scene ${scene.index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-xs font-medium text-white">
                    Scene {scene.index + 1}
                  </p>
                  <Badge
                    variant="secondary"
                    className="mt-0.5 text-[9px] bg-black/50 text-white border-0"
                  >
                    {scene.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {visual?.prompt && (
                  <div className="absolute inset-0 flex items-end bg-black/80 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="text-xs text-white line-clamp-4">
                      {visual.prompt}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
