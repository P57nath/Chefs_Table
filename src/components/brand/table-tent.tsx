import { cn } from "@/lib/utils";

/**
 * Original illustration: a table tent with a stylised QR code and a phone
 * reading it, on a table edge. Flat, drawn from the theme tokens (so it
 * follows light/dark), pure SVG. The QR pattern is decorative (not scannable).
 */
const QR_CELLS = ["1110111", "1010010", "1110101", "0001010", "1011101", "0100101", "1101011"];

export function TableTentIllustration({ label, className }: { label: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 240"
      role="img"
      aria-label={label}
      className={cn("h-auto w-full", className)}
    >
      {/* table edge */}
      <rect x="0" y="206" width="320" height="2" className="fill-foreground/15" />
      <ellipse cx="160" cy="210" rx="120" ry="8" className="fill-foreground/5" />
      {/* tent */}
      <path d="M96 206 130 40h60l34 166Z" className="fill-surface-2 stroke-foreground/15" />
      <path d="M190 40h0l34 166h-10L186 48Z" className="fill-foreground/5" />
      <rect x="130" y="62" width="60" height="60" rx="6" className="fill-surface" />
      {QR_CELLS.map((row, y) =>
        [...row].map((cell, x) =>
          cell === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={134.5 + x * 7.4}
              y={66.5 + y * 7.4}
              width="6.4"
              height="6.4"
              rx="1"
              className="fill-foreground"
            />
          ) : null,
        ),
      )}
      <rect x="138" y="134" width="44" height="5" rx="2.5" className="fill-primary" />
      <rect x="144" y="146" width="32" height="3" rx="1.5" className="fill-foreground/25" />
      <rect x="148" y="156" width="24" height="3" rx="1.5" className="fill-foreground/15" />
      {/* phone */}
      <g transform="rotate(-8 262 126)">
        <rect x="232" y="64" width="58" height="112" rx="11" fill="#1a1918" />
        <rect x="236.5" y="71" width="49" height="98" rx="7" fill="#262421" />
        <path
          d="M246 92v-6h6M270 86h6v6M276 112v6h-6M252 118h-6v-6"
          fill="none"
          stroke="#e3a03c"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="246" y="132" width="30" height="5" rx="2.5" fill="#e3a03c" />
        <rect x="250" y="143" width="22" height="3" rx="1.5" fill="#efe9de" opacity="0.3" />
      </g>
    </svg>
  );
}
