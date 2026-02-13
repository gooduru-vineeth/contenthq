"use client";

import {
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import type { MouseEvent } from "react";

const SPRING_CONFIG = { stiffness: 200, damping: 30 };
const TILT_RANGE = 10; // degrees max rotation

export function useCardTilt(enabled: boolean) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [TILT_RANGE, -TILT_RANGE]),
    SPRING_CONFIG,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-TILT_RANGE, TILT_RANGE]),
    SPRING_CONFIG,
  );

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!enabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  return { rotateX, rotateY, handleMouseMove, handleMouseLeave } as const;
}
