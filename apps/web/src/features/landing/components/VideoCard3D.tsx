"use client";

import { useRef, useCallback, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Play, Pause, Film } from "lucide-react";
import { useCardTilt } from "../hooks/use-card-tilt";
import type { MediaStudioVideo } from "../lib/constants";

/* ------------------------------------------------------------------ */
/*  Per-card idle float configs — varied timing to prevent sync        */
/* ------------------------------------------------------------------ */

const VIDEO_FLOAT_CONFIGS = [
  { y: [0, -7, 0], rotateX: [0, 1.2, 0], rotateY: [0, -0.8, 0], duration: 5.5, delay: 0 },
  { y: [0, -9, 0], rotateX: [0, -1, 0], rotateY: [0, 1.2, 0], duration: 6.5, delay: 0.6 },
  { y: [0, -5, 0], rotateX: [0, 0.8, 0], rotateY: [0, 0.5, 0], duration: 5, delay: 1.2 },
  { y: [0, -8, 0], rotateX: [0, -1.5, 0], rotateY: [0, -1, 0], duration: 7, delay: 0.3 },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface VideoCard3DProps {
  video: MediaStudioVideo;
  index: number;
  prefersReducedMotion: boolean;
  activeCardId: string | null;
  onActivate: (id: string | null) => void;
}

export function VideoCard3D({
  video,
  index,
  prefersReducedMotion,
  activeCardId,
  onActivate,
}: VideoCard3DProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tilt = useCardTilt(!prefersReducedMotion);
  const floatCfg = VIDEO_FLOAT_CONFIGS[index % VIDEO_FLOAT_CONFIGS.length];

  const isActive = activeCardId === video.id;
  const isHovered = useMotionValue(0);

  const glowOpacity = useSpring(isHovered, { stiffness: 200, damping: 25 });
  const glowDisplay = useTransform(glowOpacity, (v) =>
    isActive ? 0.35 : v > 0.01 ? 0.2 * v : 0,
  );

  const handleMouseEnter = useCallback(() => {
    isHovered.set(1);
  }, [isHovered]);

  const handleMouseLeave = useCallback(() => {
    isHovered.set(0);
    tilt.handleMouseLeave();
  }, [isHovered, tilt]);

  const handleClick = useCallback(() => {
    if (isActive) {
      videoRef.current?.pause();
      onActivate(null);
    } else {
      onActivate(video.id);
      if (video.videoSrc && videoRef.current) {
        videoRef.current.play().catch(() => {
          // Autoplay might be blocked
        });
      }
    }
  }, [isActive, onActivate, video.id, video.videoSrc]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  // Pause video when another card becomes active
  useEffect(() => {
    if (!isActive && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isActive]);

  return (
    /* Layer 1 — entrance animation (staggered fade-in on scroll) */
    <motion.div
      className="relative"
      initial={
        prefersReducedMotion
          ? undefined
          : { opacity: 0, y: 40, scale: 0.85 }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.12,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {/* Layer 2 — idle floating animation */}
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
                delay: floatCfg.delay,
              }
        }
      >
        {/* Glow backdrop */}
        <motion.div
          className="pointer-events-none absolute -inset-3 rounded-3xl blur-xl"
          style={{
            background: video.accentColor,
            opacity: glowDisplay,
          }}
        />

        {/* Layer 3 — mouse-tracking tilt + hover + active state */}
        <motion.div
          className="group/card relative cursor-pointer outline-none"
          role="button"
          tabIndex={0}
          aria-label={`${video.title} video card — click to ${isActive ? "pause" : "play"}`}
          aria-pressed={isActive}
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
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          animate={
            isActive && !prefersReducedMotion
              ? { scale: 1.08 }
              : { scale: 1 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Card shell — glassmorphism */}
          <div
            className={[
              "relative overflow-hidden rounded-2xl",
              "bg-white/70 dark:bg-white/[0.06]",
              "backdrop-blur-xl backdrop-saturate-[1.2] dark:backdrop-saturate-[1.3]",
              "border border-white/25 dark:border-white/[0.08]",
              "transform-gpu [backface-visibility:hidden]",
              "transition-[box-shadow,border-color] duration-300",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_0_0_rgba(0,0,0,0.04),0_4px_0_0_rgba(0,0,0,0.02),0_8px_24px_-4px_rgba(0,0,0,0.12),0_20px_48px_-12px_rgba(0,0,0,0.08)]",
              "group-hover/card:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_3px_0_0_rgba(0,0,0,0.05),0_6px_0_0_rgba(0,0,0,0.03),0_12px_32px_-4px_rgba(0,0,0,0.15),0_24px_56px_-12px_rgba(0,0,0,0.1)]",
              "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
            ].join(" ")}
          >
            {/* Accent gradient bar at top */}
            <div
              className="absolute inset-x-0 top-0 h-0.5"
              style={{
                background: `linear-gradient(90deg, ${video.accentColor}, ${video.accentColor}88)`,
              }}
            />

            {/* Key-light overlay */}
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-black/[0.03] dark:from-white/[0.06] dark:to-black/[0.08]" />

            {/* Content */}
            <div className="relative z-10 p-3">
              {/* Thumbnail area */}
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                {/* Light mode gradient */}
                <div
                  className="absolute inset-0 transition-opacity duration-300 dark:opacity-0"
                  style={{ background: video.thumbnailGradient }}
                />
                {/* Dark mode gradient */}
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100"
                  style={{ background: video.thumbnailGradientDark }}
                />

                {/* Centered icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Film className="h-8 w-8 text-white/40" />
                </div>

                {/* Video element */}
                {video.videoSrc && (
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    src={video.videoSrc}
                    playsInline
                    muted
                    loop
                    aria-hidden="true"
                  />
                )}

                {/* Play/Pause overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover/card:bg-black/20">
                  <AnimatePresence mode="wait">
                    {isActive ? (
                      <motion.div
                        key="pause"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-md dark:bg-white/20"
                      >
                        <Pause className="h-4 w-4 text-foreground" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="play"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 shadow-lg backdrop-blur-md opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 dark:bg-white/20"
                      >
                        <Play className="h-4 w-4 text-foreground ml-0.5" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Duration badge */}
                <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  {video.duration}
                </div>
              </div>

              {/* Title + description */}
              <div className="mt-2.5 px-0.5">
                <h4 className="text-xs font-semibold leading-tight">
                  {video.title}
                </h4>
                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  {video.description}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
