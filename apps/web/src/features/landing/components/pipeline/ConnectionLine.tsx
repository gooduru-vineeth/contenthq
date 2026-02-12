"use client";

import { useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  isCompleted: boolean;
  reducedMotion: boolean;
}

export function ConnectionLine({
  start,
  end,
  isCompleted,
  reducedMotion,
}: ConnectionLineProps) {
  const dotRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!dotRef.current || !isCompleted || reducedMotion) return;
    // Traveling dot: loop along the line
    const t = ((Date.now() * 0.0005) % 1);
    dotRef.current.position.set(
      THREE.MathUtils.lerp(start[0], end[0], t),
      THREE.MathUtils.lerp(start[1], end[1], t),
      THREE.MathUtils.lerp(start[2], end[2], t)
    );
  });

  const color = isCompleted ? "#1A2CA3" : "#4B5563";
  const opacity = isCompleted ? 0.6 : 0.15;

  return (
    <group>
      <Line
        points={[start, end]}
        color={color}
        lineWidth={2}
        transparent
        opacity={opacity}
      />
      {isCompleted && !reducedMotion && (
        <mesh ref={dotRef} position={start}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial
            color="#4F6FE4"
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}
