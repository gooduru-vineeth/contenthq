"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { pipelineStages } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { PipelineOverlay } from "./pipeline/PipelineOverlay";
import { PipelineMobileFallback } from "./pipeline/PipelineMobileFallback";

const PipelineCanvas3D = dynamic(
  () =>
    import("./pipeline/PipelineCanvas3D").then((mod) => ({
      default: mod.PipelineCanvas3D,
    })),
  { ssr: false }
);

export function PipelineSection() {
  const [activeStage, setActiveStage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const advance = useCallback(() => {
    setActiveStage((prev) => (prev + 1) % pipelineStages.length);
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion) return;
    const timer = setInterval(advance, 4000);
    return () => clearInterval(timer);
  }, [isPaused, prefersReducedMotion, advance]);

  const handleSelectStage = useCallback((index: number) => {
    setActiveStage(index);
    setIsPaused(true);
  }, []);

  return (
    <section id="pipeline" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            How It Works
          </span>
          <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Your AI Video Team,{" "}
            <span className="text-gradient-landing">Working for You</span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            From a simple idea to a finished video — our AI handles every step
            so you can focus on what matters.
          </p>
        </motion.div>

        {/* Desktop: 3D Canvas + Overlay */}
        <div
          className="relative hidden lg:block"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onFocus={() => setIsPaused(true)}
          onBlur={() => setIsPaused(false)}
        >
          <div aria-hidden="true">
            <PipelineCanvas3D
              activeStage={activeStage}
              isPaused={isPaused}
              onSelectStage={handleSelectStage}
              reducedMotion={prefersReducedMotion}
            />
          </div>
          <PipelineOverlay
            activeStage={activeStage}
            onSelectStage={handleSelectStage}
            reducedMotion={prefersReducedMotion}
          />
        </div>

        {/* Mobile: 2D Fallback */}
        <div className="lg:hidden">
          <PipelineMobileFallback
            activeStage={activeStage}
            onSelectStage={handleSelectStage}
            reducedMotion={prefersReducedMotion}
          />
        </div>
      </div>
    </section>
  );
}
