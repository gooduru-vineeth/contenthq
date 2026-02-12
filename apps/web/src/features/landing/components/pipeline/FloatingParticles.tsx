"use client";

import { Float, Sparkles } from "@react-three/drei";

const PARTICLE_COLORS = ["#0D1A63", "#1A2CA3", "#2845D6", "#4F6FE4", "#3A5ADC", "#8199ED"];

type GeometryType = "icosahedron" | "octahedron" | "dodecahedron";

interface Particle {
  position: [number, number, number];
  scale: number;
  color: string;
  geometryType: GeometryType;
  floatSpeed: number;
  rotationIntensity: number;
}

// Deterministic particle data to avoid Math.random() in render
const PARTICLES: Particle[] = [
  { position: [-5.2, -1.8, -1.5], scale: 0.10, color: PARTICLE_COLORS[0], geometryType: "icosahedron", floatSpeed: 0.8, rotationIntensity: 0.5 },
  { position: [3.4, 2.1, -0.8], scale: 0.14, color: PARTICLE_COLORS[1], geometryType: "octahedron", floatSpeed: 1.2, rotationIntensity: 0.7 },
  { position: [-2.1, -3.0, -1.2], scale: 0.09, color: PARTICLE_COLORS[2], geometryType: "dodecahedron", floatSpeed: 1.5, rotationIntensity: 0.4 },
  { position: [5.0, 0.5, -0.6], scale: 0.16, color: PARTICLE_COLORS[3], geometryType: "icosahedron", floatSpeed: 0.6, rotationIntensity: 0.9 },
  { position: [-0.8, 3.2, -1.8], scale: 0.11, color: PARTICLE_COLORS[4], geometryType: "octahedron", floatSpeed: 1.0, rotationIntensity: 0.6 },
  { position: [1.9, -2.5, -0.4], scale: 0.18, color: PARTICLE_COLORS[5], geometryType: "dodecahedron", floatSpeed: 1.8, rotationIntensity: 0.3 },
  { position: [-4.0, 1.0, -2.0], scale: 0.08, color: PARTICLE_COLORS[0], geometryType: "icosahedron", floatSpeed: 0.7, rotationIntensity: 0.8 },
  { position: [4.3, -1.2, -1.0], scale: 0.13, color: PARTICLE_COLORS[1], geometryType: "octahedron", floatSpeed: 1.4, rotationIntensity: 0.5 },
  { position: [-3.3, -0.5, -1.6], scale: 0.15, color: PARTICLE_COLORS[2], geometryType: "dodecahedron", floatSpeed: 0.9, rotationIntensity: 0.7 },
  { position: [0.6, 2.8, -0.9], scale: 0.10, color: PARTICLE_COLORS[3], geometryType: "icosahedron", floatSpeed: 1.6, rotationIntensity: 0.4 },
  { position: [-1.5, -2.8, -2.2], scale: 0.12, color: PARTICLE_COLORS[4], geometryType: "octahedron", floatSpeed: 1.1, rotationIntensity: 0.6 },
  { position: [2.7, 1.5, -0.3], scale: 0.19, color: PARTICLE_COLORS[5], geometryType: "dodecahedron", floatSpeed: 0.5, rotationIntensity: 0.9 },
  { position: [-5.8, 2.5, -1.4], scale: 0.09, color: PARTICLE_COLORS[0], geometryType: "icosahedron", floatSpeed: 1.3, rotationIntensity: 0.5 },
  { position: [5.5, -0.8, -1.7], scale: 0.17, color: PARTICLE_COLORS[1], geometryType: "octahedron", floatSpeed: 0.8, rotationIntensity: 0.8 },
];

interface FloatingParticlesProps {
  reducedMotion: boolean;
}

export function FloatingParticles({ reducedMotion }: FloatingParticlesProps) {
  return (
    <group>
      {PARTICLES.map((p, i) => (
        <Float
          key={i}
          speed={reducedMotion ? 0 : p.floatSpeed}
          rotationIntensity={reducedMotion ? 0 : p.rotationIntensity}
          floatIntensity={reducedMotion ? 0 : 0.4}
        >
          <mesh position={p.position} scale={p.scale}>
            {p.geometryType === "icosahedron" && (
              <icosahedronGeometry args={[1, 0]} />
            )}
            {p.geometryType === "octahedron" && (
              <octahedronGeometry args={[1, 0]} />
            )}
            {p.geometryType === "dodecahedron" && (
              <dodecahedronGeometry args={[1, 0]} />
            )}
            <meshStandardMaterial
              color={p.color}
              transparent
              opacity={0.25}
              roughness={0.5}
              metalness={0.1}
            />
          </mesh>
        </Float>
      ))}

      {!reducedMotion && (
        <Sparkles
          count={40}
          scale={[14, 8, 4]}
          size={1.5}
          speed={0.3}
          color="#1A2CA3"
          opacity={0.4}
        />
      )}
    </group>
  );
}
