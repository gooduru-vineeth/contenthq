"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function ScrollProgress() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[100] h-1 origin-left"
      style={{
        scaleX,
        background:
          "linear-gradient(90deg, #6D28D9, #7C3AED, #3B82F6)",
      }}
    />
  );
}
