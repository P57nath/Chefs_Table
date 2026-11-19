"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import type { Stage } from "./tracker-model";

/**
 * Original illustrated kitchen (flat SVG, palette tokens). A round friendly chef,
 * stove + pan, bell and plate on the pass. Each stage animates a few parts;
 * stage-specific props crossfade. Reduced motion → static illustration.
 */
export function StageScene({ stage, label }: { stage: Stage; label: string }) {
  const reduce = useReducedMotion();
  const loop = (duration: number) =>
    reduce ? { duration: 0 } : { duration, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <svg viewBox="0 0 360 220" role="img" aria-label={label} className="h-auto w-full">
      {/* wall + window */}
      <rect x="0" y="0" width="360" height="220" rx="24" className="fill-surface-2" />
      <rect
        x="24"
        y="22"
        width="312"
        height="128"
        rx="16"
        className="fill-background"
        opacity="0.7"
      />
      <path d="M24 60h312" className="stroke-border" strokeWidth="2" />
      {/* pass counter */}
      <rect x="12" y="160" width="336" height="18" rx="9" fill="#7A4A1E" opacity="0.75" />
      <rect x="12" y="176" width="336" height="44" className="fill-surface" />

      {/* stove */}
      <rect x="196" y="132" width="96" height="30" rx="8" fill="#2A2019" />
      {/* flames */}
      <AnimatePresence>
        {stage === "cooking" ? (
          <m.g key="flames" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[214, 238, 262].map((x, i) => (
              <m.path
                key={x}
                d={`M${x} 132c-4-6 0-12 4-16 0 6 6 8 6 14a5 5 0 0 1-10 2Z`}
                fill="#F5A524"
                style={{ originX: `${x + 4}px`, originY: "132px" }}
                animate={reduce ? undefined : { scaleY: [1, 1.25, 0.9, 1] }}
                transition={{ ...loop(0.6), delay: i * 0.12 }}
              />
            ))}
          </m.g>
        ) : null}
      </AnimatePresence>

      {/* pan */}
      <m.g
        animate={
          stage === "cooking" && !reduce
            ? { rotate: [0, -4, 3, 0], x: [0, -2, 2, 0] }
            : { rotate: 0, x: 0 }
        }
        transition={loop(0.9)}
        style={{ originX: "244px", originY: "118px" }}
      >
        <ellipse cx="244" cy="118" rx="34" ry="9" fill="#17110D" />
        <rect x="276" y="114" width="40" height="6" rx="3" fill="#17110D" />
        <ellipse
          cx="244"
          cy="115"
          rx="26"
          ry="5"
          fill="#E5533D"
          opacity={stage === "cooking" ? 0.9 : 0.4}
        />
      </m.g>

      {/* steam */}
      <AnimatePresence>
        {stage === "cooking" ? (
          <m.g key="steam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {[228, 246, 264].map((x, i) => (
              <m.path
                key={x}
                d={`M${x} 104c-6-8 6-14 0-22s6-14 0-22`}
                fill="none"
                className="stroke-muted-foreground"
                strokeWidth="3"
                strokeLinecap="round"
                animate={reduce ? { opacity: 0.5 } : { y: [6, -10], opacity: [0, 0.7, 0] }}
                transition={{ ...loop(1.8), delay: i * 0.4 }}
              />
            ))}
          </m.g>
        ) : null}
      </AnimatePresence>

      {/* chef */}
      <g>
        <ellipse cx="108" cy="160" rx="44" ry="40" fill="#FBF7F2" />
        <rect x="88" y="128" width="40" height="34" rx="10" fill="#F4EDE4" />
        <circle cx="97" cy="140" r="2.5" fill="#E5533D" />
        <circle cx="97" cy="152" r="2.5" fill="#E5533D" />
        <m.g
          animate={stage === "confirmed" && !reduce ? { rotate: [0, 10, 0, 10, 0] } : { rotate: 0 }}
          transition={
            reduce ? { duration: 0 } : { duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }
          }
          style={{ originX: "108px", originY: "122px" }}
        >
          <circle cx="108" cy="98" r="26" fill="#E8B07A" />
          {/* hat */}
          <rect x="88" y="62" width="40" height="16" rx="4" fill="#FFFFFF" />
          <circle cx="94" cy="56" r="11" fill="#FFFFFF" />
          <circle cx="108" cy="50" r="13" fill="#FFFFFF" />
          <circle cx="122" cy="56" r="11" fill="#FFFFFF" />
          {/* face */}
          <circle cx="99" cy="98" r="2.6" fill="#1C1612" />
          <circle cx="117" cy="98" r="2.6" fill="#1C1612" />
          <path
            d="M100 108q8 7 16 0"
            fill="none"
            stroke="#1C1612"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="94" cy="106" r="3.5" fill="#E5533D" opacity="0.35" />
          <circle cx="122" cy="106" r="3.5" fill="#E5533D" opacity="0.35" />
        </m.g>
      </g>

      {/* bell */}
      <m.g
        animate={stage === "ready" && !reduce ? { rotate: [0, -16, 14, -10, 6, 0] } : { rotate: 0 }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.9, repeat: Infinity, repeatDelay: 1.4 }
        }
        style={{ originX: "318px", originY: "142px" }}
      >
        <path d="M302 160a16 16 0 0 1 32 0Z" fill="#F5A524" />
        <circle cx="318" cy="142" r="3" fill="#F5A524" />
        <rect x="298" y="158" width="40" height="4" rx="2" fill="#C97A06" />
      </m.g>

      {/* ticket (sent) */}
      <AnimatePresence>
        {stage === "sent" ? (
          <m.g
            key="ticket"
            initial={reduce ? { opacity: 1 } : { x: -60, y: 20, opacity: 0, rotate: -20 }}
            animate={
              reduce ? { opacity: 1 } : { x: 0, y: [0, -4, 0], opacity: 1, rotate: [-6, 4, -6] }
            }
            exit={{ opacity: 0, x: 40 }}
            transition={
              reduce ? { duration: 0 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
            }
            style={{ originX: "52px", originY: "110px" }}
          >
            <rect x="34" y="84" width="36" height="48" rx="4" fill="#FFFFFF" />
            {[96, 106, 116].map((y) => (
              <rect key={y} x="40" y={y} width="24" height="4" rx="2" fill="#B9A897" />
            ))}
          </m.g>
        ) : null}
      </AnimatePresence>

      {/* confirmed check */}
      <AnimatePresence>
        {stage === "confirmed" ? (
          <m.g
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ originX: "156px", originY: "64px" }}
          >
            <circle cx="156" cy="64" r="14" fill="#3FB37F" />
            <path
              d="M149 64l5 5 9-10"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </m.g>
        ) : null}
      </AnimatePresence>

      {/* plate on the pass (ready) / served */}
      <AnimatePresence>
        {stage === "ready" || stage === "served" ? (
          <m.g
            key="plate"
            initial={reduce ? { opacity: 1 } : { y: -24, opacity: 0 }}
            animate={
              stage === "served" && !reduce ? { y: [0, 30], opacity: [1, 1] } : { y: 0, opacity: 1 }
            }
            exit={{ opacity: 0 }}
            transition={
              stage === "served"
                ? { duration: 0.8, ease: "easeOut" }
                : { type: "spring", stiffness: 180, damping: 18 }
            }
          >
            <ellipse cx="260" cy="160" rx="30" ry="7" fill="#FFFFFF" />
            <path d="M240 158a20 14 0 0 1 40 0Z" fill="#C97A06" />
            <circle cx="252" cy="150" r="3" fill="#3FB37F" />
            <circle cx="266" cy="148" r="2.5" fill="#E5533D" />
          </m.g>
        ) : null}
      </AnimatePresence>

      {/* sparkles (served) */}
      <AnimatePresence>
        {stage === "served" ? (
          <m.g
            key="sparkle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[
              [232, 168],
              [290, 176],
              [262, 196],
            ].map(([x, y], i) => (
              <m.path
                key={i}
                d={`M${x} ${(y ?? 0) - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z`}
                fill="#F5A524"
                animate={reduce ? undefined : { scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }}
                transition={{ ...loop(1.6), delay: i * 0.3 }}
                style={{ originX: `${x}px`, originY: `${y}px` }}
              />
            ))}
          </m.g>
        ) : null}
      </AnimatePresence>
    </svg>
  );
}
