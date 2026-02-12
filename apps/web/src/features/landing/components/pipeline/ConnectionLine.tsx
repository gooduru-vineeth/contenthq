"use client";

import { useRef } from "react";
import { QuadraticBezierLine } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  isCompleted: boolean;
  isActive: boolean;
  color: string;
  reducedMotion: boolean;
}

export function ConnectionLine({
  start,
  end,
  isCompleted,
  isActive,
  color,
  reducedMotion,
}: ConnectionLineProps) {
  const sphere1Ref = useRef<THREE.Mesh>(null);
  const sphere2Ref = useRef<THREE.Mesh>(null);
  const glow1Ref = useRef<THREE.Mesh>(null);
  const glow2Ref = useRef<THREE.Mesh>(null);

  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2 + 0.25,
    (start[2] + end[2]) / 2,
  ];

  const lineColor = isCompleted || isActive ? color : "#4B5563";
  const lineWidth = isCompleted ? 2.5 : 1.5;
  const opacity = isActive ? 0.7 : isCompleted ? 0.5 : 0.1;

  const getPointOnBezier = (t: number): [number, number, number] => {
    const t1 = 1 - t;
    return [
      t1 * t1 * start[0] + 2 * t1 * t * mid[0] + t * t * end[0],
      t1 * t1 * start[1] + 2 * t1 * t * mid[1] + t * t * end[1],
      t1 * t1 * start[2] + 2 * t1 * t * mid[2] + t * t * end[2],
    ];
  };

  useFrame(() => {
    if (reducedMotion || (!isCompleted && !isActive)) return;

    const t1 = (Date.now() * 0.0004) % 1;
    const p1 = getPointOnBezier(t1);

    if (sphere1Ref.current) {
      sphere1Ref.current.position.set(p1[0], p1[1], p1[2]);
    }
    if (glow1Ref.current) {
      glow1Ref.current.position.set(p1[0], p1[1], p1[2]);
    }

    if (isActive && sphere2Ref.current && glow2Ref.current) {
      const t2 = (Date.now() * 0.0004 + 0.5) % 1;
      const p2 = getPointOnBezier(t2);
      sphere2Ref.current.position.set(p2[0], p2[1], p2[2]);
      glow2Ref.current.position.set(p2[0], p2[1], p2[2]);
    }
  });

  const sphereRadius = isActive ? 0.06 : 0.04;
  const glowRadius = isActive ? 0.14 : 0.1;
  const showSpheres = (isCompleted || isActive) && !reducedMotion;

  return (
    <group>
      <QuadraticBezierLine
        start={start}
        end={end}
        mid={mid}
        lineWidth={lineWidth}
        color={lineColor}
        transparent
        opacity={opacity}
      />
      {showSpheres && (
        <>
          <mesh ref={sphere1Ref}>
            <sphereGeometry args={[sphereRadius, 8, 8]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
          <mesh ref={glow1Ref}>
            <sphereGeometry args={[glowRadius, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.15}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {isActive && (
            <>
              <mesh ref={sphere2Ref}>
                <sphereGeometry args={[sphereRadius, 8, 8]} />
                <meshBasicMaterial color={color} toneMapped={false} />
              </mesh>
              <mesh ref={glow2Ref}>
                <sphereGeometry args={[glowRadius, 8, 8]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.15}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </>
          )}
        </>
      )}
    </group>
  );
}
