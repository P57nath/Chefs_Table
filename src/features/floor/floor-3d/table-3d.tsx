"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type * as THREE from "three";

import { STATUS_VISUALS } from "@/lib/status";
import { localizeDigits } from "@/lib/digits";
import { formatElapsedShort } from "@/lib/time";
import { cn } from "@/lib/utils";

import { chairPositions, footprint } from "../layout-geometry";
import type { TableStatus } from "../status";
import type { FloorTable } from "../types";

import { guestLook, ROOM, STATE_HEX } from "./palette";
import { animationFor, Guest } from "./people";

interface Table3DProps {
  table: FloorTable;
  status: TableStatus;
  selected: boolean;
  focused: boolean;
  now: number | null;
  onOpen: (t: FloorTable) => void;
}

/** One table: walnut top + legs/pedestal, status ring (pulses only when live), seated guests, docket badge. */
export function Table3D({ table, status, selected, focused, now, onOpen }: Table3DProps) {
  const t = useTranslations("tableState");
  const locale = useLocale();
  const ring = useRef<THREE.Mesh>(null);
  const top = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const f = footprint(table);
  const color = status.overdue ? STATE_HEX.call_waiter : STATE_HEX[status.state];
  const pulse = status.overdue ? "fast" : STATUS_VISUALS[status.state].pulse;
  const chairs = chairPositions(table);
  const seated = table.session ? Math.min(table.session.guest_count, chairs.length) : 0;
  const anim = animationFor(status.state);

  const live = pulse !== "none";
  useFrame(({ clock }) => {
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      if (live) {
        const speed = pulse === "fast" ? 6 : 3;
        const k = (Math.sin(clock.elapsedTime * speed) + 1) / 2;
        m.opacity = 0.45 + k * 0.5;
        const s = 1 + k * 0.04;
        ring.current.scale.set(s, s, 1);
      } else {
        m.opacity = status.state === "free" ? 0.3 : 0.85;
        ring.current.scale.set(1, 1, 1);
      }
    }
    if (top.current) {
      const lift = hover || selected || focused ? 0.05 : 0;
      top.current.position.y += (lift - top.current.position.y) * 0.2;
    }
  });

  const elapsed =
    status.since && now !== null
      ? formatElapsedShort(now - new Date(status.since).getTime(), locale)
      : null;

  return (
    <group position={[table.pos_x, 0, table.pos_y]} rotation-y={(-table.rotation * Math.PI) / 180}>
      {/* status ring on the floor */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.014, 0]}>
        {f.round ? (
          <ringGeometry args={[f.hx + 0.66, f.hx + 0.74, 64]} />
        ) : (
          <ringGeometry
            args={[Math.max(f.hx, f.hz) + 0.66, Math.max(f.hx, f.hz) + 0.74, 4, 1, Math.PI / 4]}
          />
        )}
        <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} />
      </mesh>
      {/* selection outline */}
      {selected || focused ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
          {f.round ? (
            <circleGeometry args={[f.hx + 0.64, 64]} />
          ) : (
            <circleGeometry args={[Math.max(f.hx, f.hz) + 0.64, 4, Math.PI / 4]} />
          )}
          <meshBasicMaterial
            color={STATE_HEX.new_order}
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      <group
        ref={top}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(table);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        {/* walnut top with a darker edge band */}
        <mesh position={[0, 0.755, 0]} castShadow receiveShadow>
          {f.round ? (
            <cylinderGeometry args={[f.hx, f.hx, 0.05, 48]} />
          ) : (
            <boxGeometry args={[f.hx * 2, 0.05, f.hz * 2]} />
          )}
          <meshStandardMaterial color={ROOM.tableTop} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          {f.round ? (
            <cylinderGeometry args={[f.hx - 0.02, f.hx - 0.06, 0.04, 48]} />
          ) : (
            <boxGeometry args={[f.hx * 2 - 0.04, 0.04, f.hz * 2 - 0.04]} />
          )}
          <meshStandardMaterial color={ROOM.tableEdge} roughness={0.6} />
        </mesh>
        {f.round ? (
          <>
            <mesh position={[0, 0.36, 0]} castShadow>
              <cylinderGeometry args={[0.05, 0.07, 0.7, 12]} />
              <meshStandardMaterial color={ROOM.metal} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.015, 0]} receiveShadow>
              <cylinderGeometry args={[0.28, 0.3, 0.03, 32]} />
              <meshStandardMaterial color={ROOM.metal} roughness={0.5} />
            </mesh>
          </>
        ) : (
          [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz]) => (
            <mesh
              key={`${sx}${sz}`}
              position={[(sx ?? 0) * (f.hx - 0.08), 0.36, (sz ?? 0) * (f.hz - 0.08)]}
              castShadow
            >
              <boxGeometry args={[0.05, 0.7, 0.05]} />
              <meshStandardMaterial color={ROOM.tableEdge} roughness={0.6} />
            </mesh>
          ))
        )}
        {/* plates while eating / paid */}
        {anim.eating
          ? chairs.slice(0, seated).map((c, i) => (
              <group key={i} position={[c.x * 0.55, 0.79, c.z * 0.55]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.13, 0.11, 0.02, 24]} />
                  <meshStandardMaterial color={ROOM.plate} roughness={0.35} />
                </mesh>
                <mesh position={[0, 0.025, 0]}>
                  <sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                  <meshStandardMaterial color={ROOM.food} roughness={0.7} />
                </mesh>
              </group>
            ))
          : null}
      </group>
      {/* guests */}
      {table.session
        ? chairs.slice(0, seated).map((c, i) => {
            const look = guestLook(table.session!.id, i);
            return (
              <Guest
                key={i}
                position={[c.x, 0.02, c.z]}
                facing={c.angle}
                skin={look.skin}
                shirt={look.shirt}
                phase={look.phase}
                raiseHand={anim.raiseHand && i === 0}
                waveFast={anim.waveFast && i === 0}
                eating={anim.eating}
              />
            );
          })
        : null}
      {/* badge: a docket tag above the table */}
      <Html position={[0, 2.05, 0]} center zIndexRange={[20, 0]}>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onOpen(table)}
          className={cn(
            "flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs whitespace-nowrap shadow-float transition-colors",
            selected || focused ? "border-primary" : "border-border hover:border-foreground/30",
          )}
        >
          <span className="font-mono text-[0.8125rem] font-medium tabular-nums">{table.label}</span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-foreground">{t(status.state)}</span>
          </span>
          {elapsed ? <span className="font-mono text-subtle tabular-nums">{elapsed}</span> : null}
          {table.session ? (
            <span className="inline-flex items-center gap-0.5 font-mono text-subtle tabular-nums">
              <Users aria-hidden className="size-3" />
              {localizeDigits(table.session.guest_count, locale)}
            </span>
          ) : null}
        </button>
      </Html>
    </group>
  );
}
