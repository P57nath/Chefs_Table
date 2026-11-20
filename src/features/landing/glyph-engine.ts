/**
 * Glyph handi engine (no React). A kacchi handi — brass pot, atta seal, lid and
 * the rice under it — is drawn as vectors on a tiny sampling canvas, then every
 * filled cell becomes a particle drawn as a Bengali letter from "কাচ্চি".
 * Brightness picks the letter, colour is quantised to a small palette so every
 * (colour × letter) sprite is baked once into an atlas (one drawImage per particle).
 *
 * Technique adapted from the "glyphs" effect in unslop by Damir Sokolovsky
 * (@heydamir), CC BY 4.0.
 */

export type Group = "pot" | "seal" | "lid" | "rice" | "coal";

export interface Particle {
  group: Group;
  /** Target position in CSS px (centre of the cell). */
  tx: number;
  ty: number;
  /** Pointer displacement from the resting position, and its velocity (CSS px). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Intro: where it flies in from, and its personal delay (ms). */
  sx: number;
  sy: number;
  delay: number;
  sprite: number;
  seed: number;
}

export interface Steam {
  x: number;
  y: number;
  age: number;
  life: number;
  sway: number;
  sprite: number;
}

/** From sparse to dense: brightness picks the letter. */
export const CHARS = [".", "·", ":", "া", "ি", "চ", "ক"] as const;
export const STEAM_CHARS = ["ি", "~", "়"] as const;

/** Quantised palette (brass shades, atta, rice, saffron, meat, coal, steam). */
export const PALETTE = [
  "#5a3a18",
  "#8a5a22",
  "#b07a32",
  "#d39a45",
  "#efc77a",
  "#e9d3a8",
  "#f6ecd2",
  "#e3a03c",
  "#7a3f22",
  "#3a2a20",
  "#e0664d",
  "#efe9de",
] as const;
const STEAM_COLOR = PALETTE.length - 1;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const PALETTE_RGB = PALETTE.map(hexToRgb);

function nearest(r: number, g: number, b: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < STEAM_COLOR; i++) {
    const [pr, pg, pb] = PALETTE_RGB[i]!;
    const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Draws one group in a 100 × 100 design space. */
function paint(ctx: CanvasRenderingContext2D, group: Group) {
  const brass = (x0: number, x1: number) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#efc77a");
    g.addColorStop(0.35, "#d39a45");
    g.addColorStop(0.75, "#8a5a22");
    g.addColorStop(1, "#5a3a18");
    return g;
  };
  ctx.beginPath();
  if (group === "coal") {
    ctx.fillStyle = "#3a2a20";
    ctx.ellipse(50, 92, 34, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0664d";
    for (const x of [30, 42, 55, 66]) {
      ctx.beginPath();
      ctx.arc(x, 91, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (group === "pot") {
    ctx.fillStyle = brass(10, 90);
    ctx.moveTo(26, 40);
    ctx.bezierCurveTo(6, 50, 6, 80, 26, 86);
    ctx.lineTo(74, 86);
    ctx.bezierCurveTo(94, 80, 94, 50, 74, 40);
    ctx.closePath();
    ctx.fill();
    // lip
    ctx.beginPath();
    ctx.fillStyle = brass(20, 80);
    ctx.ellipse(50, 39, 28, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // engraved band
    ctx.beginPath();
    ctx.strokeStyle = "#5a3a18";
    ctx.lineWidth = 1.6;
    ctx.moveTo(14, 62);
    ctx.bezierCurveTo(35, 67, 65, 67, 86, 62);
    ctx.stroke();
  } else if (group === "seal") {
    ctx.fillStyle = "#e9d3a8";
    ctx.ellipse(50, 35.5, 28.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (group === "lid") {
    ctx.fillStyle = brass(22, 78);
    ctx.moveTo(22, 34);
    ctx.bezierCurveTo(24, 20, 76, 20, 78, 34);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(50, 18, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // rice mound with saffron streaks, an aloo and a piece of mutton
    ctx.fillStyle = "#f6ecd2";
    ctx.moveTo(24, 38);
    ctx.bezierCurveTo(28, 22, 72, 22, 76, 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#e3a03c";
    for (const [x, y, r] of [
      [38, 31, 4],
      [55, 28, 3.4],
      [64, 33, 3],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r * 0.7, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#efc77a";
    ctx.beginPath();
    ctx.arc(46, 33, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a3f22";
    ctx.beginPath();
    ctx.ellipse(58, 34, 5, 3.2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

const GROUPS: Group[] = ["coal", "pot", "rice", "seal", "lid"];

/** Samples every group into particles for a square canvas of `size` CSS px. */
export function buildParticles(size: number, cell: number, rnd: () => number): Particle[] {
  const n = Math.floor(size / cell);
  const sample = document.createElement("canvas");
  sample.width = n;
  sample.height = n;
  const ctx = sample.getContext("2d", { willReadFrequently: true })!;
  const out: Particle[] = [];
  for (const group of GROUPS) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, n, n);
    ctx.setTransform(n / 100, 0, 0, n / 100, 0, 0);
    paint(ctx, group);
    const px = ctx.getImageData(0, 0, n, n).data;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        if (px[i + 3]! < 110) continue;
        const r = px[i]!;
        const g = px[i + 1]!;
        const b = px[i + 2]!;
        const light = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const char = Math.min(CHARS.length - 1, Math.floor(light * CHARS.length * 1.1));
        const color = nearest(r, g, b);
        const tx = (x + 0.5) * cell;
        const ty = (y + 0.5) * cell;
        const angle = rnd() * Math.PI * 2;
        const dist = size * (0.55 + rnd() * 0.5);
        out.push({
          group,
          tx,
          ty,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          sx: size / 2 + Math.cos(angle) * dist,
          sy: size / 2 + Math.sin(angle) * dist,
          delay: rnd() * 650 + (group === "lid" || group === "seal" ? 250 : 0),
          sprite: color * CHARS.length + char,
          seed: rnd(),
        });
      }
    }
  }
  return out;
}

/** Bakes every (palette colour × letter) sprite, plus steam sprites, into one atlas. */
export function buildAtlas(cell: number, dpr: number, family: string) {
  const s = Math.ceil(cell * dpr);
  const all = [...CHARS, ...STEAM_CHARS];
  const atlas = document.createElement("canvas");
  atlas.width = s * all.length;
  atlas.height = s * PALETTE.length;
  const ctx = atlas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `500 ${Math.round((cell + 2) * dpr)}px ${family}`;
  PALETTE.forEach((color, row) => {
    ctx.fillStyle = color;
    all.forEach((ch, col) => ctx.fillText(ch, col * s + s / 2, row * s + s / 2));
  });
  /** Sprite index → source rect. Body sprites use CHARS; steam uses STEAM_CHARS on the steam row. */
  const rect = (sprite: number): [number, number] => {
    const row = Math.floor(sprite / CHARS.length);
    const col = sprite % CHARS.length;
    return [col * s, row * s];
  };
  const steamRect = (i: number): [number, number] => [
    (CHARS.length + (i % STEAM_CHARS.length)) * s,
    STEAM_COLOR * s,
  ];
  return { atlas, s, rect, steamRect };
}

export const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const easeInOut = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/** Seeded PRNG so server and every reload draw the same scatter. */
export function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
