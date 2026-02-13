"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { howItWorksSteps, STEP_ACCENTS } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepNode3D } from "./StepNode3D";

export function HowItWorksSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const lineScaleX = useTransform(scrollYProgress, [0.1, 0.6], [0, 1]);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative overflow-hidden py-24"
    >
      {/* ---- Background layers ---- */}
      <div className="pointer-events-none absolute inset-0">
        {/* Subtle gradient base */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-50/30 to-transparent dark:via-brand-950/10" />

        {/* Center radial glow */}
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-200/15 blur-3xl dark:bg-brand-800/8" />

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ---- Content ---- */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            How It Works
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Four Steps to{" "}
            <span className="text-gradient-landing">Your First Video</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Get started in minutes. No video editing experience required.
          </p>
        </motion.div>

        {/* Desktop - horizontal */}
        <div className="hidden md:block">
          <div className="relative" style={{ perspective: "1200px" }}>
            {/* Connector line */}
            <div className="absolute left-[12.5%] right-[12.5%] top-[4.5rem] z-0 h-0.5">
              {/* Base track */}
              <div className="absolute inset-0 rounded-full bg-border" />

              {/* Scroll-fill gradient */}
              <motion.div
                className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-brand-800 to-brand-500"
                style={
                  prefersReducedMotion
                    ? { scaleX: 1 }
                    : { scaleX: lineScaleX }
                }
              />

              {/* Pulsing glow overlay */}
              {!prefersReducedMotion && (
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(40, 69, 214, 0.6) 40%, rgba(79, 111, 228, 0.8) 50%, rgba(40, 69, 214, 0.6) 60%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "connector-pulse 3s linear infinite",
                    filter: "blur(2px)",
                  }}
                />
              )}
            </div>

            <div className="grid grid-cols-4 gap-8">
              {howItWorksSteps.map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={
                    prefersReducedMotion
                      ? undefined
                      : { opacity: 0, y: 30, scale: 0.92 }
                  }
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.15,
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                >
                  <StepNode3D
                    step={step}
                    accent={STEP_ACCENTS[i]}
                    prefersReducedMotion={prefersReducedMotion}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile - vertical */}
        <div className="space-y-6 md:hidden">
          {howItWorksSteps.map((step, i) => {
            const Icon = step.icon;
            const accent = STEP_ACCENTS[i];
            return (
              <motion.div
                key={step.step}
                initial={
                  prefersReducedMotion ? undefined : { opacity: 0, x: -20 }
                }
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  {/* Gradient icon node */}
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent.iconGradient} shadow-lg`}
                    style={{
                      boxShadow: `0 4px 14px -2px ${accent.glowColor}40`,
                    }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {i < howItWorksSteps.length - 1 && (
                    <div className="relative mt-2 h-full w-0.5 overflow-hidden bg-border">
                      {/* Subtle pulse on vertical connector */}
                      {!prefersReducedMotion && (
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(180deg, transparent 0%, rgba(40, 69, 214, 0.5) 40%, rgba(79, 111, 228, 0.7) 50%, rgba(40, 69, 214, 0.5) 60%, transparent 100%)",
                            backgroundSize: "100% 200%",
                            animation:
                              "connector-pulse-vertical 3s linear infinite",
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
                <div className="pb-6">
                  <span
                    className="text-xs font-medium"
                    style={{ color: accent.glowColor }}
                  >
                    Step {step.step}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
