"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { howItWorksSteps } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function HowItWorksSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const lineScaleX = useTransform(scrollYProgress, [0.1, 0.6], [0, 1]);

  return (
    <section id="how-it-works" ref={sectionRef} className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            <span className="text-gradient-landing">Automated Content</span>
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Get started in minutes. No video editing experience required.
          </p>
        </motion.div>

        {/* Desktop - horizontal */}
        <div className="hidden md:block">
          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[12.5%] right-[12.5%] top-8 h-0.5 bg-border">
              <motion.div
                className="h-full origin-left rounded-full bg-gradient-to-r from-brand-800 to-brand-500"
                style={
                  prefersReducedMotion
                    ? { scaleX: 1 }
                    : { scaleX: lineScaleX }
                }
              />
            </div>

            <div className="grid grid-cols-4 gap-8">
              {howItWorksSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    initial={
                      prefersReducedMotion
                        ? undefined
                        : { opacity: 0, y: 20 }
                    }
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="relative z-10 mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100 dark:border-brand-800 dark:from-brand-950/50 dark:to-brand-900/50">
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-bold text-white">
                        {step.step}
                      </span>
                      <Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="mb-2 font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile - vertical */}
        <div className="md:hidden space-y-6">
          {howItWorksSteps.map((step, i) => {
            const Icon = step.icon;
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
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  {i < howItWorksSteps.length - 1 && (
                    <div className="mt-2 h-full w-0.5 bg-border" />
                  )}
                </div>
                <div className="pb-6">
                  <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
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
