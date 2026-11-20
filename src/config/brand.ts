/**
 * Brand fallbacks only. Restaurant name, tagline, logo and accent stored in the
 * database (`restaurants` row) always win; these values are used before the
 * restaurant is loaded and on pages without restaurant context (landing, login).
 */
export const brand = {
  name: "Sultan’s Dine",
  nameBn: "সুলতান’স ডাইন",
  tagline: "Halal kacchi, ordered from your table",
  taglineBn: "হালাল কাচ্চি, টেবিলে বসেই অর্ডার",
  colors: {
    primary: "#E3A03C",
    accent: "#E0664D",
    background: "#161513",
  },
} as const;

export type Brand = typeof brand;
