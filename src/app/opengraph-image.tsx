import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";

export const alt = `${brand.name} — ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview for the landing page (only indexable route). */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: "radial-gradient(circle at 80% 20%, #3a1e0c 0%, #0E0A07 60%)",
        color: "#F6EFE6",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          background: "linear-gradient(135deg, #F7B84B, #E5533D)",
          marginBottom: 48,
        }}
      />
      <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{brand.name}</div>
      <div style={{ fontSize: 40, color: "#F5A524", marginTop: 16 }}>{brand.tagline}</div>
    </div>,
    size,
  );
}
