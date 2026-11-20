"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { Bounds } from "../layout-geometry";

import { ROOM } from "./palette";

const WALL_H = 1.5;

/**
 * Procedural oak planks (drawn once to a canvas — no image assets): staggered
 * boards with hairline seams and a faint grain, so the floor reads as wood up
 * close and as one calm tone from afar.
 */
function usePlankTexture(width: number, depth: number) {
  return useMemo(() => {
    const size = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const tones = ["#b98f63", "#b38a5f", "#bd9468", "#ae865b", "#b68d61", "#c09a6d"];
    const rows = 12;
    const rowH = size / rows;
    ctx.fillStyle = "#9a7b5b";
    ctx.fillRect(0, 0, size, size);
    for (let r = 0; r < rows; r++) {
      let x = -((r * 173) % 320);
      while (x < size) {
        const len = 260 + ((r * 97 + Math.abs(x) * 7) % 220);
        const tone = tones[(r * 5 + Math.abs(Math.floor(x / 13))) % tones.length]!;
        ctx.fillStyle = tone;
        ctx.fillRect(x + 1, r * rowH + 1, len - 2, rowH - 2);
        // grain: a few faint lines along the board
        ctx.strokeStyle = "rgba(90, 60, 35, 0.08)";
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          const y = r * rowH + 6 + ((g * 37 + r * 11 + Math.abs(x)) % (rowH - 12));
          ctx.beginPath();
          ctx.moveTo(x + 4, y);
          ctx.bezierCurveTo(x + len * 0.3, y + 2, x + len * 0.6, y - 2, x + len - 4, y + 1);
          ctx.stroke();
        }
        x += len;
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(width / 4, depth / 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [width, depth]);
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.24, 0.18, 0.44, 20]} />
        <meshStandardMaterial color={ROOM.pot} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.03, 20]} />
        <meshStandardMaterial color={ROOM.potRim} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <icosahedronGeometry args={[0.36, 1]} />
        <meshStandardMaterial color={ROOM.leaf} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.12, 1.02, 0.06]} castShadow>
        <icosahedronGeometry args={[0.22, 1]} />
        <meshStandardMaterial color={ROOM.leafLight} roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

/**
 * The dining room: oak floor, limewashed back and side walls with a window
 * band and trim, the kitchen pass (steel top, hanging heat lamps, a ticket rail
 * with one docket per open order), plants and the entrance mat.
 */
export function Room({
  bounds,
  cooking,
  readyPlates,
  openTickets,
  evening,
}: {
  bounds: Bounds;
  cooking: boolean;
  readyPlates: number;
  /** Orders waiting or in the kitchen — drawn as slips on the ticket rail. */
  openTickets: number;
  evening: boolean;
}) {
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxY - bounds.minY;
  const cx = bounds.minX + w / 2;
  const cz = bounds.minY + d / 2;
  const planks = usePlankTexture(w, d);
  const steam = useRef<THREE.Group>(null);
  const passW = Math.min(w * 0.6, 9);
  const tickets = Math.min(openTickets, 8);

  useFrame(({ clock }) => {
    if (!steam.current || !cooking) return;
    steam.current.children.forEach((c, i) => {
      const t = (clock.elapsedTime * 0.5 + i * 0.33) % 1;
      c.position.y = 1.25 + t * 0.8;
      c.scale.setScalar(0.7 + t * 0.6);
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      m.opacity = 0.35 * (1 - t);
    });
  });

  const windows = Math.max(2, Math.floor(w / 3.2));
  const sideWindows = Math.max(2, Math.floor(d / 3.2));

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0, cz]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={planks} roughness={0.78} />
      </mesh>

      {/* back wall (kitchen side) with a window band */}
      <group position={[cx, 0, bounds.minY - 0.1]}>
        <mesh position={[0, WALL_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.2, WALL_H, 0.2]} />
          <meshStandardMaterial color={ROOM.wall} roughness={0.95} />
        </mesh>
        <mesh position={[0, WALL_H + 0.03, 0]}>
          <boxGeometry args={[w + 0.3, 0.06, 0.28]} />
          <meshStandardMaterial color={ROOM.wallTrim} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.06, 0.11]}>
          <boxGeometry args={[w + 0.2, 0.12, 0.03]} />
          <meshStandardMaterial color={ROOM.baseboard} roughness={0.7} />
        </mesh>
      </group>

      {/* side wall with windows */}
      <group position={[bounds.minX - 0.1, 0, cz]}>
        <mesh position={[0, WALL_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, WALL_H, d]} />
          <meshStandardMaterial color={ROOM.wall} roughness={0.95} />
        </mesh>
        <mesh position={[0, WALL_H + 0.03, 0]}>
          <boxGeometry args={[0.28, 0.06, d + 0.1]} />
          <meshStandardMaterial color={ROOM.wallTrim} roughness={0.8} />
        </mesh>
        <mesh position={[0.11, 0.06, 0]}>
          <boxGeometry args={[0.03, 0.12, d]} />
          <meshStandardMaterial color={ROOM.baseboard} roughness={0.7} />
        </mesh>
        {Array.from({ length: sideWindows }, (_, i) => (
          <mesh
            key={i}
            position={[0.105, 0.95, -d / 2 + ((i + 0.5) * d) / sideWindows]}
            rotation-y={Math.PI / 2}
          >
            <planeGeometry args={[1.3, 0.62]} />
            <meshStandardMaterial
              color={evening ? "#1f2a3a" : "#cfdbe3"}
              emissive={evening ? "#0b1220" : "#dfe8ee"}
              emissiveIntensity={evening ? 0.2 : 0.25}
              roughness={0.15}
              metalness={0.1}
            />
          </mesh>
        ))}
      </group>
      {/* back-wall windows either side of the pass */}
      {Array.from({ length: windows }, (_, i) => {
        const x = bounds.minX + ((i + 0.5) * w) / windows;
        if (Math.abs(x - cx) < passW / 2 + 0.6) return null;
        return (
          <mesh key={i} position={[x, 0.95, bounds.minY + 0.005]}>
            <planeGeometry args={[1.3, 0.62]} />
            <meshStandardMaterial
              color={evening ? "#1f2a3a" : "#cfdbe3"}
              emissive={evening ? "#0b1220" : "#dfe8ee"}
              emissiveIntensity={evening ? 0.2 : 0.25}
              roughness={0.15}
            />
          </mesh>
        );
      })}

      {/* kitchen pass */}
      <group position={[cx, 0, bounds.minY + 0.55]}>
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[passW, 1, 0.7]} />
          <meshStandardMaterial color={ROOM.metal} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.025, 0]} castShadow receiveShadow>
          <boxGeometry args={[passW + 0.1, 0.05, 0.8]} />
          <meshStandardMaterial color={ROOM.steel} metalness={0.7} roughness={0.28} />
        </mesh>
        {/* heat lamps on cords */}
        {[-passW / 3, 0, passW / 3].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 2.35, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.9, 6]} />
              <meshStandardMaterial color={ROOM.metal} />
            </mesh>
            <mesh position={[0, 1.85, 0]} castShadow>
              <coneGeometry args={[0.2, 0.18, 24, 1, true]} />
              <meshStandardMaterial color={ROOM.metal} side={THREE.DoubleSide} roughness={0.4} />
            </mesh>
            <mesh position={[0, 1.78, 0]}>
              <sphereGeometry args={[0.07, 12, 8]} />
              <meshStandardMaterial
                color="#ffd9a0"
                emissive="#ff9d3c"
                emissiveIntensity={cooking ? 1.6 : 0.35}
              />
            </mesh>
          </group>
        ))}
        {/* ticket rail with one slip per open order */}
        <mesh position={[0, 1.42, -0.32]}>
          <boxGeometry args={[passW * 0.8, 0.04, 0.04]} />
          <meshStandardMaterial color={ROOM.steel} metalness={0.7} roughness={0.3} />
        </mesh>
        {Array.from({ length: tickets }, (_, i) => (
          <mesh
            key={i}
            position={[-passW * 0.36 + i * 0.32, 1.27, -0.3]}
            rotation-z={((i % 3) - 1) * 0.04}
          >
            <planeGeometry args={[0.2, 0.28]} />
            <meshStandardMaterial color={ROOM.paper} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        ))}
        {/* plates waiting on the pass */}
        {Array.from({ length: Math.min(readyPlates, 6) }, (_, i) => (
          <group key={i} position={[-passW * 0.3 + i * 0.6, 1.065, 0.08]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.24, 0.2, 0.03, 32]} />
              <meshStandardMaterial color={ROOM.plate} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.05, 0]}>
              <sphereGeometry args={[0.13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={ROOM.food} roughness={0.7} />
            </mesh>
          </group>
        ))}
        <group ref={steam} visible={cooking} position={[passW / 3, 0, -0.1]}>
          {[-0.18, 0, 0.18].map((x) => (
            <mesh key={x} position={[x, 1.3, 0]}>
              <sphereGeometry args={[0.12, 12, 10]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* plants in the corners */}
      <Plant position={[bounds.minX + 0.45, 0, bounds.maxY - 0.5]} />
      <Plant position={[bounds.maxX - 0.5, 0, bounds.minY + 0.5]} scale={1.15} />
      <Plant position={[bounds.minX + 0.45, 0, bounds.minY + 0.5]} scale={0.9} />

      {/* entrance mat */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, 0.004, bounds.maxY - 0.45]} receiveShadow>
        <planeGeometry args={[1.8, 0.7]} />
        <meshStandardMaterial color="#4a3b30" roughness={1} />
      </mesh>
    </group>
  );
}
