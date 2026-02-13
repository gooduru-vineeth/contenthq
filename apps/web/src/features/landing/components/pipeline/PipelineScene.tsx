"use client";

import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { pipelineStages } from "../../lib/constants";
import { StageNode } from "./StageNode";
import { ConnectionLine } from "./ConnectionLine";

interface PipelineSceneProps {
  activeStage: number;
  isPaused: boolean;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

export function PipelineScene({
  activeStage,
  isPaused: _isPaused,
  onSelectStage,
  reducedMotion,
}: PipelineSceneProps) {
  const { viewport } = useThree();

  const totalSpread = useMemo(() => {
    const maxSpread = viewport.width - 1.4 * 2; // Leave card-width padding on each side
    return THREE.MathUtils.clamp(maxSpread, 5.5, 10);
  }, [viewport.width]);

  const positions = useMemo(() => {
    const count = pipelineStages.length;
    const spacing = totalSpread / (count - 1);
    const xMin = -totalSpread / 2;
    const result: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const x = xMin + i * spacing;
      const y = i % 2 === 0 ? 0.06 : -0.06;
      result.push([x, y, 0]);
    }
    return result;
  }, [totalSpread]);

  return (
    <>
      {/* Lighting rig */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 4, 8]} intensity={0.6} color="#ffffff" />
      <pointLight position={[-5, -2, 6]} intensity={0.3} color="#2845D6" />
      <pointLight position={[5, 1, 4]} intensity={0.25} color="#4F6FE4" />

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
          isActive={i === activeStage - 1}
          color={pipelineStages[i].color}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Soft ground shadows */}
      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.15}
        blur={2.5}
        frames={1}
      />
    </>
  );
}
