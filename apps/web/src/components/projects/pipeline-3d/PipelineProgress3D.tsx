"use client";

import dynamic from "next/dynamic";
import type { PipelineStage } from "@contenthq/shared";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { usePipelineStageStatus } from "./use-pipeline-stage-status";
import { PipelineMobileFallback } from "./PipelineMobileFallback";
import type { PipelineProgress3DProps } from "./types";

const PipelineCanvas = dynamic(
  () =>
    import("./PipelineCanvas").then((mod) => ({
      default: mod.PipelineCanvas,
    })),
  { ssr: false },
);

export function PipelineProgress3D({
  currentStage,
  projectStatus,
  progressPercent,
  selectedStage,
  onStageSelect,
}: PipelineProgress3DProps) {
  const reducedMotion = usePrefersReducedMotion();
  const stages = usePipelineStageStatus(
    currentStage,
    projectStatus,
    selectedStage ?? null,
  );
  const percent = progressPercent ?? 0;

  function handleStageSelect(stage: PipelineStage) {
    onStageSelect?.(stage);
  }

  // Count completed stages for label
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const activeStage = stages.find((s) => s.status === "active");

  return (
    <div className="w-full">
      {/* Progress header */}
      {projectStatus !== "draft" && (
        <div className="px-6 pt-4 pb-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {completedCount}/{stages.length} stages
              </span>
              {activeStage && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-xs font-medium" style={{ color: activeStage.color }}>
                    {activeStage.label}
                  </span>
                </>
              )}
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.round(percent)}%
            </span>
          </div>
          {/* Premium gradient progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                projectStatus === "failed" && "bg-destructive",
              )}
              style={{
                width: `${Math.min(percent, 100)}%`,
                background:
                  projectStatus === "failed"
                    ? undefined
                    : projectStatus === "completed"
                      ? "linear-gradient(90deg, #22c55e, #4ade80)"
                      : "linear-gradient(90deg, #06B6D4, #8B5CF6, #3B82F6, #6366F1, #10B981, #F59E0B, #EC4899)",
                backgroundSize: "200% 100%",
              }}
            />
          </div>
        </div>
      )}

      {/* Desktop (md+, no reduced motion): 3D Canvas */}
      {!reducedMotion && (
        <div className="hidden md:block">
          <PipelineCanvas
            stages={stages}
            onStageSelect={handleStageSelect}
            reducedMotion={reducedMotion}
          />
        </div>
      )}

      {/* Mobile or reduced motion: 2D fallback */}
      <div
        className={cn(
          "px-4 pb-4",
          reducedMotion ? "block" : "block md:hidden",
        )}
      >
        <PipelineMobileFallback
          stages={stages}
          onStageSelect={handleStageSelect}
        />
      </div>
    </div>
  );
}
