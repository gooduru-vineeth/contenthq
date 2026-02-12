"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { MouseEvent } from "react";
import { Sparkles, MessageSquare, ImageIcon } from "lucide-react";
import { mediaStudioBullets } from "../lib/constants";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function MediaStudioShowcase() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), {
    stiffness: 200,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), {
    stiffness: 200,
    damping: 30,
  });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return (
    <section className="py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left - text */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="mb-3 inline-block rounded-full border border-cta-200 bg-cta-50 px-3 py-1 text-xs font-medium text-cta-700 dark:border-cta-800 dark:bg-cta-950/50 dark:text-cta-300">
              Media Studio
            </span>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Create with AI,{" "}
              <span className="bg-gradient-to-r from-cta-500 to-cta-600 bg-clip-text text-transparent">
                refine with conversation
              </span>
            </h2>
            <p className="mb-8 text-muted-foreground">
              Our Media Generation Studio lets you iterate with AI through
              multi-turn conversations — not just one-shot prompts.
            </p>
            <div className="space-y-5">
              {mediaStudioBullets.map((bullet) => {
                const Icon = bullet.icon;
                return (
                  <div key={bullet.title} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cta-100 to-cta-200 dark:from-cta-900/50 dark:to-cta-800/50">
                      <Icon className="h-4 w-4 text-cta-600 dark:text-cta-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{bullet.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {bullet.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right - mock UI */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={
              prefersReducedMotion
                ? undefined
                : {
                    rotateX,
                    rotateY,
                    transformPerspective: 1000,
                  }
            }
          >
            <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="ml-3 flex-1 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
                  contenthq.app/media-studio
                </div>
              </div>

              {/* Mock content */}
              <div className="grid grid-cols-2 divide-x">
                {/* Conversation panel */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    AI Conversation
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                      Generate a cinematic mountain landscape at sunset with warm
                      golden light...
                    </div>
                    <div className="rounded-lg border bg-brand-50 p-2.5 text-xs text-brand-700 dark:bg-brand-950/30 dark:text-brand-300">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="h-3 w-3" />
                        <span className="font-medium">AI</span>
                      </div>
                      Generated with DALL-E 3. Shall I adjust the lighting or
                      add atmospheric fog?
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                      Add atmospheric fog and make the sky more dramatic
                    </div>
                  </div>
                </div>
                {/* Image panel */}
                <div className="p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Generated Output
                  </div>
                  <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-cta-200 via-cta-400 to-brand-400 dark:from-cta-800 dark:via-cta-700 dark:to-brand-800 flex items-center justify-center">
                    <div className="text-center text-white/80">
                      <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                      <span className="text-xs">1024 x 1024</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>DALL-E 3</span>
                    <span>4 credits</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
