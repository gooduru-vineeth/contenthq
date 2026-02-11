"use client";

import {
  Download,
  Pen,
  Layers,
  Image,
  ShieldCheck,
  Film,
  Mic,
  Music,
  Clapperboard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PIPELINE_STAGE_ORDER,
  PIPELINE_STAGE_LABELS,
  type PipelineStage,
} from "@contenthq/shared";

type StageStatus = "pending" | "active" | "completed" | "failed";

interface PipelineProgressProps {
  currentStage: PipelineStage | null;
  projectStatus: string;
}

const stageIcons: Record<PipelineStage, LucideIcon> = {
  INGESTION: Download,
  STORY_WRITING: Pen,
  SCENE_GENERATION: Layers,
  VISUAL_GENERATION: Image,
  VISUAL_VERIFICATION: ShieldCheck,
  VIDEO_GENERATION: Film,
  TTS_GENERATION: Mic,
  AUDIO_MIXING: Music,
  VIDEO_ASSEMBLY: Clapperboard,
};

function getStageStatus(
  stage: PipelineStage,
  currentStage: PipelineStage | null,
  projectStatus: string,
): StageStatus {
  if (projectStatus === "completed") return "completed";
  if (projectStatus === "failed") {
    if (!currentStage) return "pending";
    const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStage);
    const stageIndex = PIPELINE_STAGE_ORDER.indexOf(stage);
    if (stageIndex < currentIndex) return "completed";
    if (stageIndex === currentIndex) return "failed";
    return "pending";
  }
  if (!currentStage) return "pending";

  const currentIndex = PIPELINE_STAGE_ORDER.indexOf(currentStage);
  const stageIndex = PIPELINE_STAGE_ORDER.indexOf(stage);

  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) return "active";
  return "pending";
}

const statusColors: Record<StageStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  active: "bg-primary text-primary-foreground",
  completed: "bg-green-500 text-white",
  failed: "bg-destructive text-destructive-foreground",
};

const badgeVariantMap: Record<StageStatus, "secondary" | "default" | "destructive" | "outline"> = {
  pending: "secondary",
  active: "default",
  completed: "default",
  failed: "destructive",
};

export function PipelineProgress({
  currentStage,
  projectStatus,
}: PipelineProgressProps) {
  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center gap-1">
        {PIPELINE_STAGE_ORDER.map((stage, index) => {
          const status = getStageStatus(stage, currentStage, projectStatus);
          const Icon = stageIcons[stage];
          return (
            <div key={stage} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    statusColors[status],
                    status === "active" && "animate-pulse",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] text-center leading-tight max-w-[72px] text-muted-foreground">
                  {PIPELINE_STAGE_LABELS[stage]}
                </span>
              </div>
              {index < PIPELINE_STAGE_ORDER.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-6 rounded-full mt-[-16px]",
                    status === "completed" ? "bg-green-500" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact list */}
      <div className="flex flex-col gap-2 md:hidden">
        {PIPELINE_STAGE_ORDER.map((stage) => {
          const status = getStageStatus(stage, currentStage, projectStatus);
          const Icon = stageIcons[stage];
          return (
            <div
              key={stage}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2",
                status === "active" && "bg-muted",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full",
                  statusColors[status],
                  status === "active" && "animate-pulse",
                )}
              >
                <Icon className="h-3 w-3" />
              </div>
              <span className="flex-1 text-sm">
                {PIPELINE_STAGE_LABELS[stage]}
              </span>
              <Badge variant={badgeVariantMap[status]} className="text-[10px]">
                {status}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
