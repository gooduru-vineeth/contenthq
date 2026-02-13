"use client";

import { motion } from "framer-motion";
import type { HowItWorksStep, StepAccent } from "../lib/constants";
import { useCardTilt } from "../hooks/use-card-tilt";

interface StepNode3DProps {
  step: HowItWorksStep;
  accent: StepAccent;
  prefersReducedMotion: boolean;
}

export function StepNode3D({
  step,
  accent,
  prefersReducedMotion,
}: StepNode3DProps) {
  const tilt = useCardTilt(!prefersReducedMotion);
  const Icon = step.icon;

  return (
    /* ---- Layer 1: Idle floating animation ---- */
    <motion.div
      className="relative"
      animate={
        prefersReducedMotion
          ? undefined
          : {
              y: accent.float.y,
              rotateX: accent.float.rotateX,
              rotateY: accent.float.rotateY,
            }
      }
      transition={
        prefersReducedMotion
          ? undefined
          : {
              duration: accent.float.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: accent.float.delay,
            }
      }
    >
      {/* Glow backdrop — visible on group-hover */}
      <div
        className="pointer-events-none absolute -inset-3 rounded-3xl opacity-0 blur-xl transition-opacity duration-500 group-hover/step:opacity-100 dark:group-hover/step:opacity-[0.3]"
        style={{
          background: `radial-gradient(circle at center, ${accent.glowColor}40 0%, transparent 70%)`,
        }}
      />

      {/* ---- Layer 2: Mouse-tracking tilt + hover scale ---- */}
      <motion.div
        className="group/step relative"
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
        whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* ---- Layer 3: Glassmorphism card shell ---- */}
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
            // Hover: deeper shadow
            "group-hover/step:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_3px_0_0_rgba(0,0,0,0.05),0_6px_0_0_rgba(0,0,0,0.03),0_12px_32px_-4px_rgba(0,0,0,0.15),0_24px_56px_-12px_rgba(0,0,0,0.1)]",
          ].join(" ")}
        >
          {/* Accent gradient bar at top */}
          <div
            className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent.accentGradient}`}
          />

          {/* Lighting overlay — simulates upper-left key light */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-black/[0.03] dark:from-white/[0.06] dark:to-black/[0.08]" />

          {/* Hover gradient overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/step:opacity-100"
            style={{
              background: `linear-gradient(135deg, ${accent.glowColor}12, transparent)`,
            }}
          />

          {/* Content — 2D text stays crisp */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* 3D Icon Node — pushed forward with translateZ for parallax */}
            <div
              className="relative mb-4"
              style={{ transform: "translateZ(20px)" }}
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${accent.iconGradient} shadow-lg`}
                style={{
                  boxShadow: `0 4px 14px -2px ${accent.glowColor}40, 0 8px 24px -4px ${accent.glowColor}20`,
                }}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              {/* Step number badge */}
              <span
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold shadow-md dark:bg-slate-800 dark:text-white"
                style={{ color: accent.glowColor }}
              >
                {step.step}
              </span>
            </div>

            {/* Title + Description — crisp 2D */}
            <h3 className="mb-2 font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
