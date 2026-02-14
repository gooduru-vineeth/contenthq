"use client";

import { useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { pipelineStages } from "../../lib/constants";
import type { PipelineStage } from "../../lib/constants";

const emptySubscribe = () => () => {};

interface PipelineStagesProps {
  activeStage: number;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

/** Returns the theme-appropriate color for a pipeline stage. */
function stageColor(stage: PipelineStage, isDark: boolean) {
  return isDark ? stage.darkColor : stage.color;
}

export function PipelineStages({
  activeStage,
  onSelectStage,
  reducedMotion,
}: PipelineStagesProps) {
  const stage = pipelineStages[activeStage];
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/80 to-card/40 p-4 backdrop-blur-sm dark:border-white/10 dark:from-card/90 dark:to-card/60 sm:p-6 md:p-8">
      {/* Stage buttons */}
      <div
        className="relative flex flex-wrap items-center justify-center gap-x-0 gap-y-2 pb-4 sm:flex-nowrap sm:gap-1 sm:overflow-x-auto sm:scrollbar-none md:gap-2 lg:gap-3 lg:overflow-x-visible"
        role="tablist"
        aria-label="Pipeline stages"
      >
        {pipelineStages.map((s, i) => {
          const isActive = i === activeStage;
          const isPast = i < activeStage;
          const Icon = s.icon;
          const c = stageColor(s, isDark);
          return (
            <div key={s.name} className="flex shrink-0 items-center">
              <button
                role="tab"
                aria-selected={isActive}
                aria-label={`Stage ${i + 1}: ${s.name}`}
                onClick={() => onSelectStage(i)}
                className="flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:gap-1.5 sm:p-3"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${c}20, ${c}10)`
                    : "transparent",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: isActive ? `${c}40` : "transparent",
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg backdrop-blur-sm transition-all duration-300 sm:h-10 sm:w-10 md:h-11 md:w-11 lg:h-12 lg:w-12"
                  style={{
                    backgroundColor: `${c}${isActive ? "30" : "18"}`,
                    opacity: isActive ? 1 : isPast ? 0.8 : 0.5,
                  }}
                >
                  <Icon
                    className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6"
                    style={{
                      color: isActive || isPast ? c : "var(--muted-foreground)",
                    }}
                  />
                </div>
                <span
                  className="whitespace-nowrap text-[9px] font-medium transition-colors sm:text-[10px] md:text-xs lg:text-sm"
                  style={{
                    color: isActive
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                  }}
                >
                  {s.name}
                </span>
                {/* Active indicator dot */}
                <div
                  className="h-1 w-1 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? c : "transparent",
                  }}
                />
              </button>
              {/* Connector line */}
              {i < pipelineStages.length - 1 && (
                <div
                  className="hidden h-px w-4 shrink-0 sm:block sm:w-6 lg:w-8"
                  style={{
                    backgroundColor:
                      i < activeStage
                        ? `${stageColor(pipelineStages[i], isDark)}50`
                        : "var(--border)",
                    opacity: i < activeStage ? 0.8 : 0.3,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Active stage info */}
      <div className="mt-2 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage}
            initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <span
              className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs"
              style={{ backgroundColor: stageColor(stage, isDark) }}
            >
              Stage {activeStage + 1}
            </span>
            <h3 className="text-base font-bold text-foreground sm:text-lg lg:text-xl">
              {stage.name}
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              {stage.tagline}
            </p>
            <p className="mx-auto mt-1 hidden max-w-lg text-sm text-muted-foreground lg:block">
              {stage.detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
