"use client";

import { useCallback } from "react";
import type { MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import type { AIProvider } from "../lib/constants";

interface Provider3DCardProps {
  provider: AIProvider;
  index: number;
  prefersReducedMotion: boolean;
}

const CARD_SHADOW =
  "inset 0 1px 0 0 rgba(255,255,255,0.15), 0 1px 0 0 rgba(0,0,0,0.02), 0 2px 0 0 rgba(0,0,0,0.02), 0 3px 0 0 rgba(0,0,0,0.01), 0 4px 0 0 rgba(0,0,0,0.01), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 40px -8px rgba(0,0,0,0.06)";

const CARD_SHADOW_HOVER =
  "inset 0 1px 0 0 rgba(255,255,255,0.2), 0 1px 0 0 rgba(0,0,0,0.02), 0 2px 0 0 rgba(0,0,0,0.02), 0 3px 0 0 rgba(0,0,0,0.01), 0 4px 0 0 rgba(0,0,0,0.01), 0 12px 32px -4px rgba(0,0,0,0.12), 0 24px 56px -12px rgba(0,0,0,0.1)";

export function Provider3DCard({
  provider,
  index,
  prefersReducedMotion,
}: Provider3DCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const isHovered = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-150, 150], [12, -12]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mouseX, [-150, 150], [-12, 12]), {
    stiffness: 300,
    damping: 30,
  });

  const glowOpacity = useSpring(isHovered, { stiffness: 200, damping: 25 });
  const glowDisplay = useTransform(glowOpacity, (v) => (v > 0.01 ? 0.18 * v : 0));

  const shadowValue = useTransform(isHovered, (v) =>
    v > 0.5 ? CARD_SHADOW_HOVER : CARD_SHADOW,
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion) return;
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left - rect.width / 2);
      mouseY.set(e.clientY - rect.top - rect.height / 2);
    },
    [prefersReducedMotion, mouseX, mouseY],
  );

  const handleMouseEnter = useCallback(() => {
    isHovered.set(1);
  }, [isHovered]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
    isHovered.set(0);
  }, [mouseX, mouseY, isHovered]);

  const floatAmplitude = 8 + (index % 3);

  return (
    <motion.div
      className="group relative"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={
        prefersReducedMotion ? undefined : { opacity: 0, y: 30, scale: 0.9 }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5, ease: "easeOut" }}
    >
      {/* Glow layer */}
      <motion.div
        className="pointer-events-none absolute -inset-3 rounded-3xl blur-xl"
        style={{
          background: provider.accentColor,
          opacity: glowDisplay,
        }}
      />

      {/* Card body */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformPerspective: 800,
          transformStyle: "preserve-3d",
          boxShadow: shadowValue,
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : {
                y: [0, -floatAmplitude, 0],
              }
        }
        transition={{
          y: {
            duration: provider.floatDuration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: provider.floatDelay,
          },
        }}
        whileHover={
          prefersReducedMotion
            ? undefined
            : { scale: 1.03, transition: { duration: 0.3, ease: "easeOut" } }
        }
      >
        {/* Accent gradient bar */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-2xl"
          style={{
            background: `linear-gradient(90deg, ${provider.accentColor}, ${provider.accentColor}88)`,
          }}
        />

        {/* Hover gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(135deg, ${provider.accentColor}12, transparent)`,
          }}
        />

        {/* Content with parallax depth */}
        <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
          {/* Icon box */}
          <div
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
            style={{
              background: `linear-gradient(135deg, ${provider.accentColor}, ${provider.accentColor}CC)`,
            }}
          >
            {provider.abbreviation}
          </div>

          {/* Provider name */}
          <h4 className="text-sm font-semibold">{provider.name}</h4>

          {/* Description */}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {provider.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
