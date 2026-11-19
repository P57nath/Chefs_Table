import type { TableState } from "@/lib/status";

/** Status colours for the 3D scene (same hues as the design tokens, dark variants read best lit). */
export const STATE_HEX: Record<TableState, string> = {
  free: "#A3A3A3",
  seated: "#D6D3D1",
  new_order: "#F5A524",
  confirmed: "#5AA9F0",
  cooking: "#FB923C",
  ready: "#3FB37F",
  eating: "#2DD4BF",
  bill_requested: "#A78BFA",
  call_waiter: "#E5533D",
  paid: "#3FB37F",
};

const SKIN = ["#8D5524", "#C68642", "#E0AC69", "#F1C27D", "#A0522D", "#7B4B2A"];
const CLOTHES = [
  "#E5533D",
  "#5AA9F0",
  "#3FB37F",
  "#A78BFA",
  "#F5A524",
  "#2DD4BF",
  "#F472B6",
  "#94A3B8",
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

/** Lighting by Dhaka time of day: bright lunch, amber evening. */
export function dayNight(nowMs: number) {
  const hour = (new Date(nowMs).getUTCHours() + 6) % 24;
  const evening = hour >= 18 || hour < 6;
  return evening
    ? { ambient: 0.55, sun: 0.9, sunColor: "#FFB76B", sky: "#2A1B10", strings: true }
    : { ambient: 0.85, sun: 1.6, sunColor: "#FFF4E0", sky: "#F4E7D5", strings: false };
}
