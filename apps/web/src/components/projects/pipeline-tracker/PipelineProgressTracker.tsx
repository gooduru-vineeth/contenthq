"use client";

import { Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import type { PipelineStage } from "@contenthq/shared";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { usePipelineStageStatus } from "./use-pipeline-stage-status";
import type {
  PipelineProgressTrackerProps,
  ConsolidatedStageWithStatus,
  StageStatus,
} from "./types";

/* ─── Status badge config for mobile ─── */
const statusBadgeConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-500/10 text-gray-500" },
  active: { label: "Active", className: "bg-indigo-500/10 text-indigo-400" },
  completed: { label: "Done", className: "bg-emerald-500/10 text-emerald-400" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400" },
};

/* ─── StageIcon ─── */
function StageIcon({
  stage,
  size = "md",
  reducedMotion,
}: {
  stage: ConsolidatedStageWithStatus;
  size?: "sm" | "md";
  reducedMotion: boolean;
}) {
  const Icon = stage.icon;
  const isMd = size === "md";
  const sizeClasses = isMd ? "w-12 h-12 rounded-xl" : "w-9 h-9 rounded-xl";
  const iconSize = isMd ? "h-5 w-5" : "h-4 w-4";

  const isPending = stage.status === "pending";
  const isCompleted = stage.status === "completed";
  const isActive = stage.status === "active";
  const isFailed = stage.status === "failed";

  return (
    <motion.div
      className={cn(
        "relative flex items-center justify-center shrink-0",
        sizeClasses,
        isPending && "bg-muted text-muted-foreground",
        !isPending && "text-white",
      )}
      style={
        !isPending
          ? {
              background: isFailed
                ? "linear-gradient(135deg, #EF4444, #DC2626)"
                : `linear-gradient(135deg, ${stage.color}, ${stage.colorEnd})`,
              boxShadow: isActive
                ? `0 0 20px ${stage.color}40, 0 4px 12px ${stage.color}30`
                : isCompleted
                  ? `0 2px 8px ${stage.color}20`
                  : undefined,
            }
          : undefined
      }
      whileHover={reducedMotion ? undefined : { scale: 1.08 }}
      whileTap={reducedMotion ? undefined : { scale: 0.95 }}
    >
      {isCompleted ? (
        <Check className={iconSize} strokeWidth={2.5} />
      ) : (
        <Icon className={iconSize} />
      )}

      {/* Active pulse ring */}
      {isActive && !reducedMotion && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          style={{ border: `2px solid ${stage.color}` }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
}

/* ─── ConnectionLine ─── */
function ConnectionLine({
  fromStatus,
  toStatus,
  color,
  nextColor,
}: {
  fromStatus: StageStatus;
  toStatus: StageStatus;
  color: string;
  nextColor: string;
}) {
  const isFromCompleted = fromStatus === "completed";
  const isToCompleted = toStatus === "completed";
  const isToActive = toStatus === "active";
  const isFromActive = fromStatus === "active";

  let bg: React.CSSProperties = {};

  if (isFromCompleted && isToCompleted) {
    bg = { backgroundColor: "#22c55e" };
  } else if (isFromCompleted && isToActive) {
    bg = { backgroundImage: `linear-gradient(90deg, #22c55e, ${nextColor})` };
  } else if (isFromActive) {
    bg = { backgroundColor: color, opacity: 0.4 };
  } else {
    bg = {};
  }

  const isDefault =
    !isFromCompleted && !isFromActive;

  return (
    <div
      className={cn(
        "h-0.5 w-full rounded-full transition-all duration-500",
        isDefault && "bg-border",
      )}
      style={bg}
    />
  );
}

/* ─── ActiveDot ─── */
function ActiveDot({
  color,
  reducedMotion,
}: {
  color: string;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return (
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  }

  return (
    <motion.div
      className="w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ─── Desktop Pipeline Tracker ─── */
function DesktopTracker({
  stages,
  onStageSelect,
  reducedMotion,
}: {
  stages: ConsolidatedStageWithStatus[];
  onStageSelect: (stage: PipelineStage) => void;
  reducedMotion: boolean;
}) {
  return (
    <div className="flex items-start">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;

        return (
          <Fragment key={stage.id}>
            {/* Stage column */}
            <motion.button
              type="button"
              className="flex flex-col items-center gap-2 cursor-pointer relative group"
              onClick={() => onStageSelect(stage.primaryStage)}
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              <StageIcon stage={stage} size="md" reducedMotion={reducedMotion} />

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-medium text-center max-w-[80px] leading-tight transition-colors",
                  stage.status === "pending"
                    ? "text-muted-foreground"
                    : "text-foreground",
                  stage.isSelected && "font-semibold",
                )}
              >
                {stage.label}
              </span>

              {/* Active dot indicator */}
              {stage.status === "active" && (
                <ActiveDot color={stage.color} reducedMotion={reducedMotion} />
              )}

              {/* Selected underline */}
              {stage.isSelected && (
                <motion.div
                  layoutId="pipeline-selected-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full"
                  style={{ backgroundColor: stage.color }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              {/* Hover ring */}
              <div
                className={cn(
                  "absolute -inset-1.5 rounded-2xl border-2 border-transparent transition-colors",
                  !stage.isSelected &&
                    "group-hover:border-muted-foreground/10",
                )}
              />
            </motion.button>

            {/* Connection line */}
            {!isLast && (
              <div className="flex-1 flex items-center min-w-4 px-1 pt-6">
                <ConnectionLine
                  fromStatus={stage.status}
                  toStatus={stages[index + 1].status}
                  color={stage.color}
                  nextColor={stages[index + 1].color}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ─── Mobile Pipeline Tracker ─── */
function MobileTracker({
  stages,
  onStageSelect,
  reducedMotion,
}: {
  stages: ConsolidatedStageWithStatus[];
  onStageSelect: (stage: PipelineStage) => void;
  reducedMotion: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <AnimatePresence mode="sync">
        {stages.map((stage, index) => {
          const badge = statusBadgeConfig[stage.status];
          const isLast = index === stages.length - 1;

          return (
            <motion.div key={stage.id} layout>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left",
                  stage.isSelected
                    ? "bg-muted ring-1 ring-primary/30"
                    : "hover:bg-muted/50",
                )}
                onClick={() => onStageSelect(stage.primaryStage)}
              >
                <StageIcon stage={stage} size="sm" reducedMotion={reducedMotion} />

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      stage.status === "pending" && "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 truncate">
                    {stage.tagline}
                  </p>
                </div>

                <span
                  className={cn(
                    "shrink-0 text-[10px] font-medium px-2.5 py-0.5 rounded-full",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              </button>

              {!isLast && (
                <div className="ml-[22px] h-2.5 w-px bg-border/60" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Component ─── */
export function PipelineProgressTracker({
  currentStage,
  projectStatus,
  progressPercent,
  selectedStage,
  onStageSelect,
  pipelineTemplateId,
}: PipelineProgressTrackerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const stages = usePipelineStageStatus(
    currentStage,
    projectStatus,
    selectedStage ?? null,
    pipelineTemplateId,
  );
  const percent = progressPercent ?? 0;

  function handleStageSelect(stage: PipelineStage) {
    onStageSelect?.(stage);
  }

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
                  <span className="text-muted-foreground/40">&middot;</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: activeStage.color }}
                  >
                    {activeStage.label}
                  </span>
                </>
              )}
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.round(percent)}%
            </span>
          </div>
          {/* Gradient progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                projectStatus === "failed" && "bg-destructive",
              )}
              style={{
                width: `${Math.min(percent, 100)}%`,
                backgroundImage:
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

      {/* Desktop: horizontal tracker */}
      <div className="hidden md:block px-6 py-6">
        <DesktopTracker
          stages={stages}
          onStageSelect={handleStageSelect}
          reducedMotion={reducedMotion}
        />
      </div>

      {/* Mobile: vertical list */}
      <div className="block md:hidden px-4 pb-4">
        <MobileTracker
          stages={stages}
          onStageSelect={handleStageSelect}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}
