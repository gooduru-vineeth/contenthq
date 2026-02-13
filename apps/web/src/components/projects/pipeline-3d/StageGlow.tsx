"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { StageStatus } from "./types";

interface StageGlowProps {
  color: string;
  status: StageStatus;
  reducedMotion: boolean;
}

function createGlowTexture(color: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Multi-stop gradient for smoother falloff
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, color + "cc");
  gradient.addColorStop(0.2, color + "80");
  gradient.addColorStop(0.5, color + "33");
  gradient.addColorStop(0.75, color + "11");
  gradient.addColorStop(1, color + "00");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function StageGlow({
  color,
  status,
  reducedMotion,
}: StageGlowProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  const glowColor = status === "failed" ? "#ef4444" : color;

  const texture = useMemo(() => createGlowTexture(glowColor), [glowColor]);
  const innerTexture = useMemo(
    () => createGlowTexture(glowColor),
    [glowColor],
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    const time = clock.getElapsedTime();

    if (status === "active" && !reducedMotion) {
      // Smooth breathing pulse
      const pulse = Math.sin(time * 1.8) * 0.1 + 0.28;
      material.opacity = pulse;

      // Inner glow pulsing slightly faster
      if (innerRef.current) {
        const innerMat = innerRef.current
          .material as THREE.MeshBasicMaterial;
        innerMat.opacity = Math.sin(time * 2.2 + 0.5) * 0.06 + 0.18;
      }
    } else if (status === "active" || status === "failed") {
      material.opacity = 0.2;
      if (innerRef.current) {
        const innerMat = innerRef.current
          .material as THREE.MeshBasicMaterial;
        innerMat.opacity = 0.12;
      }
    } else if (status === "completed") {
      material.opacity = 0.06;
      if (innerRef.current) {
        const innerMat = innerRef.current
          .material as THREE.MeshBasicMaterial;
        innerMat.opacity = 0.03;
      }
    } else {
      material.opacity = 0;
      if (innerRef.current) {
        const innerMat = innerRef.current
          .material as THREE.MeshBasicMaterial;
        innerMat.opacity = 0;
      }
    }
  });

  if (status === "pending") return null;

  return (
    <group>
      {/* Outer glow — large, soft */}
      <mesh ref={meshRef} position={[0, 0, -0.18]}>
        <planeGeometry args={[2.8, 2.0]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.2}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Inner glow — smaller, brighter */}
      <mesh ref={innerRef} position={[0, 0, -0.12]}>
        <planeGeometry args={[1.8, 1.2]} />
        <meshBasicMaterial
          map={innerTexture}
          transparent
          opacity={0.15}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
