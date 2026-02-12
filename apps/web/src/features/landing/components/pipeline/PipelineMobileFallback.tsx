"use client";

import { motion, AnimatePresence } from "framer-motion";
import { pipelineStages } from "../../lib/constants";

interface PipelineMobileFallbackProps {
  activeStage: number;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

export function PipelineMobileFallback({
  activeStage,
  onSelectStage,
  reducedMotion,
}: PipelineMobileFallbackProps) {
  const stage = pipelineStages[activeStage];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm">
      {/* Scrollable glass-card stage buttons */}
      <div
        className="relative flex items-center gap-1 overflow-x-auto pb-4 scrollbar-none"
        role="tablist"
        aria-label="Pipeline stages"
      >
        {pipelineStages.map((s, i) => {
          const isActive = i === activeStage;
          const isPast = i < activeStage;
          const Icon = s.icon;
          return (
            <div key={s.name} className="flex shrink-0 items-center">
              <button
                role="tab"
                aria-selected={isActive}
                aria-label={`Stage ${i + 1}: ${s.name}`}
                onClick={() => onSelectStage(i)}
                className="flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${s.color}20, ${s.color}10)`
                    : "transparent",
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: isActive ? `${s.color}30` : "transparent",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg backdrop-blur-sm transition-all duration-300"
                  style={{
                    backgroundColor: `${s.color}${isActive ? "25" : "15"}`,
                    opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
                  }}
                >
                  <Icon
                    className="h-5 w-5"
                    style={{
                      color: isActive || isPast ? s.color : "var(--muted-foreground)",
                    }}
                  />
                </div>
                <span
                  className="whitespace-nowrap text-[10px] font-medium transition-colors"
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
                    backgroundColor: isActive ? s.color : "transparent",
                  }}
                />
              </button>
              {/* Connector line */}
              {i < pipelineStages.length - 1 && (
                <div
                  className="h-px w-4 shrink-0"
                  style={{
                    backgroundColor:
                      i < activeStage
                        ? `${pipelineStages[i].color}40`
                        : "var(--border)",
                    opacity: i < activeStage ? 0.6 : 0.2,
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
              className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: stage.color }}
            >
              Stage {activeStage + 1}
            </span>
            <h3 className="text-base font-bold text-foreground">
              {stage.name}
            </h3>
            <p className="text-xs text-muted-foreground">{stage.tagline}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
