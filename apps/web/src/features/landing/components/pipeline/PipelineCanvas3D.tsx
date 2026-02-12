"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PipelineScene } from "./PipelineScene";

interface PipelineCanvas3DProps {
  activeStage: number;
  isPaused: boolean;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

export function PipelineCanvas3D({
  activeStage,
  isPaused,
  onSelectStage,
  reducedMotion,
}: PipelineCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-[420px] w-full">
      {isInView && (
        <Canvas
          camera={{ position: [0, 0.3, 10], fov: 50 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
          style={{ background: "transparent" }}
        >
          <PipelineScene
            activeStage={activeStage}
            isPaused={isPaused}
            onSelectStage={onSelectStage}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      )}
    </div>
  );
}
