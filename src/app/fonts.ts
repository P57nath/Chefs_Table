import {
  Fraunces,
  IBM_Plex_Mono,
  Instrument_Sans,
  Noto_Sans_Bengali,
  Noto_Serif_Bengali,
} from "next/font/google";

/** Display: large headlines and guest dish names only (400–500, never labels). */
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

/** Interface and body text. */
export const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

/** Docket figures: table and order numbers, timers, meta. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/*
 * Bangla fonts are declared everywhere but not preloaded: browsers only download
 * a webfont when text actually uses it, so English sessions never fetch them.
 */
export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-bengali",
  display: "swap",
  preload: false,
});

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  variable: "--font-noto-serif-bengali",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  fraunces.variable,
  instrumentSans.variable,
  plexMono.variable,
  notoSansBengali.variable,
  notoSerifBengali.variable,
].join(" ");
