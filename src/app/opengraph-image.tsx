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
        background: "#161513",
        color: "#efe9de",
      }}
    >
      <svg width="96" height="96" viewBox="0 0 24 24" style={{ marginBottom: 48 }}>
        <path
          fill="#e3a03c"
          fillRule="evenodd"
          d="M12 2.5c.9 3 4.9 5 4.9 9.6A4.9 4.9 0 0 1 12 17c-2.9 0-4.9-2.1-4.9-4.7 0-2.3 1.4-3.5 2.4-4.7.3 1.6 1 2.4 1.9 2.8-.5-3 .2-5.6.6-7.9Zm0 9.2c.8 1.1 1.9 1.8 1.9 3.4a1.9 1.9 0 0 1-3.8 0c0-1 .5-1.6 1-2.1.1.6.4.9.7 1-.1-.9 0-1.6.2-2.3Z"
        />
        <rect x="6.5" y="19.25" width="11" height="1.5" rx="0.75" fill="#e3a03c" />
      </svg>
      <div style={{ fontSize: 88, fontWeight: 500, letterSpacing: -2 }}>{brand.name}</div>
      <div style={{ fontSize: 40, color: "#aaa398", marginTop: 16 }}>{brand.tagline}</div>
    </div>,
    size,
  );
}
