"use client";

import { useRef, useCallback, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Play, Pause } from "lucide-react";
import { useCardTilt } from "../hooks/use-card-tilt";

interface VideoFrame3DProps {
  prefersReducedMotion: boolean;
}

const FLOAT_CONFIG = {
  y: [0, -10, 0],
  rotateX: [0, 1.5, 0],
  rotateY: [0, -1, 0],
  duration: 6,
};

export function VideoFrame3D({ prefersReducedMotion }: VideoFrame3DProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tilt = useCardTilt(!prefersReducedMotion);
  const [isPlaying, setIsPlaying] = useState(true);

  const isHovered = useMotionValue(0);
  const glowOpacity = useSpring(isHovered, { stiffness: 200, damping: 25 });
  const glowDisplay = useTransform(glowOpacity, (v) =>
    isPlaying ? 0.2 : v > 0.01 ? 0.25 * v : 0,
  );

  const handleMouseEnter = useCallback(() => {
    isHovered.set(1);
  }, [isHovered]);

  const handleMouseLeave = useCallback(() => {
    isHovered.set(0);
    tilt.handleMouseLeave();
  }, [isHovered, tilt]);

  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        togglePlayback();
      }
    },
    [togglePlayback],
  );

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Layer 1 — Entrance animation */}
      <motion.div
        className="relative"
        initial={
          prefersReducedMotion
            ? undefined
            : { opacity: 0, y: 40, scale: 0.9 }
        }
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.7,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        {/* Layer 2 — Idle floating */}
        <motion.div
          className="relative"
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  y: FLOAT_CONFIG.y,
                  rotateX: FLOAT_CONFIG.rotateX,
                  rotateY: FLOAT_CONFIG.rotateY,
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: FLOAT_CONFIG.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        >
          {/* Glow backdrop */}
          <motion.div
            className="pointer-events-none absolute -inset-4 rounded-3xl blur-2xl"
            style={{
              background:
                "linear-gradient(135deg, #2845D6, #1A2CA3, #F68048)",
              opacity: glowDisplay,
            }}
          />

          {/* Ambient reflection below */}
          <div className="pointer-events-none absolute -bottom-8 left-[10%] right-[10%] h-16 rounded-full bg-brand-500/10 blur-2xl" />

          {/* Layer 3 — Mouse-tracking tilt */}
          <motion.div
            className="group/frame relative cursor-pointer outline-none"
            role="button"
            tabIndex={0}
            aria-label={`Demo video — click to ${isPlaying ? "pause" : "play"}`}
            aria-pressed={isPlaying}
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
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={togglePlayback}
            onKeyDown={handleKeyDown}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
            animate={
              isPlaying && !prefersReducedMotion
                ? { scale: 1.01 }
                : { scale: 1 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Frame shell — glassmorphism */}
            <div
              className={[
                "relative overflow-hidden rounded-2xl",
                "bg-white/70 dark:bg-white/[0.06]",
                "backdrop-blur-xl backdrop-saturate-[1.2] dark:backdrop-saturate-[1.3]",
                "border border-white/25 dark:border-white/[0.08]",
                "transform-gpu [backface-visibility:hidden]",
                "transition-[box-shadow,border-color] duration-300",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_0_0_rgba(0,0,0,0.04),0_4px_0_0_rgba(0,0,0,0.02),0_8px_24px_-4px_rgba(0,0,0,0.12),0_20px_48px_-12px_rgba(0,0,0,0.08)]",
                "group-hover/frame:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_3px_0_0_rgba(0,0,0,0.05),0_6px_0_0_rgba(0,0,0,0.03),0_12px_32px_-4px_rgba(0,0,0,0.15),0_24px_56px_-12px_rgba(0,0,0,0.1)]",
                "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
              ].join(" ")}
            >
              {/* Top accent gradient bar */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-cta-500" />

              {/* Key-light overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-black/[0.03] dark:from-white/[0.06] dark:to-black/[0.08]" />

              {/* Video content area */}
              <div className="relative z-10 p-3">
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  {/* Fallback gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-600 to-brand-500 dark:from-brand-950 dark:via-brand-800 dark:to-brand-600" />

                  {/* Video element */}
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    playsInline
                    muted
                    loop
                    autoPlay
                    aria-hidden="true"
                  >
                    <source src="/hero-demo.mp4" type="video/mp4" />
                  </video>

                  {/* Play/Pause overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover/frame:bg-black/15">
                    <AnimatePresence mode="wait">
                      {isPlaying ? (
                        <motion.div
                          key="pause"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-md opacity-0 transition-opacity duration-300 group-hover/frame:opacity-100 dark:bg-white/20"
                        >
                          <Pause className="h-6 w-6 text-foreground" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="play"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-md dark:bg-white/20"
                        >
                          <Play className="ml-0.5 h-6 w-6 text-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom gradient fade */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
