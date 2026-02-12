"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testimonials } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

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

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, prefersReducedMotion]);

  // Visible indices: current and next 2 (desktop shows 3)
  const visibleIndices = [
    current,
    (current + 1) % total,
    (current + 2) % total,
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
            Testimonials
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by{" "}
            <span className="text-gradient-landing">Content Creators</span>
          </h2>
        </motion.div>

        {/* Desktop - 3 visible cards */}
        <div className="hidden md:block">
          <div className="grid grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {visibleIndices.map((idx) => {
                const t = testimonials[idx];
                return (
                  <motion.div
                    key={`${t.name}-${idx}`}
                    initial={
                      prefersReducedMotion
                        ? undefined
                        : { opacity: 0, x: 50 }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-xl border bg-card p-6 shadow-sm"
                  >
                    <div className="mb-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className="h-4 w-4 fill-cta-400 text-cta-400"
                        />
                      ))}
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      &quot;{t.quote}&quot;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-bold text-white">
                        {t.initials}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{t.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.role}, {t.company}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile - 1 card */}
        <div className="md:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={
                prefersReducedMotion ? undefined : { opacity: 0, x: 40 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-cta-400 text-cta-400"
                  />
                ))}
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                &quot;{testimonials[current].quote}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-bold text-white">
                  {testimonials[current].initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {testimonials[current].name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {testimonials[current].role},{" "}
                    {testimonials[current].company}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
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
