# 04 — Design system

## 1. Personality
**Warm, confident, modern Bengali.** Charcoal and ember, saffron light, cream paper.
Premium means: generous spacing, few colours used with discipline, real typographic
hierarchy, buttery motion that always has a purpose, zero jank, and every state designed.

Three surfaces share one token set:
| Surface | Default theme | Density | Feel |
|---|---|---|---|
| Guest | **Dark "Ember Night"** (light "Cream" available, follows system) | Airy | Restaurant ambience, food is the hero |
| Floor / Admin | Light (dark available) | Comfortable–dense | Calm control room, status colours do the talking |
| Kitchen | Dark only, extra contrast | Huge type | Readable from 2 m, no decoration |

## 2. Colour tokens (CSS variables in `globals.css`, Tailwind v4 `@theme`)
Use OKLCH in code; hex here for reference. All text/background pairs must pass AA.

| Token | Ember Night (dark) | Cream (light) | Use |
|---|---|---|---|
| `--bg` | `#0E0A07` | `#FBF7F2` | page |
| `--surface` | `#17110D` | `#FFFFFF` | cards |
| `--surface-2` | `#211913` | `#F4EDE4` | sheets, inputs |
| `--border` | `#FFF0DC14` (8 %) | `#1C16121A` | hairlines |
| `--text` | `#F7EFE6` | `#1C1612` | primary text |
| `--text-muted` | `#B9A897` | `#6B5D50` | secondary |
| `--primary` | `#F5A524` saffron | `#C97A06` | CTAs, active chips, prices |
| `--primary-fg` | `#1A1206` | `#FFFFFF` | text on primary |
| `--accent` | `#E5533D` ember | `#C2410C` | spicy, destructive, urgent |
| `--success` | `#3FB37F` | `#15803D` | ready, paid |
| `--info` | `#5AA9F0` | `#1D4ED8` | confirmed |
| `--violet` | `#A78BFA` | `#6D28D9` | bill requested |
| `--glow` | `0 0 0 1px #F5A52433, 0 8px 32px -8px #F5A52455` | softer | focused/selected cards |

**Order/table status colours** (used identically in 3D, 2D, list, badges, KDS):
| State | Colour | Icon (lucide) |
|---|---|---|
| Free | neutral 400 | `circle-dashed` |
| Seated | neutral 200 | `users` |
| New order (placed) | primary, **pulsing** | `bell-ring` |
| Confirmed | info | `check-check` |
| In kitchen / Preparing | orange `#FB923C` | `flame` |
| Ready to serve | success, **pulsing** | `concierge-bell` |
| Served / eating | teal `#2DD4BF` | `utensils` |
| Bill requested | violet | `receipt` |
| Call waiter | accent, **pulsing fast** | `hand` |
| Paid (not closed) | success solid | `badge-check` |

## 3. Typography
| Role | Font (next/font/google) | Notes |
|---|---|---|
| Display (brand, hero, item names on guest) | **Fraunces** (variable, opsz) | 600–700, slight negative tracking |
| UI / body | **Inter** (variable) | 400/500/600; `font-feature-settings: "cv11","ss01"` |
| Numbers (prices, timers, KDS) | Inter with `tabular-nums` | never jumpy timers |
| Bangla UI | **Noto Sans Bengali** | loaded only for `bn`; line-height +10 % |
| Bangla display | **Noto Serif Bengali** | |

Scale (rem): 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 2 · 2.5 · 3.25. Guest body 16 px min;
KDS item text 28–32 px; KDS table label 48 px.

## 4. Shape, depth, spacing
- 4-pt spacing grid. Page padding 16 (phone) / 24 (tablet) / 32 (desktop).
- Radius: 12 inputs/buttons, 20 cards, 28 sheets (top corners), full for chips/pills.
- Elevation: very soft warm shadows in light mode; in dark mode use surface steps + 1 px
  inner highlight (`inset 0 1px 0 #FFFFFF0D`) rather than shadows.
- Subtle film grain overlay (2 % opacity SVG noise) on guest hero and welcome screen only.
- Glass only where it helps: sticky guest header and floating cart bar
  (`backdrop-blur-xl` + 70 % surface).

## 5. Motion (Motion for React, `motion/react`)
| Preset | Spec | Use |
|---|---|---|
| `spring.snappy` | stiffness 500, damping 30 | buttons, chips, steppers |
| `spring.sheet` | stiffness 300, damping 32 | sheets, drawers |
| `spring.soft` | stiffness 180, damping 22 | cards entering, tracker stages |
| `fade` | 160 ms ease-out | content swaps |
| Stagger | 30 ms per child, max 8 | menu sections, lists |

Signature moments: welcome reveal (logo draws in, embers drift), add-to-cart fly +
count bump, "slide to place order" with haptic tick, tracker stage transitions,
staff alert pulse, KDS ticket slide-in, payment success burst.
`prefers-reduced-motion`: replace movement with opacity, stop particles, keep state
colours. Never animate layout of long lists on low-end devices (use `layout` sparingly).

## 6. The Live Floor (staff home) — "living diorama"
Not a literal open-world game (that would hurt speed and usability), but the same
feeling: a **cozy, isometric, low-poly 3D restaurant that is alive**, original art,
built entirely from code primitives so there are no asset licences to worry about.

### 6.1 Scene (React Three Fiber v9 + drei, client-only, `next/dynamic` with `ssr:false`)
- Orthographic camera at a classic isometric angle (≈ 35° down, 45° around); drag to
  pan, pinch/scroll to zoom (clamped), double-tap to reset. Rotation limited ± 25°.
- Floor: warm wooden plank tiles (procedural stripes), soft ambient + one warm
  directional light with soft shadows (shadow map 1024, only tables/people cast).
- Room dressing (static, merged geometry): low walls on two sides, window strip on the
  Window zone, string lights over the Terrace, potted plants, a kitchen **pass counter**
  at the top edge with heat lamps, entrance mat. Zones get faint floor tints + labels.
- Tables from `floor_snapshot()` positions (`pos_x`, `pos_y`, `rotation`, `shape`,
  `seats`); chairs placed evenly around by seat count.
- **Day/night**: lighting tint follows Dhaka time (lunch: bright warm; evening: amber
  with string-light glow).

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
- drei `<Html>` badges above each table: label (T4), status chip, age timer
  (e.g. "New · 1:42"), guest count. Badges scale with zoom, never overlap the sheet.
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
When `image_path` is null: 4:3 tile with a category-specific gradient (e.g. biryani →
saffron→ember, drinks → mango→cream), the category's lucide icon centred at 40 %
opacity, subtle grain, and the item's initials in Fraunces. It must look intentional.
Real photos: `next/image` with Supabase Storage loader, `sizes` set, blur placeholder
(store a tiny base64 `blurDataURL` generated at upload time in `settings` or a column
added via new migration).

## 9. Components (shadcn/ui base, re-skinned)
Button (primary / secondary / ghost / destructive / icon; loading state keeps width),
IconButton, Chip, Badge/StatusPill, Card, Sheet (bottom on mobile, side on tablet),
Dialog (rare), Drawer, Tabs, SegmentedControl, Stepper (qty), Switch, Radio/Checkbox
cards (modifiers), Input/Textarea with counters, Toast (sonner), Skeletons per screen,
EmptyState (illustration + one action), ErrorState (retry), ConnectionBanner,
SlideToConfirm (with button fallback), MoneyText, Timer (tabular, colour thresholds),
Avatar, LanguageToggle, ThemeToggle, QR card.

## 10. Content & tone
Short, warm, human. "Your order is on its way to the kitchen." not "Order status
updated." Bangla copy written naturally (not machine-literal); keep terms people
actually use in Dhaka restaurants (e.g. "বিল", "ওয়েটার ডাকুন").
