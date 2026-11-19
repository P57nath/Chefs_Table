import { cn } from "@/lib/utils";

/**
 * Original illustration: a table tent with a stylised QR code and a phone
 * scanning it, on a warm table top. Flat, 3–4 palette colours, pure SVG.
 * The QR pattern is decorative (not scannable).
 */
const QR_CELLS = ["1110111", "1010010", "1110101", "0001010", "1011101", "0100101", "1101011"];

export function TableTentIllustration({ label, className }: { label: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 320 260"
      role="img"
      aria-label={label}
      className={cn("h-auto w-full", className)}
    >
      {/* table top */}
      <ellipse cx="160" cy="226" rx="150" ry="22" fill="currentColor" opacity="0.08" />
      <rect x="20" y="206" width="280" height="14" rx="7" fill="#7A4A1E" opacity="0.55" />
      {/* tent */}
      <path d="M92 206 128 52h64l36 154Z" fill="#F4EDE4" />
      <path d="M128 52h64l36 154h-10L186 60h-52l-32 146H92Z" fill="#1C1612" opacity="0.08" />
      <rect x="128" y="74" width="64" height="64" rx="8" fill="#FFFFFF" />
      {QR_CELLS.map((row, y) =>
        [...row].map((cell, x) =>
          cell === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={133 + x * 7.7}
              y={79 + y * 7.7}
              width="7"
              height="7"
              rx="1.5"
              fill="#1C1612"
            />
          ) : null,
        ),
      )}
      <rect x="136" y="150" width="48" height="6" rx="3" fill="#C97A06" />
      <rect x="142" y="162" width="36" height="4" rx="2" fill="#1C1612" opacity="0.25" />
      {/* phone */}
      <g transform="rotate(-12 252 118)">
        <rect x="222" y="58" width="62" height="118" rx="12" fill="#17110D" />
        <rect x="227" y="66" width="52" height="98" rx="7" fill="#211913" />
        <rect
          x="236"
          y="88"
          width="34"
          height="34"
          rx="5"
          fill="none"
          stroke="#F5A524"
          strokeWidth="3"
          strokeDasharray="10 6"
        />
        <rect x="236" y="134" width="34" height="6" rx="3" fill="#F5A524" />
        <circle cx="253" cy="171" r="2.5" fill="#B9A897" />
      </g>
      {/* scan beam */}
      <path d="M196 106 230 92v40Z" fill="#F5A524" opacity="0.18" />
      {/* steam / sparkle */}
      <circle cx="70" cy="120" r="5" fill="#F5A524" opacity="0.6" />
      <circle cx="56" cy="96" r="3" fill="#E5533D" opacity="0.5" />
      <circle cx="80" cy="80" r="2.5" fill="#F5A524" opacity="0.4" />
    </svg>
  );
}
