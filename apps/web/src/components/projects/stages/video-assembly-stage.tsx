"use client";

import Image from "next/image";
import { Clapperboard, Download, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StageEmptyState } from "./stage-empty-state";
import { StageJobStatus } from "./stage-job-status";

interface Job {
  id: string;
  jobType: string;
  status: string;
  createdAt: Date;
  result: Record<string, unknown> | null;
}

interface VideoAssemblyStageProps {
  projectId: string;
  isActive: boolean;
  jobs: Job[];
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  totalCreditsUsed: number;
}

export function VideoAssemblyStage({
  isActive,
  jobs,
  finalVideoUrl,
  thumbnailUrl,
  totalCreditsUsed,
}: VideoAssemblyStageProps) {
  return (
    <div>
      <StageJobStatus jobs={jobs} stageName="VIDEO_ASSEMBLY" />
      {!finalVideoUrl ? (
        <StageEmptyState
          icon={Clapperboard}
          title={isActive ? "Assembling final video..." : "No final video"}
          description={
            isActive
              ? "Combining all scenes into the final video"
              : "The final video will be assembled after audio mixing."
          }
          isActive={isActive}
        />
      ) : (
        <div className="space-y-4">
          <video
            src={finalVideoUrl}
            controls
            className="w-full rounded-md"
            preload="metadata"
            poster={thumbnailUrl ?? undefined}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {thumbnailUrl && (
                <div className="relative h-12 w-20 overflow-hidden rounded border">
                  <Image
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
              <div>
                <Badge variant="default" className="bg-green-500 hover:bg-green-500/80">
                  Complete
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {totalCreditsUsed > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" />
                  {totalCreditsUsed} credits
                </div>
              )}
              <a
                href={finalVideoUrl}
                download
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
