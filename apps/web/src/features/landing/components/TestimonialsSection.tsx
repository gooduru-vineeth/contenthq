"use client";

import { useState, useEffect, useCallback } from "react";
import type { Variants } from "framer-motion";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testimonials, TESTIMONIAL_ACCENTS } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TestimonialCard3D } from "./TestimonialCard3D";

/* ------------------------------------------------------------------ */
/*  3D Transition Variants                                             */
/* ------------------------------------------------------------------ */

function getCardVariants(prefersReducedMotion: boolean): Variants {
  if (prefersReducedMotion) {
    return { initial: {}, animate: {}, exit: {} };
  }

  return {
    initial: {
      opacity: 0,
      scale: 0.85,
      rotateY: 15,
      filter: "blur(4px)",
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotateY: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      rotateY: -10,
      filter: "blur(3px)",
      transition: {
        duration: 0.4,
        ease: [0.55, 0.085, 0.68, 0.53],
      },
    },
  };
}

/** Mobile uses simpler opacity+scale (no rotateY/blur for perf) */
function getMobileCardVariants(prefersReducedMotion: boolean): Variants {
  if (prefersReducedMotion) {
    return { initial: {}, animate: {}, exit: {} };
  }

  return {
    initial: { opacity: 0, scale: 0.92 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();
  const total = testimonials.length;

  const next = useCallback(
    () => setCurrent((p) => (p + 1) % total),
    [total],
  );
  const prev = useCallback(
    () => setCurrent((p) => (p - 1 + total) % total),
    [total],
  );

  /* Auto-advance — pauses when tab hidden or reduced-motion */
  useEffect(() => {
    if (prefersReducedMotion) return;

    let timer: ReturnType<typeof setInterval>;

    function start() {
      timer = setInterval(next, 5000);
    }
    function stop() {
      clearInterval(timer);
    }

    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [next, prefersReducedMotion]);

  const desktopIndices = [
    current,
    (current + 1) % total,
    (current + 2) % total,
  ];
  const tabletIndices = [current, (current + 1) % total];

  const cardVariants = getCardVariants(prefersReducedMotion);
  const mobileVariants = getMobileCardVariants(prefersReducedMotion);

  return (
    <section className="relative overflow-hidden py-24">
      {/* ---- Background layers ---- */}
      <div className="pointer-events-none absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-white to-violet-50/30 dark:from-brand-950/30 dark:via-background dark:to-violet-950/20" />

        {/* Center radial glow */}
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-200/20 blur-3xl dark:bg-brand-800/10" />

        {/* Dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Floating ambient orbs */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-brand-400/[0.08] blur-3xl dark:bg-brand-500/[0.05]"
          />
          <motion.div
            animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
            className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-violet-400/[0.08] blur-3xl dark:bg-violet-500/[0.05]"
          />
        </>
      )}

      {/* ---- Content ---- */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            Testimonials
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by{" "}
            <span className="text-gradient-landing">Creators Everywhere</span>
          </h2>
        </motion.div>

        {/* ---- Desktop: 3 cards ---- */}
        <div className="hidden lg:block">
          <div
            className="grid grid-cols-3 gap-8"
            style={{ perspective: "1200px" }}
          >
            <AnimatePresence mode="popLayout">
              {desktopIndices.map((idx, col) => {
                const t = testimonials[idx];
                const accent =
                  TESTIMONIAL_ACCENTS[idx % TESTIMONIAL_ACCENTS.length];
                return (
                  <motion.div
                    key={`desktop-${t.name}-${idx}`}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={
                      prefersReducedMotion
                        ? undefined
                        : { delay: col * 0.1 }
                    }
                    style={{ transformStyle: "preserve-3d" as const }}
                  >
                    <TestimonialCard3D
                      testimonial={t}
                      accent={accent}
                      columnIndex={col}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ---- Tablet: 2 cards ---- */}
        <div className="hidden md:block lg:hidden">
          <div
            className="grid grid-cols-2 gap-6"
            style={{ perspective: "1000px" }}
          >
            <AnimatePresence mode="popLayout">
              {tabletIndices.map((idx, col) => {
                const t = testimonials[idx];
                const accent =
                  TESTIMONIAL_ACCENTS[idx % TESTIMONIAL_ACCENTS.length];
                return (
                  <motion.div
                    key={`tablet-${t.name}-${idx}`}
                    variants={cardVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={
                      prefersReducedMotion
                        ? undefined
                        : { delay: col * 0.1 }
                    }
                    style={{ transformStyle: "preserve-3d" as const }}
                  >
                    <TestimonialCard3D
                      testimonial={t}
                      accent={accent}
                      columnIndex={col}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ---- Mobile: 1 card ---- */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`mobile-${current}`}
              variants={mobileVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <TestimonialCard3D
                testimonial={testimonials[current]}
                accent={
                  TESTIMONIAL_ACCENTS[
                    current % TESTIMONIAL_ACCENTS.length
                  ]
                }
                columnIndex={0}
                prefersReducedMotion={prefersReducedMotion}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ---- Controls ---- */}
        <div className="relative z-10 mt-10 flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={prev}>
            <ChevronLeft className="h-5 w-5" />
            <span className="sr-only">Previous</span>
          </Button>
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current
                    ? "w-6 bg-brand-600"
                    : "w-2 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={next}>
            <ChevronRight className="h-5 w-5" />
            <span className="sr-only">Next</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
