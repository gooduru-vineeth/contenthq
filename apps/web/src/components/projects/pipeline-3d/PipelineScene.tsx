"use client";

import { useMemo } from "react";
import { ContactShadows } from "@react-three/drei";
import type { PipelineStage } from "@contenthq/shared";
import type { ConsolidatedStageWithStatus } from "./types";
import { StageNode3D } from "./StageNode3D";
import { ConnectionLine3D } from "./ConnectionLine3D";

interface PipelineSceneProps {
  stages: ConsolidatedStageWithStatus[];
  onStageSelect: (stage: PipelineStage) => void;
  reducedMotion: boolean;
}

const TOTAL_SPREAD = 10.8;
const Y_WAVE_AMPLITUDE = 0.18;

function getNodePosition(
  index: number,
  total: number,
): [number, number, number] {
  const spacing = TOTAL_SPREAD / (total - 1);
  const x = -TOTAL_SPREAD / 2 + index * spacing;
  // Gentle arc: stages form a shallow inverted parabola
  const t = index / (total - 1);
  const y = Math.sin(t * Math.PI) * Y_WAVE_AMPLITUDE;
  return [x, y, 0];
}

export function PipelineScene({
  stages,
  onStageSelect,
  reducedMotion,
}: PipelineSceneProps) {
  const positions = useMemo(
    () => stages.map((_, i) => getNodePosition(i, stages.length)),
    [stages],
  );

  return (
    <>
      {/* Three-point lighting for premium look */}
      {/* Key light — warm, from upper right */}
      <directionalLight
        position={[6, 8, 5]}
        intensity={0.9}
        color="#fff5f0"
      />
      {/* Fill light — cool, from left */}
      <directionalLight
        position={[-5, 3, 4]}
        intensity={0.4}
        color="#e0e7ff"
      />
      {/* Rim light — subtle backlight for depth */}
      <directionalLight
        position={[0, -2, -6]}
        intensity={0.2}
        color="#c7d2fe"
      />
      {/* Ambient — soft base illumination */}
      <ambientLight intensity={0.55} color="#f8fafc" />

      {/* Subtle accent point lights */}
      <pointLight
        position={[-5, 1, 2]}
        intensity={0.3}
        color="#06B6D4"
        distance={12}
        decay={2}
      />
      <pointLight
        position={[5, 1, 2]}
        intensity={0.3}
        color="#EC4899"
        distance={12}
        decay={2}
      />

      {/* Connection lines between adjacent stages */}
      {stages.map((stage, i) => {
        if (i === stages.length - 1) return null;
        return (
          <ConnectionLine3D
            key={`conn-${stage.id}`}
            start={positions[i]}
            end={positions[i + 1]}
            status={stage.status}
            nextStatus={stages[i + 1].status}
            color={stage.color}
            nextColor={stages[i + 1].color}
            reducedMotion={reducedMotion}
          />
        );
      })}

      {/* Stage nodes */}
      {stages.map((stage, i) => (
        <StageNode3D
          key={stage.id}
          stage={stage}
          index={i}
          total={stages.length}
          position={positions[i]}
          onClick={() => onStageSelect(stage.primaryStage)}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* Premium soft shadow on ground plane */}
      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.15}
        blur={3}
        far={4}
        frames={1}
      />
    </>
  );
}
