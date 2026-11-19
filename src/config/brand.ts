/**
 * Brand fallbacks only. Restaurant name, tagline, logo and accent stored in the
 * database (`restaurants` row) always win; these values are used before the
 * restaurant is loaded and on pages without restaurant context (landing, login).
 */
export const brand = {
  name: "Ember & Spice",
  nameBn: "এম্বার অ্যান্ড স্পাইস",
  tagline: "Scan, order, relax.",
  taglineBn: "স্ক্যান করুন, অর্ডার দিন, আরাম করুন।",
  colors: {
    primary: "#F5A524",
    accent: "#E5533D",
    background: "#0E0A07",
  },
} as const;

export type Brand = typeof brand;
