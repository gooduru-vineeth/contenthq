"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import type { PipelineStage } from "@contenthq/shared";
import type { ConsolidatedStageWithStatus } from "./types";
import { PipelineScene } from "./PipelineScene";

interface PipelineCanvasProps {
  stages: ConsolidatedStageWithStatus[];
  onStageSelect: (stage: PipelineStage) => void;
  reducedMotion: boolean;
}

export function PipelineCanvas({
  stages,
  onStageSelect,
  reducedMotion,
}: PipelineCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      setIsVisible(entries[0]?.isIntersecting ?? false);
    },
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [handleIntersection]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: 420 }}
    >
      {/* Subtle gradient backdrop */}
      <div
        className="absolute inset-0 rounded-b-lg pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99,102,241,0.06) 0%, transparent 70%)",
        }}
      />

      <Canvas
        camera={{ position: [0, 0.2, 8.5], fov: 48 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        frameloop={isVisible ? "always" : "never"}
        style={{ background: "transparent" }}
      >
        <PipelineScene
          stages={stages}
          onStageSelect={onStageSelect}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}
