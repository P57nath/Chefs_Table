"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { TableState } from "@/lib/status";

/** Procedural "bean" guest: capsule body, sphere head, tiny hands, blinking eyes. */
export function Guest({
  position,
  facing,
  skin,
  shirt,
  phase,
  raiseHand,
  waveFast,
  eating,
}: {
  position: [number, number, number];
  facing: number;
  skin: string;
  shirt: string;
  phase: number;
  raiseHand: boolean;
  waveFast: boolean;
  eating: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (body.current) {
      const breathe = 1 + Math.sin(t * 1.8) * 0.02;
      body.current.scale.set(1, breathe, 1);
      body.current.position.y = eating ? Math.abs(Math.sin(t * 3)) * 0.04 : 0;
    }
    if (head.current) head.current.rotation.y = Math.sin(t * 0.35) * 0.35;
    if (eyes.current) eyes.current.scale.y = Math.sin(t * 0.9) > 0.985 ? 0.1 : 1;
    if (arm.current) {
      const up = raiseHand || waveFast;
      const wave = waveFast ? Math.sin(t * 14) * 0.45 : raiseHand ? Math.sin(t * 4) * 0.2 : 0;
      arm.current.rotation.z = up ? -2.6 + wave : -0.2;
    }
  });

  return (
    <group position={position} rotation-y={facing}>
      <group ref={body}>
        <mesh position={[0, 0.55, 0]} castShadow>
          <capsuleGeometry args={[0.2, 0.35, 6, 12]} />
          <meshStandardMaterial color={shirt} roughness={0.7} />
        </mesh>
        <group ref={head} position={[0, 1.05, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.19, 20, 16]} />
            <meshStandardMaterial color={skin} roughness={0.6} />
          </mesh>
          <group ref={eyes} position={[0, 0.03, 0.17]}>
            <mesh position={[-0.06, 0, 0]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshBasicMaterial color="#1C1612" />
            </mesh>
            <mesh position={[0.06, 0, 0]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshBasicMaterial color="#1C1612" />
            </mesh>
          </group>
        </group>
        <mesh position={[-0.24, 0.55, 0.05]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <group ref={arm} position={[0.22, 0.75, 0]}>
          <mesh position={[0, -0.18, 0]}>
            <capsuleGeometry args={[0.05, 0.22, 4, 8]} />
            <meshStandardMaterial color={shirt} />
          </mesh>
          <mesh position={[0, -0.36, 0]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color={skin} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/**
 * The signed-in waiter: apron in their avatar colour. Walks (eased lerp) from the
 * kitchen pass to the selected table. Purely cosmetic.
 */
export function Waiter({
  color,
  home,
  target,
}: {
  color: string;
  home: THREE.Vector3;
  target: THREE.Vector3 | null;
}) {
  const ref = useRef<THREE.Group>(null);
  const goal = useRef(new THREE.Vector3());

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g) return;
    goal.current.copy(target ?? home);
    const dist = g.position.distanceTo(goal.current);
    if (dist > 0.02) {
      const step = Math.min(1, delta * 2.4);
      const dir = goal.current.clone().sub(g.position);
      g.rotation.y = Math.atan2(dir.x, dir.z);
      g.position.lerp(goal.current, step);
      g.position.y = Math.abs(Math.sin(clock.elapsedTime * 10)) * 0.05;
    } else {
      g.position.y = 0;
    }
  });

  return (
    <group ref={ref} position={home}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.22, 0.45, 6, 12]} />
        <meshStandardMaterial color="#1C1612" />
      </mesh>
      <mesh position={[0, 0.55, 0.16]}>
        <boxGeometry args={[0.34, 0.5, 0.06]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.17, 0]} castShadow>
        <sphereGeometry args={[0.2, 20, 16]} />
        <meshStandardMaterial color="#C68642" />
      </mesh>
    </group>
  );
}

export function animationFor(state: TableState) {
  return {
    raiseHand: state === "new_order",
    waveFast: state === "call_waiter",
    eating: state === "eating" || state === "paid",
  };
}
