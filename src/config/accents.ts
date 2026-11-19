/**
 * Brand accent presets a manager can pick in Settings. Each preset keeps
 * dark ink on the fill, the light-mode text shade on cream and the
 * dark-mode fill on near-black at ≥ 4.5:1 (WCAG AA) — a free colour picker
 * could not guarantee that. Saffron is the default from globals.css.
 */
interface AccentTokens {
  fill: string;
  text: string;
}

export const ACCENTS = [
  { key: "saffron", label: "Saffron", swatch: "#F5A524" },
  { key: "ember", label: "Ember", swatch: "#F0703F" },
  { key: "emerald", label: "Emerald", swatch: "#3CC08A" },
  { key: "lagoon", label: "Lagoon", swatch: "#4AB3E0" },
  { key: "rose", label: "Rose", swatch: "#F27996" },
  { key: "violet", label: "Violet", swatch: "#A98BF0" },
] as const;

export type AccentKey = (typeof ACCENTS)[number]["key"];

export const DEFAULT_ACCENT: AccentKey = "saffron";

const TOKENS: Record<Exclude<AccentKey, "saffron">, { light: AccentTokens; dark: AccentTokens }> = {
  ember: {
    light: { fill: "oklch(0.68 0.165 41)", text: "oklch(0.52 0.17 38)" },
    dark: { fill: "oklch(0.74 0.155 42)", text: "oklch(0.74 0.155 42)" },
  },
  emerald: {
    light: { fill: "oklch(0.72 0.15 160)", text: "oklch(0.5 0.11 160)" },
    dark: { fill: "oklch(0.76 0.15 160)", text: "oklch(0.76 0.15 160)" },
  },
  lagoon: {
    light: { fill: "oklch(0.72 0.12 225)", text: "oklch(0.5 0.11 235)" },
    dark: { fill: "oklch(0.76 0.12 225)", text: "oklch(0.76 0.12 225)" },
  },
  rose: {
    light: { fill: "oklch(0.73 0.14 8)", text: "oklch(0.52 0.17 12)" },
    dark: { fill: "oklch(0.76 0.13 8)", text: "oklch(0.76 0.13 8)" },
  },
  violet: {
    light: { fill: "oklch(0.72 0.13 298)", text: "oklch(0.5 0.17 295)" },
    dark: { fill: "oklch(0.76 0.12 298)", text: "oklch(0.76 0.12 298)" },
  },
};

/** Unknown / legacy values (e.g. a hex from the seed) fall back to the default. */
export function accentKey(value: unknown): AccentKey {
  return ACCENTS.find((a) => a.key === value)?.key ?? DEFAULT_ACCENT;
}

/**
 * CSS that re-points the primary tokens for a preset (null for the default).
 * `--primary`, `--ring`… resolve `var(--primary-fill)` on :root, so overriding
 * --primary-fill on :root is enough. `:root:not(.dark)` / `:root.dark` beat the
 * base `:root` / `.dark` rules regardless of order.
 */
export function accentCss(value: unknown): string | null {
  const key = accentKey(value);
  if (key === "saffron") return null;
  const t = TOKENS[key];
  const decl = (x: AccentTokens) => `--primary-fill:${x.fill};--primary-text:${x.text};`;
  return `:root:not(.dark){${decl(t.light)}}:root.dark{${decl(t.dark)}}`;
}
