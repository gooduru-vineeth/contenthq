"use client";

import { useRef, useState, useMemo } from "react";
import { Float, RoundedBox, Edges } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CardGlow } from "./CardGlow";

interface StageNodeProps {
  position: [number, number, number];
  color: string;
  isActive: boolean;
  isPast: boolean;
  index: number;
  onClick: () => void;
  reducedMotion: boolean;
}

export function StageNode({
  position,
  color,
  isActive,
  isPast,
  index: _index,
  onClick,
  reducedMotion,
}: StageNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const targetScale = isActive ? 1.08 : isPast ? 1.0 : 0.95;
  const targetZ = isActive ? 0.4 : 0;
  const targetEmissiveIntensity = isActive ? 0.2 : isPast ? 0.05 : 0;
  const targetOpacity = isActive ? 1.0 : isPast ? 0.85 : 0.5;

  const colors = useMemo(() => {
    const base = new THREE.Color(color);
    base.lerp(new THREE.Color("#ffffff"), 0.7);
    const emissive = new THREE.Color(color);
    const edge = new THREE.Color(color);
    edge.lerp(new THREE.Color("#ffffff"), 0.3);
    return {
      base,
      emissive,
      edgeHex: `#${edge.getHexString()}`,
    };
  }, [color]);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const mat = mesh.material as THREE.MeshPhysicalMaterial;
    const lerpFactor = 1 - Math.pow(0.001, delta);

    const hoverBoost = hovered ? 0.02 : 0;
    const s = THREE.MathUtils.lerp(
      mesh.scale.x,
      targetScale + hoverBoost,
      lerpFactor
    );
    mesh.scale.set(s, s, s);

    mesh.position.z = THREE.MathUtils.lerp(
      mesh.position.z,
      targetZ,
      lerpFactor
    );

    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      targetEmissiveIntensity,
      lerpFactor
    );
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, lerpFactor);
  });

  const glowIntensity = isActive ? 1 : 0;

  return (
    <Float
      speed={reducedMotion ? 0 : 1.2}
      rotationIntensity={reducedMotion ? 0 : 0.08}
      floatIntensity={reducedMotion ? 0 : 0.15}
      floatingRange={[-0.03, 0.03]}
    >
      <group position={position}>
        <CardGlow color={color} intensity={glowIntensity} />

        <RoundedBox
          ref={meshRef}
          args={[1.4, 0.9, 0.08]}
          radius={0.12}
          smoothness={4}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <meshPhysicalMaterial
            color={colors.base}
            emissive={colors.emissive}
            emissiveIntensity={targetEmissiveIntensity}
            transparent
            opacity={targetOpacity}
            roughness={0.15}
            metalness={0.05}
            toneMapped={false}
          />
          <Edges color={colors.edgeHex} linewidth={1} />
        </RoundedBox>
      </group>
    </Float>
  );
}
