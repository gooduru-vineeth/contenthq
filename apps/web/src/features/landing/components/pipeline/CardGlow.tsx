"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CardGlowProps {
  color: string;
  intensity: number;
  width?: number;
  height?: number;
}

export function CardGlow({
  color,
  intensity,
  width = 2.4,
  height = 1.6,
}: CardGlowProps) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const targetOpacity = intensity * 0.3;

  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame((_state, delta) => {
    if (!matRef.current) return;
    const lerpFactor = 1 - Math.pow(0.001, delta);
    matRef.current.opacity = THREE.MathUtils.lerp(
      matRef.current.opacity,
      targetOpacity,
      lerpFactor
    );
  });

  if (intensity < 0.01) return null;

  return (
    <mesh position={[0, 0, -0.15]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
