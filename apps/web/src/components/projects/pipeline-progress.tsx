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
  Captions,
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
  progressPercent?: number;
  selectedStage?: PipelineStage | null;
  onStageSelect?: (stage: PipelineStage) => void;
}

const stageIcons: Record<string, LucideIcon> = {
  INGESTION: Download,
  STORY_WRITING: Pen,
  SCENE_GENERATION: Layers,
  VISUAL_GENERATION: Image,
  VISUAL_VERIFICATION: ShieldCheck,
  VIDEO_GENERATION: Film,
  TTS_GENERATION: Mic,
  AUDIO_MIXING: Music,
  CAPTION_GENERATION: Captions,
  VIDEO_ASSEMBLY: Clapperboard,
};

export function getStageStatus(
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
  progressPercent,
  selectedStage,
  onStageSelect,
}: PipelineProgressProps) {
  const percent = progressPercent ?? 0;

  return (
    <div className="w-full space-y-3">
      {/* Overall progress bar */}
      {projectStatus !== "draft" && (
        <div className="w-full">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                projectStatus === "completed"
                  ? "bg-green-500"
                  : projectStatus === "failed"
                    ? "bg-destructive"
                    : "bg-primary",
              )}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center gap-1">
        {PIPELINE_STAGE_ORDER.map((stage, index) => {
          const status = getStageStatus(stage, currentStage, projectStatus);
          const Icon = stageIcons[stage] ?? Clapperboard;
          const isSelected = selectedStage === stage;
          return (
            <div key={stage} className="flex items-center">
              <button
                type="button"
                className="flex flex-col items-center gap-1 cursor-pointer group"
                onClick={() => onStageSelect?.(stage)}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                    statusColors[status],
                    status === "active" && "animate-pulse",
                    isSelected && "ring-2 ring-primary ring-offset-2",
                    !isSelected && "group-hover:ring-2 group-hover:ring-muted-foreground/30 group-hover:ring-offset-1",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "text-[10px] text-center leading-tight max-w-[72px] transition-colors",
                  isSelected ? "text-foreground font-medium" : "text-muted-foreground",
                )}>
                  {PIPELINE_STAGE_LABELS[stage]}
                </span>
              </button>
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
          const Icon = stageIcons[stage] ?? Clapperboard;
          const isSelected = selectedStage === stage;
          return (
            <button
              type="button"
              key={stage}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors text-left",
                status === "active" && "bg-muted",
                isSelected && "ring-2 ring-primary ring-offset-1 bg-muted/50",
                !isSelected && "hover:bg-muted/30",
              )}
              onClick={() => onStageSelect?.(stage)}
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
              <span className={cn(
                "flex-1 text-sm",
                isSelected && "font-medium",
              )}>
                {PIPELINE_STAGE_LABELS[stage]}
              </span>
              <Badge variant={badgeVariantMap[status]} className="text-[10px]">
                {status}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
