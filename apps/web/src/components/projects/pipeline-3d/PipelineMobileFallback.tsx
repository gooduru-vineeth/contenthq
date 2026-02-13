"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PipelineStage } from "@contenthq/shared";
import type { ConsolidatedStageWithStatus } from "./types";
import { cn } from "@/lib/utils";

interface PipelineMobileFallbackProps {
  stages: ConsolidatedStageWithStatus[];
  onStageSelect: (stage: PipelineStage) => void;
}

const statusBadge: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-gray-500/10 text-gray-500" },
  active: { label: "Active", className: "bg-indigo-500/10 text-indigo-400" },
  completed: { label: "Done", className: "bg-emerald-500/10 text-emerald-400" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400" },
};

const statusDot: Record<string, string> = {
  pending: "bg-gray-400",
  active: "bg-indigo-500 animate-pulse",
  completed: "bg-emerald-500",
  failed: "bg-red-500",
};

export function PipelineMobileFallback({
  stages,
  onStageSelect,
}: PipelineMobileFallbackProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <AnimatePresence mode="sync">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const badge = statusBadge[stage.status];
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
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-colors",
                      statusDot[stage.status],
                    )}
                  />
                </div>

                {/* Icon */}
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all",
                    stage.status === "pending"
                      ? "bg-muted text-muted-foreground"
                      : "text-white shadow-sm",
                  )}
                  style={
                    stage.status !== "pending"
                      ? {
                          background: `linear-gradient(135deg, ${stage.color}, ${stage.colorEnd})`,
                          boxShadow:
                            stage.status === "active"
                              ? `0 4px 12px ${stage.color}40`
                              : undefined,
                        }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Label */}
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

                {/* Status badge */}
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-medium px-2.5 py-0.5 rounded-full",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              </button>

              {/* Connector line */}
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
