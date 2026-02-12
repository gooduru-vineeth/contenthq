"use client";

import { motion, AnimatePresence } from "framer-motion";
import { pipelineStages } from "../../lib/constants";

interface PipelineMobileFallbackProps {
  activeStage: number;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

// Deterministic particle positions to satisfy React purity rules
const PARTICLES = [
  { left: "12%", top: "15%", size: 6, delay: "0s", duration: "4.2s" },
  { left: "35%", top: "8%", size: 5, delay: "0.4s", duration: "5.1s" },
  { left: "58%", top: "22%", size: 9, delay: "0.8s", duration: "3.8s" },
  { left: "78%", top: "12%", size: 7, delay: "1.2s", duration: "6.3s" },
  { left: "22%", top: "55%", size: 4, delay: "1.6s", duration: "4.7s" },
  { left: "45%", top: "62%", size: 8, delay: "2.0s", duration: "5.5s" },
  { left: "68%", top: "48%", size: 5, delay: "2.4s", duration: "3.4s" },
  { left: "88%", top: "35%", size: 10, delay: "2.8s", duration: "6.1s" },
  { left: "15%", top: "72%", size: 6, delay: "3.2s", duration: "4.9s" },
  { left: "52%", top: "40%", size: 7, delay: "3.6s", duration: "5.8s" },
];

export function PipelineMobileFallback({
  activeStage,
  onSelectStage,
  reducedMotion,
}: PipelineMobileFallbackProps) {
  const stage = pipelineStages[activeStage];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card/50 p-6">
      {/* CSS floating particles */}
      {!reducedMotion &&
        PARTICLES.map((p, i) => (
          <div
            key={i}
            className="pointer-events-none absolute rounded-full bg-brand-500/15"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animation: `float ${p.duration} ease-in-out ${p.delay} infinite`,
            }}
          />
        ))}

      {/* Scrollable stage circles */}
      <div
        className="relative flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none"
        role="tablist"
        aria-label="Pipeline stages"
      >
        {pipelineStages.map((s, i) => {
          const isActive = i === activeStage;
          const Icon = s.icon;
          return (
            <button
              key={s.name}
              role="tab"
              aria-selected={isActive}
              aria-label={`Stage ${i + 1}: ${s.name}`}
              onClick={() => onSelectStage(i)}
              className="flex flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg p-2 shrink-0"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white transition-all duration-300"
                style={{
                  backgroundColor: s.color,
                  boxShadow: isActive
                    ? `0 0 20px ${s.color}60`
                    : "none",
                  transform: isActive ? "scale(1.15)" : "scale(0.9)",
                  opacity: isActive ? 1 : i < activeStage ? 0.7 : 0.4,
                  animation:
                    isActive && !reducedMotion
                      ? "glow-pulse 2s ease-in-out infinite"
                      : "none",
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className="text-[10px] font-medium whitespace-nowrap transition-colors"
                style={{
                  color: isActive
                    ? "var(--foreground)"
                    : "var(--muted-foreground)",
                }}
              >
                {s.name}
              </span>
            </button>
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
