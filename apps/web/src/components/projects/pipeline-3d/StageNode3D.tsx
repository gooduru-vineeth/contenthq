"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Float, Html } from "@react-three/drei";
import * as THREE from "three";
import type { ConsolidatedStageWithStatus } from "./types";
import { StageGlow } from "./StageGlow";

interface StageNode3DProps {
  stage: ConsolidatedStageWithStatus;
  index: number;
  total: number;
  position: [number, number, number];
  onClick: () => void;
  reducedMotion: boolean;
}

interface StatusAnimConfig {
  opacity: number;
  emissive: number;
  zOffset: number;
  scale: number;
  floatSpeed: number;
  rotationIntensity: number;
  cardColor: string;
  clearcoat: number;
}

const STATUS_CONFIG: Record<string, StatusAnimConfig> = {
  pending: {
    opacity: 0.55,
    emissive: 0.0,
    zOffset: 0.0,
    scale: 0.92,
    floatSpeed: 0.6,
    rotationIntensity: 0.05,
    cardColor: "#2a2a3e",
    clearcoat: 0.2,
  },
  active: {
    opacity: 1.0,
    emissive: 0.35,
    zOffset: 0.65,
    scale: 1.1,
    floatSpeed: 1.2,
    rotationIntensity: 0.15,
    cardColor: "#1e1e32",
    clearcoat: 0.5,
  },
  completed: {
    opacity: 0.9,
    emissive: 0.1,
    zOffset: 0.0,
    scale: 1.0,
    floatSpeed: 0.5,
    rotationIntensity: 0.08,
    cardColor: "#1e2e28",
    clearcoat: 0.3,
  },
  failed: {
    opacity: 0.75,
    emissive: 0.2,
    zOffset: 0.1,
    scale: 0.98,
    floatSpeed: 0.0,
    rotationIntensity: 0.0,
    cardColor: "#2e1e1e",
    clearcoat: 0.15,
  },
};

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "rgba(107,114,128,0.15)",
    text: "#9ca3af",
    dot: "#6b7280",
  },
  active: {
    label: "Active",
    bg: "rgba(99,102,241,0.2)",
    text: "#a5b4fc",
    dot: "#818cf8",
  },
  completed: {
    label: "Done",
    bg: "rgba(34,197,94,0.15)",
    text: "#4ade80",
    dot: "#22c55e",
  },
  failed: {
    label: "Failed",
    bg: "rgba(239,68,68,0.15)",
    text: "#f87171",
    dot: "#ef4444",
  },
};

// Card dimensions
const CARD_W = 1.42;
const CARD_H = 0.92;
const CARD_D = 0.12;

// Top accent strip
const ACCENT_H = 0.025;

export function StageNode3D({
  stage,
  index,
  total,
  position,
  onClick,
  reducedMotion,
}: StageNode3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const cardRef = useRef<THREE.Mesh>(null);
  const accentRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const config = STATUS_CONFIG[stage.status];

  // Smooth animation refs
  const currentZ = useRef(position[2]);
  const currentScale = useRef(config.scale);
  const currentRotY = useRef(0);

  // Stagger phase per node for organic float
  const phase = useMemo(() => (index / total) * Math.PI * 2, [index, total]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !cardRef.current) return;

    const time = clock.getElapsedTime();
    const lerpFactor = 1 - Math.pow(0.0008, delta);

    // Target Z position
    const tZ =
      position[2] + config.zOffset + (stage.isSelected ? 0.25 : 0);
    currentZ.current = THREE.MathUtils.lerp(
      currentZ.current,
      tZ,
      lerpFactor,
    );
    groupRef.current.position.z = currentZ.current;

    // Target scale
    const tScale =
      config.scale + (stage.isSelected ? 0.06 : 0) + (hovered ? 0.03 : 0);
    currentScale.current = THREE.MathUtils.lerp(
      currentScale.current,
      tScale,
      lerpFactor,
    );
    groupRef.current.scale.setScalar(currentScale.current);

    // Micro-rotation: subtle tilt on Y axis
    if (!reducedMotion) {
      const tRotY = hovered
        ? Math.sin(time * 1.5 + phase) * 0.04
        : Math.sin(time * 0.5 + phase) * 0.015;
      currentRotY.current = THREE.MathUtils.lerp(
        currentRotY.current,
        tRotY,
        lerpFactor,
      );
      groupRef.current.rotation.y = currentRotY.current;

      // Subtle X rotation for depth
      groupRef.current.rotation.x =
        Math.sin(time * 0.3 + phase + 1) * 0.008;
    }

    // Failed shake
    if (stage.status === "failed" && !reducedMotion) {
      groupRef.current.position.x =
        position[0] + Math.sin(time * 12) * 0.012;
    } else {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        position[0],
        lerpFactor,
      );
    }

    // Animate card material
    const mat = cardRef.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, config.opacity, lerpFactor);
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      config.emissive + (hovered ? 0.08 : 0),
      lerpFactor,
    );

    // Animate accent strip brightness
    if (accentRef.current) {
      const accentMat = accentRef.current
        .material as THREE.MeshStandardMaterial;
      const targetBrightness =
        stage.status === "active" ? 0.6 + Math.sin(time * 2) * 0.2 : 0.4;
      accentMat.emissiveIntensity = THREE.MathUtils.lerp(
        accentMat.emissiveIntensity,
        targetBrightness,
        lerpFactor,
      );
    }
  });

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const Icon = stage.icon;
  const badge = STATUS_BADGE[stage.status];

  const floatSpeed = reducedMotion ? 0 : config.floatSpeed;
  const rotIntensity = reducedMotion ? 0 : config.rotationIntensity;

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
    >
      <Float
        speed={floatSpeed}
        rotationIntensity={rotIntensity}
        floatIntensity={reducedMotion ? 0 : 0.18}
        floatingRange={[-0.04, 0.04]}
      >
        {/* Glow halo behind card */}
        <StageGlow
          color={stage.color}
          status={stage.status}
          reducedMotion={reducedMotion}
        />

        {/* Main card body */}
        <RoundedBox
          ref={cardRef}
          args={[CARD_W, CARD_H, CARD_D]}
          radius={0.08}
          smoothness={4}
          onClick={onClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <meshPhysicalMaterial
            color={config.cardColor}
            roughness={0.25}
            metalness={0.08}
            clearcoat={config.clearcoat}
            clearcoatRoughness={0.3}
            transparent
            opacity={config.opacity}
            emissive={stage.color}
            emissiveIntensity={config.emissive}
            envMapIntensity={0.5}
          />
        </RoundedBox>

        {/* Top accent strip — colored gradient bar */}
        <mesh
          ref={accentRef}
          position={[0, CARD_H / 2 - ACCENT_H / 2 - 0.01, CARD_D / 2 + 0.001]}
        >
          <planeGeometry args={[CARD_W * 0.85, ACCENT_H]} />
          <meshStandardMaterial
            color={stage.color}
            emissive={stage.color}
            emissiveIntensity={0.4}
            toneMapped={false}
            transparent
            opacity={stage.status === "pending" ? 0.3 : 0.9}
          />
        </mesh>

        {/* Bottom subtle reflection line */}
        <mesh
          position={[
            0,
            -CARD_H / 2 + 0.015,
            CARD_D / 2 + 0.001,
          ]}
        >
          <planeGeometry args={[CARD_W * 0.6, 0.004]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.06}
            toneMapped={false}
          />
        </mesh>

        {/* HTML overlay for crisp 2D text */}
        <Html
          center
          distanceFactor={4.8}
          style={{
            pointerEvents: "none",
            userSelect: "none",
            width: "130px",
          }}
          position={[0, 0, CARD_D / 2 + 0.01]}
        >
          <div className="flex flex-col items-center gap-1.5">
            {/* Step number */}
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 36,
                height: 36,
                background:
                  stage.status === "pending"
                    ? "rgba(107,114,128,0.12)"
                    : `linear-gradient(135deg, ${stage.color}30, ${stage.colorEnd}20)`,
                border: `1.5px solid ${stage.status === "pending" ? "rgba(107,114,128,0.2)" : stage.color + "50"}`,
                boxShadow:
                  stage.status === "active"
                    ? `0 0 16px ${stage.color}40`
                    : "none",
              }}
            >
              <Icon
                style={{
                  width: 17,
                  height: 17,
                  color:
                    stage.status === "pending" ? "#6b7280" : stage.color,
                  filter:
                    stage.status === "active"
                      ? `drop-shadow(0 0 4px ${stage.color})`
                      : "none",
                }}
              />
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                textAlign: "center",
                lineHeight: 1.2,
                color:
                  stage.status === "pending" ? "#6b7280" : "#f1f5f9",
                textShadow:
                  stage.status === "pending"
                    ? "none"
                    : "0 1px 6px rgba(0,0,0,0.6)",
              }}
            >
              {stage.label}
            </span>

            {/* Status badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 10,
                background: badge.bg,
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: badge.dot,
                  boxShadow:
                    stage.status === "active"
                      ? `0 0 6px ${badge.dot}`
                      : "none",
                  animation:
                    stage.status === "active"
                      ? "pulse 2s infinite"
                      : "none",
                }}
              />
              <span
                style={{
                  fontSize: 8.5,
                  fontWeight: 500,
                  color: badge.text,
                  letterSpacing: "0.02em",
                }}
              >
                {badge.label}
              </span>
            </div>
          </div>
        </Html>
      </Float>
    </group>
  );
}
