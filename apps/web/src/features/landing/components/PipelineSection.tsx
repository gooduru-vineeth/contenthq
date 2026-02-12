"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pipelineStages } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function PipelineSection() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const advance = useCallback(() => {
    setActiveStage((prev) => (prev + 1) % pipelineStages.length);
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;
    const timer = setInterval(advance, 3000);
    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion, advance]);

  return (
    <section id="pipeline" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300">
            7-Stage Pipeline
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            From Raw Content to{" "}
            <span className="text-gradient-landing">Polished Video</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Every stage is automated, verified, and optimized by AI. Watch your
            content transform step by step.
          </p>
        </motion.div>

        {/* Desktop Pipeline - horizontal */}
        <div
          className="hidden lg:block"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative flex items-start justify-between gap-2">
            {/* Connecting line */}
            <div className="absolute left-[calc(theme(spacing.6)+16px)] right-[calc(theme(spacing.6)+16px)] top-8 h-0.5">
              <div className="h-full w-full rounded-full bg-border" />
              <motion.div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #6D28D9, #7C3AED, #3B82F6)",
                  backgroundSize: "200% 100%",
                  animation: prefersReducedMotion
                    ? "none"
                    : "pipeline-flow 3s linear infinite",
                }}
                animate={{
                  width: `${((activeStage + 1) / pipelineStages.length) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>

            {pipelineStages.map((stage, i) => {
              const isActive = i === activeStage;
              const isPast = i < activeStage;
              const Icon = stage.icon;

              return (
                <motion.button
                  key={stage.name}
                  onClick={() => setActiveStage(i)}
                  className="group relative z-10 flex flex-1 flex-col items-center text-center"
                  initial={
                    prefersReducedMotion ? undefined : { opacity: 0, y: 20 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  {/* Icon circle */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.2 : 1,
                      boxShadow: isActive
                        ? `0 0 24px ${stage.color}40`
                        : "none",
                    }}
                    transition={{ duration: 0.3 }}
                    className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 transition-colors ${
                      isActive
                        ? "border-transparent text-white"
                        : isPast
                          ? "border-transparent text-white opacity-80"
                          : "border-border bg-background text-muted-foreground group-hover:border-violet-300"
                    }`}
                    style={
                      isActive || isPast
                        ? { backgroundColor: stage.color }
                        : undefined
                    }
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>

                  {/* Name */}
                  <span
                    className={`text-sm font-semibold transition-colors ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {stage.name}
                  </span>

                  {/* Description */}
                  <span className="mt-1 text-xs text-muted-foreground">
                    {stage.description}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStage}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="mt-10 rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{
                    backgroundColor: pipelineStages[activeStage].color,
                  }}
                >
                  {(() => {
                    const StageIcon = pipelineStages[activeStage].icon;
                    return <StageIcon className="h-5 w-5" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    Stage {activeStage + 1}: {pipelineStages[activeStage].name}
                  </h3>
                  <p className="mt-1 text-muted-foreground">
                    {pipelineStages[activeStage].detail}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Pipeline - vertical */}
        <div className="lg:hidden">
          <div className="relative space-y-1">
            {pipelineStages.map((stage, i) => {
              const isActive = i === activeStage;
              const Icon = stage.icon;

              return (
                <motion.button
                  key={stage.name}
                  onClick={() => setActiveStage(i)}
                  initial={
                    prefersReducedMotion ? undefined : { opacity: 0, x: -20 }
                  }
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex w-full items-start gap-4 rounded-xl p-4 text-left transition-colors ${
                    isActive
                      ? "bg-violet-50 dark:bg-violet-950/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {/* Icon + line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white`}
                      style={{ backgroundColor: stage.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    {i < pipelineStages.length - 1 && (
                      <div className="mt-1 h-6 w-0.5 bg-border" />
                    )}
                  </div>
                  {/* Text */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Stage {i + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold">{stage.name}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {isActive ? stage.detail : stage.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
