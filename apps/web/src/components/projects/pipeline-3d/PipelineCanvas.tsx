"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PipelineStage } from "@contenthq/shared";
import type { ConsolidatedStageWithStatus } from "./types";
import { PipelineScene } from "./PipelineScene";

interface PipelineCanvasProps {
  stages: ConsolidatedStageWithStatus[];
  onStageSelect: (stage: PipelineStage) => void;
  reducedMotion: boolean;
}

const SCENE_WIDTH = 12.2; // max spread (12) + card-width padding
const CAMERA_FOV = 48;
const PADDING = 1.15;

function ResponsiveCamera() {
  const targetZ = useRef(8.5);

  useFrame((state) => {
    const { camera, size } = state;
    const aspect = size.width / size.height;
    const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV);
    const requiredWidth = SCENE_WIDTH * PADDING;
    const neededZ = requiredWidth / (2 * Math.tan(fovRad / 2) * aspect);
    targetZ.current = THREE.MathUtils.clamp(neededZ, 5, 12);

    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      targetZ.current,
      0.08,
    );
    camera.updateProjectionMatrix();
  });

  return null;
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

    // Fallback: if observer hasn't fired within 500ms, force visible
    const fallback = setTimeout(() => {
      setIsVisible(true);
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
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

      {isVisible && (
        <Canvas
          camera={{ position: [0, 0.2, 8.5], fov: CAMERA_FOV }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
          }}
          dpr={[1, 1.5]}
          style={{ background: "transparent" }}
        >
          <ResponsiveCamera />
          <PipelineScene
            stages={stages}
            onStageSelect={onStageSelect}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      )}
    </div>
  );
}
