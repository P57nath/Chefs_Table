import type { TableState } from "@/lib/status";

/** Status colours for the 3D scene — the same hues as the dark-theme tokens (they read best lit). */
export const STATE_HEX: Record<TableState, string> = {
  free: "#8f8f8a",
  seated: "#cfcfca",
  new_order: "#e3a03c",
  confirmed: "#84a8dc",
  cooking: "#e39553",
  ready: "#5cb88a",
  eating: "#62bcae",
  bill_requested: "#a996d8",
  call_waiter: "#e0664d",
  paid: "#5cb88a",
};

/** Room materials: oak floor, limewash walls, walnut tables, steel pass. */
export const ROOM = {
  wall: "#e6dfd3",
  wallTrim: "#cfc6b8",
  baseboard: "#6b5440",
  tableTop: "#5a3d2b",
  tableEdge: "#46301f",
  metal: "#2b2a28",
  steel: "#c8c6c1",
  chair: "#7a5638",
  chairSeat: "#c9b89c",
  plate: "#f7f4ee",
  food: "#c98a2e",
  pot: "#b0704a",
  potRim: "#8f5838",
  leaf: "#4f7a4a",
  leafLight: "#6a9460",
  paper: "#fbf8f1",
  rug: ["#d8cfc0", "#c9b9a3", "#bfc4b6", "#d3c3b4"],
} as const;

const SKIN = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#a0522d", "#7b4b2a"];
/** Muted fabric colours (denim, brick, olive, linen, charcoal, plum, mustard, cream). */
const CLOTHES = [
  "#3f5a73",
  "#8a4a36",
  "#5f6b4a",
  "#c8b79a",
  "#38383c",
  "#7a5a6e",
  "#b5884a",
  "#e4ded2",
];

/** Deterministic tiny PRNG so a session's guests always look the same. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function guestLook(sessionId: string, index: number) {
  const rnd = seeded(`${sessionId}:${index}`);
  return {
    skin: SKIN[Math.floor(rnd() * SKIN.length)] ?? SKIN[0]!,
    shirt: CLOTHES[Math.floor(rnd() * CLOTHES.length)] ?? CLOTHES[0]!,
    phase: rnd() * Math.PI * 2,
  };
}

/** Lighting by Dhaka time of day: bright, neutral lunch; warm, lamp-lit evening. */
export function dayNight(nowMs: number) {
  const hour = (new Date(nowMs).getUTCHours() + 6) % 24;
  const evening = hour >= 18 || hour < 6;
  return evening
    ? {
        evening: true,
        ambient: 0.35,
        hemiSky: "#ffe7c8",
        hemiGround: "#2a2018",
        hemi: 0.55,
        sun: 0.75,
        sunColor: "#ffd9b0",
        sky: "#18171a",
      }
    : {
        evening: false,
        ambient: 0.45,
        hemiSky: "#fffaf0",
        hemiGround: "#b8a58c",
        hemi: 0.7,
        sun: 1.9,
        sunColor: "#fff6e8",
        sky: "#ecebe8",
      };
}
