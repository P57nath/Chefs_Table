# 04 — Design system

> **Revised 2026-11-21 (unslop pass).** The first version leaned on glows, radial colour
> washes, drifting embers, film grain, glass, gradient placeholders, heavy Fraunces and
> springy motion — the usual "AI-generated" tells. This revision keeps the product, the
> flows and the brand colour, and moves the richness into a few real moments (the food,
> the live floor, the kitchen ticket) while the chrome stays quiet.
> Credit: the audit method follows *unslop* by Damir Sokolovsky (@heydamir), CC BY 4.0.

## 1. Direction
- **Product.** QR dine-in ordering for a Dhaka restaurant: guests order from the table,
  waiters run the floor, the kitchen cooks from tickets.
- **Character.** Unhurried, exact, a little warm.
- **World.** A dining room at night — brass, clay, linen, and paper order slips on the
  kitchen's pass rail.
- **Moments.** The food on the guest menu, the live floor for staff, the ticket on the
  kitchen display. Everything around them is quiet.
- **Signature.** The **order docket**: table and order numbers set in mono like a kitchen
  slip (`T·04 · #0182`), and paper-slip surfaces with a perforated edge (`<Docket>` in
  `src/components/brand/docket.tsx`) for kitchen tickets and the landing preview. One
  detail, used where it belongs and nowhere else.

Three surfaces share one token set:
| Surface | Default theme | Neutral ramp | Density | Feel |
|---|---|---|---|---|
| Guest | Dark (light available, follows system) | Warm (linen / clay) | Airy | Food is the hero |
| Floor / Admin | Light (dark available) | Graphite (barely warm) | Comfortable–dense | Calm control room, status colours do the talking |
| Kitchen | Dark only, extra contrast | Graphite | Huge type | Readable from 2 m, no decoration |

The surface is set as `data-surface` on `<html>` by `SurfaceTheme` (pre-paint script),
so portals (sheets, dialogs, toasts) get the same ramp.

## 2. Colour tokens (CSS variables in `globals.css`, Tailwind v4 `@theme`)
One neutral ramp per surface, **three text roles**, **one accent**. All text/background
pairs pass AA (checked with a contrast script; values below are the guest ramp).

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#161513` | `#F7F4EE` | page |
| `--surface` | `#1C1A18` | `#FDFBF7` | cards |
| `--surface-2` | `#262421` | `#EFE9DF` | raised rows, inputs, active nav |
| `--hairline` | text @ 8 % | text @ 9 % | borders |
| `--text` | `#EFE9DE` | `#1F1B16` | primary text |
| `--text-muted` | `#AAA398` | `#5E554A` | secondary text (`text-muted-foreground`) |
| `--text-subtle` | `#969086` | `#6A6155` | meta, captions, icons (`text-subtle`) |
| `--primary-fill` | `#E3A03C` saffron | `#C97A06` | the one accent: primary action, selection, one key figure |
| `--primary-ink` | `#1A1206` | `#1A1206` | text on saffron |
| `--primary-text` | `#E3A03C` | `#8F5603` | saffron used as text |
| `--ember` | `#E0664D` | `#B8401F` | errors, destructive, urgent (call waiter) |

Graphite ramp (staff/kitchen): `#F7F7F6 / #FFFFFF / #F0F0EE` light, `#141414 / #1A1A1A /
#242423` dark, text `#191918 · #55554F · #64645E` and `#EDEDEB · #A3A39E · #92928D`.

Rules: no hue-to-hue gradients, no gradient text, no coloured glows or shadows, no radial
washes, no grain, no glass. Depth on dark = surface steps + hairline + `shadow-highlight`;
on light = `shadow-elevation` (tiny) and `shadow-float` (menus, floating bars) only.
Prices are set in the text colour with tabular figures; saffron is not a price colour.

**Order/table status colours** (used identically in 3D, 2D, list, badges, KDS). They live
inside the status moments only — dots, rings, the left edge of a ticket — never on chrome:
| State | Token | Icon (lucide) | Live pulse |
|---|---|---|---|
| Free | `free` | `circle-dashed` | — |
| Seated | `seated` | `users` | — |
| New order (placed) | `primary` | `bell-ring` | slow |
| Confirmed | `info` | `check-check` | — |
| In kitchen / Preparing | `cooking` | `flame` | — |
| Ready to serve | `success` | `concierge-bell` | slow |
| Served / eating | `eating` | `utensils` | — |
| Bill requested | `violet` | `receipt` | — |
| Call waiter | `ember` | `hand` | fast |
| Paid (not closed) | `success` | `badge-check` | — |

## 3. Typography
| Role | Font (next/font/google) | Notes |
|---|---|---|
| Display — guest/landing headlines and dish names only | **Fraunces** (opsz) | 400–500, never on labels, buttons or staff screens |
| Interface / body | **Instrument Sans** | 400 / 500; 600 only for rare emphasis and the KDS |
| Docket figures — table & order numbers, timers, meta | **IBM Plex Mono** | 400 / 500, `tabular-nums` |
| Bangla UI | **Noto Sans Bengali** | loaded only when used; line-height +10 % |
| Bangla display | **Noto Serif Bengali** | |

Hierarchy comes from size and colour, not weight. Sentence case everywhere — no uppercase
tracked labels, no italic for emphasis, no negative tracking under 16 px. Hero headline
40 / 56 / 64 px at weight 400 with −0.02 to −0.03 em. Guest body 16 px min; KDS item text
28 px, KDS table label 48 px mono.

## 4. Shape, depth, spacing
- 4-pt grid. Page padding 16 (phone) / 24 (tablet) / 32 (desktop).
- Radius by size: tags/keycaps 6 (`rounded-sm`), controls 10 (`rounded-lg`), cards 14
  (`rounded-2xl`), sheets/panels 20 (`rounded-3xl`). Nested radius = outer − padding.
  Pills (`rounded-full`) only for status pills, status dots and avatars.
- Sticky guest header and cart bar: solid `bar-surface` (no blur). The cart bar is an
  inverted neutral (`bg-foreground`) with the saffron icon tile as its one accent.

## 5. Motion (Motion for React, `motion/react`)
One curve, `cubic-bezier(0.22, 1, 0.36, 1)` (`EASE` in `src/lib/motion.ts`), three
durations — no springs, no overshoot:
| Preset | Duration | Use |
|---|---|---|
| `tween.quick` | 160 ms | hover, press, toggles, steppers, segmented thumbs |
| `tween.sheet` | 320 ms | sheets, bars, banners |
| `tween.enter` | 400 ms | content entering, tracker stages, tickets |
| Stagger | 40 ms, max 6 | lists |

Enter = fade + rise 6–12 px. Press = scale 0.97. Loops only on things that are live: the
status pulse on new order / ready / call waiter, the cooking scene in the tracker, steam
on the pass while something cooks, the "confirming payment" wait. No confetti, sparkles,
drifting particles or shimmer on headings. `prefers-reduced-motion`: opacity only.

## 6. The Live Floor (staff home) — "living diorama"
Not a literal open-world game (that would hurt speed and usability), but the same
feeling: a **cozy, isometric, low-poly 3D restaurant that is alive**, original art,
built entirely from code primitives so there are no asset licences to worry about.

### 6.1 Scene (React Three Fiber v9 + drei, client-only, `next/dynamic` with `ssr:false`)
- Orthographic camera at a classic isometric angle (≈ 35° down, 45° around); drag to
  pan, pinch/scroll to zoom (clamped), double-tap to reset. Rotation limited ± 25°.
- Camera zoom fits the room's projected footprint (floor + wall height) to the canvas,
  so the room fills the frame. The 3D view is `100dvh − 10rem` tall (min 520 px) and has
  a full-screen toggle (Esc exits).
- Floor: procedural oak planks (1024² canvas texture, staggered boards, hairline seams,
  faint grain). Lights: ambient + hemisphere + one directional sun with PCF-soft shadows
  (2048 map, fitted to the room).
- Room dressing: limewashed back and side walls with trim, baseboard and window bands, a
  kitchen **pass** (steel top, hanging heat lamps on cords, a ticket rail with one paper
  slip per open order, plates waiting), potted plants, entrance mat. Each zone sits on a
  neutral woven rug with a quiet label — no colour tints.
- Furniture: walnut tables (top + edge band; four legs or a pedestal), chairs with seat,
  backrest and four legs (three instanced meshes for the whole room).
- Tables from `floor_snapshot()` positions (`pos_x`, `pos_y`, `rotation`, `shape`,
  `seats`); chairs placed evenly around by seat count.
- **Day/night**: lighting follows Dhaka time (lunch: bright, neutral; evening: warm,
  lower sun, lamp-lit pass).

### 6.2 People (procedural "bean" characters, no external models)
- Guest: capsule body + sphere head + tiny hands, palette seeded from session id
  (skin tones, clothing colours). Number seated = `guest_count` (cap at seats).
- Idle loop: breathing scale (±2 %), occasional head turn, blink (eye dots scale).
- **New order**: one guest raises a hand, a speech bubble pops above the table with
  the item count; table ring glows primary and pulses.
- **Call waiter**: hand waves faster, red ring, "!" bubble.
- **Cooking**: a small steam/flame particle puff floats above the kitchen pass;
  table shows a flame chip with timer.
- **Ready**: a plate model appears on the pass with a bell "ding" sparkle; table ring
  green pulse.
- **Served / eating**: plates on the table, guests do a gentle "eating" bob.
- **Bill requested**: floating receipt card above the table, violet ring.
- **Paid**: green check badge; tap "Close table" → guests stand and fade out, chairs
  tuck in, table returns to Free.
- **Waiter avatar**: when the logged-in waiter taps a table, their avatar (apron, colour
  = `staff_members.avatar_color`) walks along a simple path (lerp with easing) from
  the pass to that table. Purely cosmetic, never blocks interaction.

### 6.3 Overlays and interaction
- drei `<Html>` docket tags above each table: mono label (T4), status dot + label, mono
  age timer, guest count. The floor ring is a thin flat ring in the status colour; it
  pulses (opacity, ≤ 4 % scale) only for live states.
- Tap/click table (or its badge) → selects (outline + camera eases slightly toward it)
  and opens the Table sheet. Hover on desktop: lift + cursor pointer.
- Keyboard: Tab cycles tables in label order, Enter opens; announced via a visually
  hidden live region ("Table 4, new order, 3 items, 1 minute ago").

### 6.4 Performance rules
- `dpr={[1, 2]}`, `<PerformanceMonitor>` → lower dpr, then disable shadows, then switch
  to 2D if still < 30 fps. `<AdaptiveDpr>` while panning.
- Instanced meshes for chairs and plants; geometry/materials memoised and shared.
- `frameloop="always"` only while something animates; otherwise `"demand"` with
  `invalidate()` on data change (battery!).
- Whole 3D bundle loaded only on `/staff` floor route; never on guest pages.
- Hard limit: 60 fps on a mid-range Android tablet with 12 tables.

### 6.5 2D map and List (same data, same colours)
- **2D**: SVG top-down plan, tables as shapes with status ring, seat dots, badges,
  Motion pulses. Also used in Admin floor editor (drag to position, snap to 0.5 grid).
- **List**: sortable cards grouped by priority (Call waiter, New, Ready, Bill, Cooking,
  Eating, Seated, Free). Best for phones.

### 6.6 Optional upgrade
Swap the procedural meshes for CC0 low-poly assets (e.g. Kenney furniture/character
packs, licence CC0) as GLB files in `public/models`, keeping the same component API.
Only CC0/owned assets. Never copy characters or styles from commercial games.

## 7. Guest tracker illustration
An **original** SVG scene (flat, warm, 3–4 colours from the palette): kitchen window,
a round friendly chef with a tall hat, stove, pan, bell, plate. Each stage animates a
few parts with Motion (pan shake + steam for cooking, bell swing for ready, plate slide
for served). Built as components so stages crossfade.

## 8. Menu image placeholder
When `image_path` is null: a 4:3 tile on `surface-2` showing an empty plate from above
(two hairline circles) with the category's line icon in the well, in the subtle text
colour. Deliberately quiet, so real food photos stay the richest thing on the screen.
Real photos: `next/image` with Supabase Storage loader, `sizes` set, blur placeholder
(store a tiny base64 `blurDataURL` generated at upload time in `settings` or a column
added via new migration).

## 9. Components (shadcn/ui base, re-skinned)
Button (primary / secondary / ghost / destructive / icon; loading state keeps width),
IconButton, Chip, Badge/StatusPill, Card, Sheet (bottom on mobile, side on tablet),
Dialog (rare), Drawer, Tabs, SegmentedControl, Stepper (qty), Switch, Radio/Checkbox
cards (modifiers), Input/Textarea with counters, Toast (sonner), Skeletons per screen,
EmptyState (line icon on a raised tile + one action), ErrorState (retry), ConnectionBanner,
SlideToConfirm (with button fallback), MoneyText, Timer (tabular, colour thresholds),
Avatar, LanguageToggle, ThemeToggle, QR card.

## 10. Content & tone
Short, warm, human. No exclamation marks, no hype words, no trailing periods on headlines,
labels and buttons. "Your order is on its way to the kitchen." not "Order status
updated." Bangla copy written naturally (not machine-literal); keep terms people
actually use in Dhaka restaurants (e.g. "বিল", "ওয়েটার ডাকুন").
