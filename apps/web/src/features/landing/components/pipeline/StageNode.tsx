"use client";

import { useRef, useState } from "react";
import { Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface StageNodeProps {
  position: [number, number, number];
  color: string;
  isActive: boolean;
  isPast: boolean;
  index: number;
  onClick: () => void;
  geometry: THREE.IcosahedronGeometry;
  reducedMotion: boolean;
}

export function StageNode({
  position,
  color,
  isActive,
  isPast,
  index: _index,
  onClick,
  geometry,
  reducedMotion,
}: StageNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const targetScale = isActive ? 1.2 : isPast ? 0.8 : 0.6;
  const targetEmissiveIntensity = isActive ? 0.6 : isPast ? 0.15 : 0;
  const targetOpacity = isActive ? 1 : isPast ? 0.7 : 0.4;

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const mat = mesh.material as THREE.MeshStandardMaterial;

    // Smooth scale lerp
    const lerpFactor = 1 - Math.pow(0.001, delta);
    const s = THREE.MathUtils.lerp(mesh.scale.x, targetScale, lerpFactor);
    mesh.scale.set(s, s, s);

    // Smooth emissive and opacity
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      targetEmissiveIntensity,
      lerpFactor
    );
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, lerpFactor);

    // Gentle rotation
    if (!reducedMotion) {
      mesh.rotation.y += delta * 0.3;
      mesh.rotation.x += delta * 0.15;
    }

    // Halo pulse
    if (haloRef.current) {
      const haloMat = haloRef.current.material as THREE.MeshBasicMaterial;
      const haloTargetOpacity = isActive ? 0.15 : 0;
      haloMat.opacity = THREE.MathUtils.lerp(
        haloMat.opacity,
        haloTargetOpacity,
        lerpFactor
      );
      const haloScale = isActive
        ? 1.8 + Math.sin(Date.now() * 0.003) * 0.15
        : 1.5;
      haloRef.current.scale.setScalar(
        THREE.MathUtils.lerp(haloRef.current.scale.x, haloScale, lerpFactor)
      );
    }
  });

  const threeColor = new THREE.Color(color);

  return (
    <Float
      speed={reducedMotion ? 0 : 1.5}
      rotationIntensity={reducedMotion ? 0 : 0.3}
      floatIntensity={reducedMotion ? 0 : 0.5}
    >
      <group position={position}>
        {/* Halo glow sphere */}
        <mesh ref={haloRef}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={threeColor}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>

        {/* Main icosahedron */}
        <mesh
          ref={meshRef}
          geometry={geometry}
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
          scale={targetScale}
        >
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={targetEmissiveIntensity}
            transparent
            opacity={targetOpacity}
            roughness={0.3}
            metalness={0.2}
            toneMapped={false}
          />
        </mesh>

        {/* Hover highlight ring */}
        {hovered && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.3, 1.45, 32]} />
            <meshBasicMaterial
              color={threeColor}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </Float>
  );
}
