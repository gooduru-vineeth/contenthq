"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { mediaStudioBullets, mediaStudioVideos } from "../lib/constants";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { VideoCard3D } from "./VideoCard3D";

/* ------------------------------------------------------------------ */
/*  Desktop scattered-layout positions for each card                   */
/* ------------------------------------------------------------------ */

const CARD_POSITIONS: React.CSSProperties[] = [
  { top: "2%", left: "5%", width: 200, zIndex: 3 },
  { top: "5%", right: "2%", width: 190, zIndex: 2 },
  { bottom: "12%", left: "18%", width: 195, zIndex: 4 },
  { bottom: "4%", right: "10%", width: 185, zIndex: 1 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MediaStudioShowcase() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  return (
    <section id="media-studio" className="py-14 sm:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
          {/* Left - text (unchanged) */}
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="mb-3 inline-block rounded-full border border-cta-200 bg-cta-50 px-3 py-1 text-xs font-medium text-cta-700 dark:border-cta-800 dark:bg-cta-950/50 dark:text-cta-300">
              Creative Studio
            </span>
            <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl break-words">
              Create with AI,{" "}
              <span className="text-gradient-studio">
                refine with conversation
              </span>
            </h2>
            <p className="mb-5 sm:mb-8 text-muted-foreground">
              Describe what you want, and our AI creates it. Then keep chatting
              to refine every detail until it&apos;s exactly right.
            </p>
            <div className="space-y-3 sm:space-y-5">
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

          {/* Right - 3D floating video cards */}
          <div className="relative overflow-hidden">
            {/* Background gradient blobs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[400px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-200/20 blur-3xl dark:bg-brand-800/10" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-cta-200/15 blur-2xl dark:bg-cta-800/10" />
            </div>

            {/* Desktop: scattered 3D layout */}
            <div
              className="relative hidden lg:block"
              style={{ height: 480, perspective: 1200 }}
            >
              {mediaStudioVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="absolute"
                  style={{
                    ...CARD_POSITIONS[index],
                    zIndex:
                      activeCardId === video.id
                        ? 10
                        : CARD_POSITIONS[index]?.zIndex,
                  }}
                >
                  <VideoCard3D
                    video={video}
                    index={index}
                    prefersReducedMotion={prefersReducedMotion}
                    activeCardId={activeCardId}
                    onActivate={setActiveCardId}
                  />
                </div>
              ))}
            </div>

            {/* Tablet: 2x2 grid */}
            <div
              className="hidden grid-cols-2 gap-4 md:grid lg:hidden"
              style={{ perspective: 1200 }}
            >
              {mediaStudioVideos.map((video, index) => (
                <VideoCard3D
                  key={video.id}
                  video={video}
                  index={index}
                  prefersReducedMotion={prefersReducedMotion}
                  activeCardId={activeCardId}
                  onActivate={setActiveCardId}
                />
              ))}
            </div>

            {/* Mobile: horizontal scroll */}
            <div className="flex gap-4 overflow-x-auto pb-4 pl-1 snap-x snap-mandatory md:hidden">
              {mediaStudioVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="w-[75vw] max-w-[260px] shrink-0 snap-center"
                >
                  <VideoCard3D
                    video={video}
                    index={index}
                    prefersReducedMotion={prefersReducedMotion}
                    activeCardId={activeCardId}
                    onActivate={setActiveCardId}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MediaStudioShowcase;
