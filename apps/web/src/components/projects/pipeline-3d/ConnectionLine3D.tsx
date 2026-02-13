"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { QuadraticBezierLine } from "@react-three/drei";
import * as THREE from "three";
import type { StageStatus } from "./types";

interface ConnectionLine3DProps {
  start: [number, number, number];
  end: [number, number, number];
  status: StageStatus;
  nextStatus: StageStatus;
  color: string;
  nextColor: string;
  reducedMotion: boolean;
}

function getLineConfig(
  status: StageStatus,
  nextStatus: StageStatus,
  color: string,
  _nextColor: string,
) {
  if (status === "completed" && nextStatus === "completed") {
    return { color: "#22c55e", lineWidth: 2.5, opacity: 0.45 };
  }
  if (status === "completed" && nextStatus !== "pending") {
    return { color: "#22c55e", lineWidth: 2.5, opacity: 0.55 };
  }
  if (status === "active" || nextStatus === "active") {
    return { color, lineWidth: 3, opacity: 0.7 };
  }
  return { color: "#4b5563", lineWidth: 1.5, opacity: 0.1 };
}

/* Animated particle that travels along a bezier curve */
function FlowParticle({
  start,
  mid,
  end,
  speed,
  offset,
  color,
  size,
}: {
  start: THREE.Vector3;
  mid: THREE.Vector3;
  end: THREE.Vector3;
  speed: number;
  offset: number;
  color: string;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(
    () => new THREE.QuadraticBezierCurve3(start, mid, end),
    [start, mid, end],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (((clock.getElapsedTime() * speed + offset) % 1) + 1) % 1;
    const point = curve.getPoint(t);
    ref.current.position.copy(point);

    // Fade in/out at endpoints
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    const fade = Math.sin(t * Math.PI);
    mat.opacity = fade * 0.9;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial
        color={color}
        toneMapped={false}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

/* Subtle glow trail behind the particle */
function GlowTrail({
  start,
  mid,
  end,
  speed,
  offset,
  color,
}: {
  start: THREE.Vector3;
  mid: THREE.Vector3;
  end: THREE.Vector3;
  speed: number;
  offset: number;
  color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const curve = useMemo(
    () => new THREE.QuadraticBezierCurve3(start, mid, end),
    [start, mid, end],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (((clock.getElapsedTime() * speed + offset) % 1) + 1) % 1;
    const point = curve.getPoint(t);
    ref.current.position.copy(point);
    const fade = Math.sin(t * Math.PI);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = fade * 0.25;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshBasicMaterial
        color={color}
        toneMapped={false}
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

export function ConnectionLine3D({
  start,
  end,
  status,
  nextStatus,
  color,
  nextColor,
  reducedMotion,
}: ConnectionLine3DProps) {
  const lineConfig = getLineConfig(status, nextStatus, color, nextColor);

  // Elevated midpoint creates a graceful arc
  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    Math.max(start[1], end[1]) + 0.35,
    (start[2] + end[2]) / 2,
  ];

  const showParticles =
    !reducedMotion && (status === "active" || status === "completed");
  const particleCount = status === "active" ? 3 : 1;
  const particleSpeed = status === "active" ? 0.35 : 0.2;

  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const midVec = useMemo(() => new THREE.Vector3(...midPoint), [midPoint]);
  const endVec = useMemo(() => new THREE.Vector3(...end), [end]);

  return (
    <group>
      {/* Main connection line */}
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={midPoint}
        color={lineConfig.color}
        lineWidth={lineConfig.lineWidth}
        transparent
        opacity={lineConfig.opacity}
      />

      {/* Second, wider line for glow effect on active connections */}
      {(status === "active" || nextStatus === "active") && (
        <QuadraticBezierLine
          start={start}
          end={end}
          mid={midPoint}
          color={lineConfig.color}
          lineWidth={lineConfig.lineWidth * 3}
          transparent
          opacity={lineConfig.opacity * 0.15}
        />
      )}

      {/* Flowing particles */}
      {showParticles &&
        Array.from({ length: particleCount }).map((_, i) => (
          <group key={i}>
            <FlowParticle
              start={startVec}
              mid={midVec}
              end={endVec}
              speed={particleSpeed}
              offset={i * (1 / particleCount)}
              color={lineConfig.color}
              size={0.028}
            />
            <GlowTrail
              start={startVec}
              mid={midVec}
              end={endVec}
              speed={particleSpeed}
              offset={i * (1 / particleCount)}
              color={lineConfig.color}
            />
          </group>
        ))}
    </group>
  );
}
