"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PipelineScene } from "./PipelineScene";

interface PipelineCanvas3DProps {
  activeStage: number;
  isPaused: boolean;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

const SCENE_WIDTH = 11; // max spread (10) + card padding
const CAMERA_FOV = 50;
const PADDING = 1.15;

function ResponsiveCamera() {
  const targetZ = useRef(10);

  useFrame((state) => {
    const { camera, size } = state;
    const aspect = size.width / size.height;
    const fovRad = THREE.MathUtils.degToRad(CAMERA_FOV);
    const requiredWidth = SCENE_WIDTH * PADDING;
    const neededZ = requiredWidth / (2 * Math.tan(fovRad / 2) * aspect);
    targetZ.current = THREE.MathUtils.clamp(neededZ, 5, 14);

    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      targetZ.current,
      0.08,
    );
    camera.updateProjectionMatrix();
  });

  return null;
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
      { threshold: 0.1 },
    );
    observer.observe(el);

    // Fallback: if observer hasn't fired within 500ms, force visible
    const fallback = setTimeout(() => {
      setIsInView(true);
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div ref={containerRef} className="h-[420px] w-full">
      {isInView && (
        <Canvas
          camera={{ position: [0, 0.3, 10], fov: CAMERA_FOV }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.5]}
          style={{ background: "transparent" }}
        >
          <ResponsiveCamera />
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
