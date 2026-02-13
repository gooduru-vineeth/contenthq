"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import type { Testimonial, TestimonialAccent } from "../lib/constants";
import { useCardTilt } from "../hooks/use-card-tilt";

/* ------------------------------------------------------------------ */
/*  Per-card idle float configs — varied timing so cards don't sync   */
/* ------------------------------------------------------------------ */

const FLOAT_CONFIGS = [
  {
    y: [0, -6, 0],
    rotateX: [0, 1.5, 0],
    rotateY: [0, -1, 0],
    duration: 6,
  },
  {
    y: [0, -8, 0],
    rotateX: [0, -1, 0],
    rotateY: [0, 1.5, 0],
    duration: 7,
  },
  {
    y: [0, -5, 0],
    rotateX: [0, 1, 0],
    rotateY: [0, 0.8, 0],
    duration: 5.5,
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface TestimonialCard3DProps {
  testimonial: Testimonial;
  accent: TestimonialAccent;
  /** Position in the visible grid (0, 1, or 2) — drives float config */
  columnIndex: number;
  /** Whether animations should be suppressed */
  prefersReducedMotion: boolean;
}

export function TestimonialCard3D({
  testimonial,
  accent,
  columnIndex,
  prefersReducedMotion,
}: TestimonialCard3DProps) {
  const tilt = useCardTilt(!prefersReducedMotion);
  const floatCfg = FLOAT_CONFIGS[columnIndex % FLOAT_CONFIGS.length];

  return (
    /* Outer layer — idle floating animation */
    <motion.div
      className="relative"
      animate={
        prefersReducedMotion
          ? undefined
          : {
              y: floatCfg.y,
              rotateX: floatCfg.rotateX,
              rotateY: floatCfg.rotateY,
            }
      }
      transition={
        prefersReducedMotion
          ? undefined
          : {
              duration: floatCfg.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: columnIndex * 0.8,
            }
      }
    >
      {/* Glow backdrop — visible on group-hover */}
      <div
        className="pointer-events-none absolute -inset-3 rounded-3xl opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 dark:group-hover/card:opacity-[0.35] blur-xl"
        style={{
          background: `radial-gradient(circle at center, rgba(${accent.glowColor}, 0.25) 0%, transparent 70%)`,
        }}
      />

      {/* Inner layer — mouse-tracking tilt + hover scale */}
      <motion.div
        className="group/card relative"
        style={
          prefersReducedMotion
            ? undefined
            : {
                rotateX: tilt.rotateX,
                rotateY: tilt.rotateY,
                transformPerspective: 800,
                transformStyle: "preserve-3d" as const,
              }
        }
        onMouseMove={tilt.handleMouseMove}
        onMouseLeave={tilt.handleMouseLeave}
        whileHover={
          prefersReducedMotion ? undefined : { scale: 1.04 }
        }
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Card shell — glassmorphism + extrusion shadows */}
        <div
          className={[
            "relative overflow-hidden rounded-2xl p-6",
            // Glassmorphism
            "bg-white/70 dark:bg-white/[0.06]",
            "backdrop-blur-xl backdrop-saturate-[1.2] dark:backdrop-saturate-[1.3]",
            "border border-white/25 dark:border-white/[0.08]",
            // GPU acceleration
            "transform-gpu [backface-visibility:hidden]",
            // Transition for hover shadow change
            "transition-[box-shadow,border-color] duration-300",
            // Extrusion shadow stack
            "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_0_0_rgba(0,0,0,0.04),0_4px_0_0_rgba(0,0,0,0.02),0_8px_24px_-4px_rgba(0,0,0,0.12),0_20px_48px_-12px_rgba(0,0,0,0.08)]",
            // Hover: deeper extrusion + glow
            "group-hover/card:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_3px_0_0_rgba(0,0,0,0.05),0_6px_0_0_rgba(0,0,0,0.03),0_12px_32px_-4px_rgba(0,0,0,0.15),0_24px_56px_-12px_rgba(0,0,0,0.1)]",
          ].join(" ")}
        >
          {/* Accent gradient bar at top */}
          <div
            className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent.accentGradient}`}
          />

          {/* Lighting overlay — simulates upper-left key light */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-black/[0.03] dark:from-white/[0.06] dark:to-black/[0.08]" />

          {/* Content — kept in normal 2D flow for crisp text */}
          <div className="relative z-10">
            {/* Star rating */}
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className={`h-4 w-4 ${accent.starColor}`} />
              ))}
            </div>

            {/* Quote */}
            <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
              &quot;{testimonial.quote}&quot;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${accent.avatarGradient} text-xs font-bold text-white`}
              >
                {testimonial.initials}
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {testimonial.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {testimonial.role}, {testimonial.company}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
