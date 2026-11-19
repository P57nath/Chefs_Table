import { Fraunces, Inter, Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google";

/** Display: brand, hero, guest item names. Variable font with optical sizing. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

/** UI / body / numbers (tabular-nums). */
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  inter.variable,
  notoSansBengali.variable,
  notoSerifBengali.variable,
].join(" ");
