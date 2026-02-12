"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { pipelineStages } from "../../lib/constants";
import { StageNode } from "./StageNode";
import { ConnectionLine } from "./ConnectionLine";
import { FloatingParticles } from "./FloatingParticles";

interface PipelineSceneProps {
  activeStage: number;
  isPaused: boolean;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

export function PipelineScene({
  activeStage,
  isPaused,
  onSelectStage,
  reducedMotion,
}: PipelineSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const count = pipelineStages.length;
    const result: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = THREE.MathUtils.lerp(-5, 5, t);
      const y = Math.sin(t * Math.PI) * 1.8 - 0.5;
      result.push([x, y, 0]);
    }
    return result;
  }, []);
  const sharedGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);

  useFrame((state) => {
    if (!groupRef.current || reducedMotion || isPaused) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.05;
  });

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[-4, 4, 6]} intensity={0.8} color="#1A2CA3" />
      <pointLight position={[4, -2, 6]} intensity={0.6} color="#2845D6" />

      <group ref={groupRef}>
        {/* Stage nodes */}
        {pipelineStages.map((stage, i) => (
          <StageNode
            key={stage.name}
            position={positions[i]}
            color={stage.color}
            isActive={i === activeStage}
            isPast={i < activeStage}
            index={i}
            onClick={() => onSelectStage(i)}
            geometry={sharedGeometry}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Connection lines */}
        {positions.slice(0, -1).map((start, i) => (
          <ConnectionLine
            key={`line-${i}`}
            start={start}
            end={positions[i + 1]}
            isCompleted={i < activeStage}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Floating particles */}
        <FloatingParticles reducedMotion={reducedMotion} />
      </group>
    </>
  );
}
