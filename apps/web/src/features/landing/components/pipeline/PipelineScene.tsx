"use client";

import { useMemo } from "react";
import { ContactShadows } from "@react-three/drei";
import { pipelineStages } from "../../lib/constants";
import { StageNode } from "./StageNode";
import { ConnectionLine } from "./ConnectionLine";

interface PipelineSceneProps {
  activeStage: number;
  isPaused: boolean;
  onSelectStage: (index: number) => void;
  reducedMotion: boolean;
}

const TOTAL_SPREAD = 9.6;
const X_MIN = -TOTAL_SPREAD / 2;

export function PipelineScene({
  activeStage,
  isPaused: _isPaused,
  onSelectStage,
  reducedMotion,
}: PipelineSceneProps) {
  const positions = useMemo(() => {
    const count = pipelineStages.length;
    const spacing = TOTAL_SPREAD / (count - 1);
    const result: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const x = X_MIN + i * spacing;
      const y = i % 2 === 0 ? 0.06 : -0.06;
      result.push([x, y, 0]);
    }
    return result;
  }, []);

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
