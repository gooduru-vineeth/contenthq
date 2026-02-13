"use client";

import { Film } from "lucide-react";
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

interface VideoGenerationStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
}

export function VideoGenerationStage({ projectId, isActive, jobs }: VideoGenerationStageProps) {
  const { data: scenes, isLoading } = trpc.scene.listByProjectEnriched.useQuery(
    { projectId },
    { refetchInterval: isActive ? 5000 : false },
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const hasVideos = scenes?.some((s) => s.videos && s.videos.length > 0);

  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="VIDEO_GENERATION" />
      {!scenes || scenes.length === 0 || !hasVideos ? (
        <StageEmptyState
          icon={Film}
          title={isActive ? "Generating videos..." : "No videos generated"}
          description={
            isActive
              ? "Assembling scene visuals into video clips"
              : "Video clips will be generated from verified visuals."
          }
          isActive={isActive}
        />
      ) : (
        <div className="space-y-3">
          {scenes.map((scene) => {
            const video = scene.videos?.[0];
            if (!video) return null;
            return (
              <div
                key={scene.id}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Scene {scene.index + 1}</p>
                  <div className="flex items-center gap-2">
                    {video.duration != null && (
                      <span className="text-xs text-muted-foreground">
                        {video.duration}s
                      </span>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {scene.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
                {video.videoUrl ? (
                  <video
                    src={video.videoUrl}
                    controls
                    className="w-full rounded-md max-h-48"
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-md bg-muted">
                    <Film className="h-8 w-8 text-muted-foreground" />
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
