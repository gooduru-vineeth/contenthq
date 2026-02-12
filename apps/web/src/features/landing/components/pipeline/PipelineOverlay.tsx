"use client";

import { motion, AnimatePresence } from "framer-motion";
import { pipelineStages } from "../../lib/constants";

interface PipelineOverlayProps {
  activeStage: number;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

export function PipelineOverlay({
  activeStage,
  onSelectStage,
  reducedMotion,
}: PipelineOverlayProps) {
  const stage = pipelineStages[activeStage];
  const Icon = stage.icon;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-6">
      {/* Screen reader description */}
      <p className="sr-only">
        AI video creation pipeline: Import, Write Script, Storyboard,
        Create Visuals, Quality Check, Add Voice &amp; Music, and Final Video.
        Currently viewing stage {activeStage + 1}: {stage.name}.
      </p>

      {/* Stage info */}
      <div className="mb-6 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage}
            initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-1 flex items-center justify-center gap-1.5">
              <Icon className="h-5 w-5" style={{ color: stage.color }} />
              <span
                className="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: stage.color }}
              >
                {activeStage + 1} / {pipelineStages.length}
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {stage.name}
            </h3>
            <p className="text-sm text-muted-foreground">{stage.tagline}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      <div
        className="pointer-events-auto flex items-center gap-2"
        role="tablist"
        aria-label="Pipeline stages"
      >
        {pipelineStages.map((s, i) => {
          const isActive = i === activeStage;
          return (
            <button
              key={s.name}
              role="tab"
              aria-selected={isActive}
              aria-label={`Stage ${i + 1}: ${s.name}`}
              onClick={() => onSelectStage(i)}
              className="group relative flex items-center justify-center p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-full"
            >
              <span
                className="block rounded-full transition-all duration-300"
                style={{
                  width: isActive ? 24 : 10,
                  height: 10,
                  backgroundColor: isActive ? s.color : undefined,
                  opacity: isActive ? 1 : 0.4,
                }}
              >
                {!isActive && (
                  <span className="block h-full w-full rounded-full bg-muted-foreground" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
