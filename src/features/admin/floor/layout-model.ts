/** Pure helpers for the floor layout editor (unit-tested). Units ≈ metres. */
export const GRID = 0.5;
export const MAX_POS = 60;

export interface Placement {
  x: number;
  y: number;
  rotation: number;
}

export const snap = (v: number, step = GRID) => Math.round(v / step) * step;

export function clampPos(v: number): number {
  return Math.min(MAX_POS, Math.max(0, snap(v)));
}

/** Rotation stays in 0–359. */
export function rotateBy(rotation: number, delta: number): number {
  return (((rotation + delta) % 360) + 360) % 360;
}

export function moveBy(p: Placement, dx: number, dy: number): Placement {
  return { ...p, x: clampPos(p.x + dx), y: clampPos(p.y + dy) };
}

/** Which tables differ from what is saved (only those are sent). */
export function changedPlacements(
  saved: Record<string, Placement>,
  current: Record<string, Placement>,
): ({ id: string } & Placement)[] {
  return Object.entries(current)
    .filter(([id, p]) => {
      const s = saved[id];
      return !s || s.x !== p.x || s.y !== p.y || s.rotation !== p.rotation;
    })
    .map(([id, p]) => ({ id, ...p }));
}

/** Arrow keys move by one grid step (Shift = 2 m); R / Shift+R rotate by 15°. */
export function keyToChange(
  key: string,
  shift: boolean,
): { dx: number; dy: number; dr: number } | null {
  const step = shift ? 2 : GRID;
  switch (key) {
    case "ArrowLeft":
      return { dx: -step, dy: 0, dr: 0 };
    case "ArrowRight":
      return { dx: step, dy: 0, dr: 0 };
    case "ArrowUp":
      return { dx: 0, dy: -step, dr: 0 };
    case "ArrowDown":
      return { dx: 0, dy: step, dr: 0 };
    case "r":
      return { dx: 0, dy: 0, dr: 15 };
    case "R":
      return { dx: 0, dy: 0, dr: -15 };
    default:
      return null;
  }
}
