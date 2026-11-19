# PROGRESS

Gate per phase: `pnpm gate` = typecheck · lint · format:check · check:secrets · test · db:smoke · build
(+ `pnpm e2e` from Phase 10; already runs green locally).

## Phases
| # | Phase | Status | Notes |
|---|---|---|---|
| 0 | Scaffold & tooling | ✅ done | Gate green, 43/43 DB smoke checks, e2e smoke green on 3 viewports |
| 1 | Database | ✅ done | Migrations + seed apply cleanly, types generated, 37/37 pgTAP RLS checks, demo staff seeded and can log in |
| 2 | Design system & app shell | ✅ done | Tokens (OKLCH, dark/light), fonts, i18n en/bn, providers, custom components, `/dev/ui`, landing; 57 unit tests, e2e incl. axe AA on landing (both themes, 3 viewports) |
| 3 | Guest app | ✅ done | Welcome, menu (specials, scroll-spy chips, search, veg/spice filters, sold-out live), item sheet, cart (fly-to-cart, swipe remove), idempotent place order, live tracker (illustrated stages, ETA, rounds, cancel), call waiter / request bill, closed-table + invalid-QR screens. 101 unit tests, 43 pgTAP, 33 e2e incl. axe AA on menu + tracker |
| 4 | Staff auth & orders | ✅ done | Login, proxy guard, role-checked layouts/pages, start-shift (audio unlock + wake lock), orders kanban with optimistic actions (edit lines, confirm, send, confirm & send, reject with reason, served), requests, sold-out toggle, diff-based alerts, connection banner + polling. 123 unit, 43 pgTAP, 43 e2e |
| 5 | Kitchen display | ✅ done | `/kitchen`: New · Preparing · Ready (10 min), huge-type tickets with 10/20-min timers, tap-to-tick lines, Start / Ready, all-day panel, chime + slide-in, extra-contrast dark theme; 1920×1080 and 1280×800. 126 unit, 46 e2e |
| 6 | Live floor (2D/list/3D) | ✅ done | `/staff`: 3D diorama (lazy chunk), 2D map, list; zone filter, occupancy, priority states, table sheet (requests, orders + actions, bill, idempotent cash/card-machine, close / force-close). 134 unit, 53 pgTAP, 53 e2e |
| 7 | Bill & payments | ✅ done (sandbox pending credentials) | Guest bill (itemised, split/custom amount, tiles, cash → waiter), SSLCommerz + mock gateways, init/IPN/return routes, result page polling 30 s, pending-review badge + manager approve/reject, feedback, `/api/health`. 178 unit, 80 pgTAP, 61 e2e |
| 8 | Admin | ✅ done | `/admin`: overview, menu editor (photos crop→WebP, modifiers, drag/▲▼ reorder, duplicate, archive), tables/zones + 2D layout editor with 3D preview, QR (PNG/SVG, A4 tents, rotate), staff (create, role, deactivate, reset password), orders history + timeline, payments + review + CSV, settings (brand, logo, accent presets, taxes, default language). 201 unit, 96 pgTAP, 69 e2e |
| 9 | Reports | ✅ done | `/admin` dashboard: Today / 7 / 30 days / custom (Dhaka days), KPIs with change vs previous period, revenue-by-day line, orders-by-hour columns, payment-method and top-dish ranked bars, table view per chart, report CSV. 211 unit, 101 pgTAP, 70 e2e |
| 10 | Hardening | ⏳ next | |
| 11 | Deploy | ☐ | |

## Toolchain (installed 2026-11-19)
Node 22.21 · pnpm 11.5.2 · Next 16.4.6 (Turbopack, Cache Components + Partial Prefetching on) ·
React 19.3.1 · Tailwind 4.3.5 (`@tailwindcss/turbopack` loader) · shadcn 4.23 (radix-nova, `radix-ui`) ·
TypeScript 6.0.3 · ESLint 9 · Vitest 5.1 · Playwright 1.65 · Zod 4.6 · Supabase JS 2.119 / ssr 0.12 /
CLI 3.2 · R3F 9.8 / drei 10.7 · motion 14 · next-intl 4.15 · TanStack Query 5.108.

## Decisions log
- **TypeScript 6.0.3, not 7.0.2.** Next 16.4 supports TS 7 via its CLI checker, but `typescript-eslint`
  (used by `eslint-config-next`) needs the TS JavaScript API and supports `<6.1`. Revisit when
  typescript-eslint supports TS 7.
- **ESLint 9, not 10.** `eslint-plugin-react`, `-import`, `-jsx-a11y` (inside `eslint-config-next`) don't
  declare ESLint 10 support yet.
- **Cache Components turned OFF (Phase 2).** With it on, reading the locale cookie for `<html lang>` in
  the root layout is a build error (cookies must sit behind `<Suspense>`), and almost every screen is
  per-user (guest session, staff auth). Classic dynamic rendering + `revalidateTag('menu')` matches the
  architecture doc as written.
- **Light-mode contrast fix.** Design doc's light primary `#C97A06` with white text is 3.35:1 (fails AA).
  Safer choice: saffron fills keep `#C97A06` but use dark ink `#1A1206` (5.5:1); saffron *text* on cream
  (prices, links) uses `--primary-text` `#9A5D04` (5.0:1). Dark mode unchanged. Light-mode status colours
  use slightly deeper variants of orange/teal; status pills keep text in the foreground colour.
- **Token naming**: shadcn's `--accent` is a hover surface, so the design's ember accent is `--ember`
  (`bg-ember`, `text-ember`). Status colours: `free, seated, primary, info, cooking, success, eating,
  violet, ember`.
- **Themes per surface** (`SurfaceTheme`): next-themes ignores nested providers, so each surface mounts
  its own — guest dark default (light/system selectable), staff light default, kitchen forced dark.
- **Fonts**: Fraunces + Inter + Noto Sans/Serif Bengali via `next/font`; Bengali fonts not preloaded.
  Noto Sans Bengali is also a fallback in the English stack because Inter/Fraunces lack the `৳` glyph.
- **Money formatting**: `en` uses en-US grouping (৳1,234,567), `bn` uses bn-BD (lakh grouping + Bangla
  digits). Poisha shown only when non-zero. `toDecimalString()` is the exact string for gateways.
- **SlideToConfirm**: keyboard/assistive activation (click with `detail === 0`) confirms immediately;
  a plain mouse tap only nudges the handle; double activation while pending is ignored.
- **Landing**: brand name/tagline come from `config/brand.ts` until the restaurant row is read (Phase 3
  adds the server Supabase client). Staff-login link is added in Phase 4 together with `/login`
  (no dead link before then).
- **`/dev/ui`** returns 404 in production builds (e2e asserts it).

### Phase 3 (guest)
- **New migration `guest_table_info(token)`** (anon-callable, read-only): returns table label + branding
  for a valid, active QR token, `null` otherwise. Lets the server render the welcome + menu before
  anonymous sign-in (fast LCP) and reject bad/rotated QR codes **without creating anonymous users**.
  Exposes nothing beyond what `join_table` already returns to any signed-in caller. 6 pgTAP checks.
- **Menu SSR cache**: `unstable_cache` (tag `menu`, 60 s). The client query treats that copy as stale
  immediately (`initialDataUpdatedAt: 0`) and refetches, so sold-out state is never more than one
  round-trip old; realtime keeps it live after that.
- **Order submit outcome handling (money/data safety)**: only errors carrying a known server code
  (e.g. `ITEM_UNAVAILABLE`) count as *rejected* (Postgres rolled back → new request id next time).
  Network failures **and unknown errors** count as *unknown outcome*: the same `client_request_id`
  is kept, the cart is frozen (no edits) and the only action is "Retry sending". This guarantees a
  retry can never place a different cart under an id the server already accepted. e2e covers a
  dropped response (server committed, phone saw a failure) → exactly one order.
- **Cart scope**: one cart per tab in `sessionStorage`, bound to (table token, session id); a new
  session (table closed and re-opened) or another table starts empty.
- **Sold-out mid-cart**: flagged live from the menu query (realtime on `menu_items`) and from the
  server's `ITEM_UNAVAILABLE:<name>` error; ordering is blocked until the line is removed.
- **Welcome overlay** is server-rendered (instant paint) and auto-continues after 1.2 s; an inline
  script hides it before paint for tabs that already saw it. **Phase 10: add a CSP nonce** for this
  script and next-themes' script.
- **"Request bill"** creates the `request_bill` service request and shows "Your waiter is bringing the
  bill"; the bill sheet + online payment arrive in Phase 7.
- **Light-mode chips** (table chip, "Required" badge) use solid saffron + dark ink: tinted saffron with
  saffron text measured below 4.5:1 in axe.
- **Guest JS budget** (< 200 KB gzip) is measured and enforced in Phase 10 (bundle analysis).

### Phase 4 (staff)
- **Route guard layers**: `src/proxy.ts` refreshes the session and sends signed-out *and anonymous*
  visitors of `/staff`, `/kitchen`, `/admin` to `/login?next=…` (validated by `safeNext` — same-origin,
  staff paths only). Server layouts/pages re-check the role (`requireStaff`); the DB is the real guard.
- **Staff layout admits every active staff role; pages check their own roles**, because the spec lets
  kitchen staff 86 items (`/staff/menu`) while the board/requests are floor-only. Kitchen lands on
  `/staff/menu` until the KDS exists (Phase 5).
- **`/staff` redirects to `/staff/orders`** until the live floor replaces it in Phase 6.
- **Line removal has no stored reason**: `waiter_adjust_items` takes no reason and the tested SQL is not
  rewritten; removal is an explicit, reversible draft + "Save changes". Rejecting a whole order requires
  a reason (stored, shown to the guest).
- **Board data**: all active orders are always loaded (never truncated) + latest 50 served today
  (Dhaka day). An earlier single query with `limit` could drop new orders on a busy day — caught by e2e.
- **Realtime auth bug fixed** (caught by e2e): on a fresh load the channel could join before the client
  read the session cookie, i.e. as `anon`, so RLS delivered nothing. `useRealtimeInvalidate` now awaits
  the session and calls `realtime.setAuth(token)` before subscribing.
- **Replaced `next-themes`** with a 100-line provider (`components/providers/theme.tsx`): its inline
  script was rendered on client navigations, which React 19 reports as a console error. Our pre-paint
  scripts (theme, guest welcome) are inserted only into SSR HTML via `useServerInsertedHTML`.
- **Light-mode amber** (`--cooking`) darkened to `#B45309` (5:1) and the "Free" grey to ≥ 3:1 after axe
  flagged timers on the board.
- **Sign-out clears the TanStack cache** so a shared tablet never shows the previous user's data.
- **E2E isolation**: a Playwright global setup upserts 24 dedicated tables (`e2e-01…24`, labels
  `E1…E24`) so parallel tests never share a table; `resetTable` mirrors `close_session`. These tables
  exist in the local DB only.
- **`pnpm dev:lan`** serves the app to phones on the same Wi-Fi (see RUNNING.md, incl. Tailscale) (Supabase URL switched to the PC's LAN
  IP, `allowedDevOrigins` set). Development only.
- **Env split into three files**: `lib/env-schema.ts` (pure Zod schemas, unit-tested), `lib/env.ts`
  (public, client-safe), `lib/env.server.ts` (`server-only`). Keeps the secret key's *name* out of client
  bundles. `check:secrets` allows `SUPABASE_SECRET_KEY` only in these server files + `lib/supabase/admin.ts`.
- **Safer env defaults**: `PAYMENT_GATEWAY` has no default (must be set explicitly); SSLCommerz store
  id/password are required when `PAYMENT_GATEWAY=sslcommerz`; `mock` refused when `VERCEL_ENV=production`.
- **shadcn `form` → `field`.** The current shadcn registry no longer ships `form` (it is an empty
  registry item); the new `field` component is used with React Hook Form instead. shadcn now uses its
  own `cn` package (`shadcn-ui/cn`, maintainer shadcn) for class merging.
- **Lint scope**: `docs/**` is excluded — kit reference files (incl. `db-smoke-test.mjs`) stay verbatim.
- **`create-next-app` dir**: scaffolded in `ember-scaffold/` (npm names can't start with `_`), merged, deleted.
- **Kit archive** `ember-table-kit.zip` is gitignored, left on disk.
- **`[auth] enable_signup` stays `true`.** Verified locally: `enable_signup = false` also blocks
  *anonymous* sign-ins (`signup_disabled`), which guests need. Consequence: anyone can self-register an
  email account; such a user has no `staff_members` row, so RLS/RPCs give it exactly a guest's access
  (nothing until it scans a QR). Staff accounts are created only via the admin API. Production: keep email
  confirmations on so self-registered emails can't even sign in.
- **Anonymous sign-in rate limit**: local `anonymous_users = 1000`/h/IP (e2e creates many guests). In
  production all guests on restaurant Wi-Fi share one IP — raise the hosted limit (Phase 11 checklist) and
  rely on Turnstile against abuse.
- **Staff passwords**: min 8 chars, letters + digits (`config.toml`; mirror in hosted Auth settings).
- **`seed:staff` safety**: refuses non-local Supabase URLs unless `--allow-remote`; `--only owner` creates
  just the first owner (docs/06-DEPLOY.md §1.6). Existing users keep their password.
- **Migrations** copied byte-for-byte from `docs/sql` as `20260101000000_init.sql` and
  `20260101000100_storage.sql`; `supabase/seed.sql` = `docs/sql/seed.sql`.
- **CI e2e job** also runs `pnpm db:test` and fails if `src/types/database.ts` is stale.
- **AGENTS.md** (generated by Next 16, re-added by `next dev`) is committed as-is.

## Open issues / blocked
- Local Supabase (Docker Desktop) must be running for `db:*`, `seed:staff`, and e2e from Phase 3 on.
- **SSLCommerz sandbox test** (Phase 7 acceptance) waits for sandbox credentials + a public HTTPS URL —
  see "Phase 7" below. The mock gateway covers the same code paths in e2e.

### Phase 5 (kitchen)
- **Recall / un-bump skipped (safer).** `advance_order` has no `ready → preparing` transition, so an
  "undo Ready" would need a new state-machine path that also un-notifies the guest and waiter. Not worth
  the risk for v1; a mis-bumped ticket stays visible in *Ready* for 10 minutes and the waiter can still
  read it. Revisit with a migration if kitchens ask for it.
- **"All day"** counts what is still to cook: open tickets (`in_kitchen`, `preparing`), non-voided,
  not ticked done.
- **Ready column** shows tickets bumped in the last 10 minutes (server filter + client clock, so they
  drop off without a refetch).
- **Kitchen staff home is `/kitchen`**; they can still 86 items via the header "Sold out" link
  (`/staff/menu`, which also shows a "Kitchen" nav link back for kitchen roles).
- **KDS realtime** uses its own channel (`kitchen:{rid}`, orders + order_items only).
- **Bug fixed (caught by the kitchen e2e):** the guest cart used to add an item only when the
  fly-to-cart animation landed (~0.5 s), so ordering immediately could drop the last item. The cart now
  updates instantly; the animation is purely visual.
- No modal dialogs and no auto-scroll on the KDS; each column scrolls on its own.

### Phase 6 (live floor)
- **New migration 0004**: `floor_live()` (like `floor_snapshot()` + per-order timestamps, item counts and
  each live session's `session_bill`) and **`record_cash_payment_once()`** — wraps the tested
  `record_cash_payment()` with a per-session `client_request_id` (new nullable column + partial unique
  index, advisory lock) so a double tap / lost response never records cash twice. The floor's cash form
  uses it; e2e double-clicks "Record" and asserts exactly one payment. 10 pgTAP checks.
- **State priority** (spec lists 8 states; we have 10): Call waiter > New order > Ready > **Paid** > Bill
  requested > Cooking > **Confirmed** > Eating > Seated > Free. "Call waiter" counts only *open*
  call/water/cutlery/other requests (acknowledged ones stop pulsing). A billing session with no open
  request still shows "Bill requested". Paid = total > 0, due 0, nothing unconfirmed.
- **3D** (R3F 9 + drei, `next/dynamic` with `ssr:false`, loaded only on `/staff` when 3D is shown):
  orthographic isometric camera (35°/45°, rotation clamped ±25°, pan/zoom, double-click or button to
  reset), procedural plank floor, low walls, kitchen pass with heat lamps / steam (cooking) / plates
  (ready), plants, mat, evening string lights (Dhaka time), zone tints, instanced chairs, procedural
  "bean" guests (seeded palette, breathing, blinking, hand raise for new orders, fast wave for calls,
  eating bob), status rings with pulses, Html badges, the signed-in waiter walking (eased lerp) to the
  selected table. `PerformanceMonitor`: lower DPR → no shadows → switch to the map with a toast.
  No WebGL → map + notice (e2e stubs WebGL away). Keyboard/screen-reader layer: visually hidden
  buttons in label order announce "T4: New order, 3 items, 1:42" and Enter opens the sheet.
- **Measured**: ~56 fps for the 3D floor in *dev* mode on an integrated AMD Radeon (12 tables, many
  guests). The production build is faster; formal throttled-device profiling is in Phase 10.
- **Known dev-only warning**: drei `<Html>` logs "Attempted to synchronously unmount a root…" under React
  19 StrictMode in development. Not present in the production build (e2e asserts no console errors).
- **View choice** remembered per device (`localStorage`); default 3D on tablets, list on phones.
- **pgTAP tests are self-contained**: they create their own tables inside the rolled-back transaction
  (they used to depend on demo tables being free).
- **E2E tables** are activated by the Playwright global setup and deactivated by a new global teardown,
  so they never appear on the real floor plan.
- Compact timers on small badges (`1h02` instead of `1:02:05`).

### Phase 7 (bill & payments)
- **New migration 0005** (`mark_gateway_payment()` untouched, 27 pgTAP checks):
  - `start_gateway_payment(session, amount?, channel)` — called with the **guest's own JWT** from the init
    route. Membership, open table, no unconfirmed orders, `0 < amount ≤ due`, channel allow-list, ≤ 10
    checkouts / 10 min / table, and the `tran_id` (`ES-` + 20 hex) are all decided in Postgres under a
    row lock on the session. Deviation from Architecture §7 (which inserts with the admin client): safer
    for money (rule 2) and the guest can only ever create an *initiated* row, which counts for nothing.
  - `settle_gateway_payment(…)` — **service_role only**, used by IPN/return after the Validation API.
    Guards: paid / pending_review / reviewed payments are never changed by a later fail/cancel or a replay;
    a success that would **overpay** (two phones paid the full due) or lands **after the table closed** is
    parked as `pending_review` (reason stored) instead of silently counted. `session_due_internal()`
    mirrors `session_bill()` for this (no caller checks; nobody can execute it; pgTAP asserts they agree).
  - `review_gateway_payment(payment, approve)` — owner/manager only; approve → paid, reject → failed
    (refund manually in SSLCommerz). Same decision twice is a no-op; flipping a decision is refused.
  - `floor_live()` now also returns `pending_review` per session; `payments.reviewed_by/reviewed_at`.
- **Gateway abstraction** `src/lib/payments/` (`PaymentGateway { createSession, validate }`), selected by
  `PAYMENT_GATEWAY`; mock is still refused when `VERCEL_ENV=production`. Pure, unit-tested
  `assessValidation()`: only `VALID|VALIDATED`, same `tran_id`, `currency_type` BDT and
  `currency_amount` (×100, exact) equal to our row count; `risk_level 1` → pending_review; anything else
  → payment marked failed with a reject reason (amount tampering never counts).
- **SSLCommerz specifics (checked against developer.sslcommerz.com/doc/v4)**: `multi_card_name` has no
  Nagad-only key → Nagad opens the `mobilebank` group; card → `visacard,mastercard,amexcard`; bank →
  `internetbank`. Minimum online amount ৳10 (enforced in the UI and the init route). `GatewayPageURL`
  must be https on `*.sslcommerz.com` or we refuse to redirect. Required customer fields use
  placeholders, overridable per restaurant via `restaurants.settings.payment_customer`.
- **IPN**: answers 200 after processing; **503 only when the outcome is unknown** (Validation API or DB
  unreachable) so SSLCommerz retries — a lost IPN would otherwise leave paid money "initiated".
- **Return route** never trusts the form: it validates like the IPN and redirects (303) to the table we
  have on record for that `tran_id` (`value_b` from the form is ignored). Unknown tran → `/`.
- **Stored gateway payload** is trimmed to non-sensitive fields (no card number / issuer), since guests at
  the same table can read their session's payments.
- **Result page** shows what *our database* says; the `?status=` hint only matters while the payment is
  still `initiated`. Polls every 2 s for 30 s, then "you can close this page" (realtime keeps updating).
- **Guest "Request bill"** in the tracker became **"Bill & pay"** (opens the bill page). The Cash tile
  creates the `request_bill` request with note "Paying cash" (spec §4.6).
- **Mock checkout** `/api/payments/mock/checkout` (404 unless `PAYMENT_GATEWAY=mock`): Pay now / Pay with a
  risky card / Decline / Cancel, posting to the real return route like SSLCommerz does. Its `val_id`
  encodes the charged amount + risk so e2e can tamper.
- **Floor**: "Verify payment" badge (list + `!` marker on the map), payments list in the table sheet;
  managers approve/reject through a server action (`reviewPaymentAction`) that re-checks the role, and the
  SQL function checks it again. Waiters see "A manager needs to verify this payment".
- **Feedback** (1–5 stars + comment, editable) appears when the bill is settled and on the "table closed"
  screen.
- **E2E tables** increased to 32 (`E1…E32`).
- **Blocked (needs you)**: a real **SSLCommerz sandbox** run needs a sandbox `store_id` / `store_password`
  (free at developer.sslcommerz.com → sandbox registration) and a public HTTPS `NEXT_PUBLIC_APP_URL`
  (e.g. a tunnel or the Vercel preview) because SSLCommerz must reach the IPN. Everything else is
  verified with the mock gateway.

### Phase 8 (admin)
- **Data flow**: admin pages are Server Components reading with the signed-in user's client (RLS:
  owner/manager write policies already exist for menu, tables, zones, restaurant). Writes are **server
  actions** that re-check the role (`requireManager`) and validate with shared Zod schemas
  (`src/features/admin/schemas.ts`, also used client-side for inline errors), then
  `revalidateTag('menu')` / `revalidatePath`. Money and percentages are typed as text and converted to
  integers (poisha / basis points) in the schema — no floats.
- **New migration 0007** (`admin_*`, 14 pgTAP checks): **SECURITY INVOKER** functions, so RLS still
  decides, but multi-row edits are atomic — `admin_save_menu_item` (item + groups + options; missing
  ones deleted, order history keeps its snapshots), `admin_duplicate_menu_item`, `admin_reorder`,
  `admin_save_floor_layout` (rotation normalised to 0–359), `admin_rotate_qr` (new 32-hex token, old
  prints stop working). Every function also pins rows to the caller's restaurant (e.g. a category id
  from another restaurant is rejected even though the FK would allow it).
- **New migration 0006**: `guest_table_info()` also returns `accent`, `wifi`, `opening_hours` (never
  the whole settings object; pgTAP checks it).
- **Brand accent = presets, not a free colour picker** (6 presets, `src/config/accents.ts`): a free
  colour can't guarantee WCAG AA for dark ink on fills, text on cream and fills on near-black. Applied on
  guest pages as a tiny `<style>` overriding `--primary-fill/--primary-text` (`:root:not(.dark)` /
  `:root.dark`). An e2e test switches through all 6 presets × dark/light and runs axe on the guest menu.
- **Logo** (Settings) and **menu photos**: client-side crop (fixed aspect, drag / arrow keys + zoom) →
  canvas → WebP (JPEG fallback where the browser can't encode WebP) → upload with the manager's own
  Storage session to `menu-images/{restaurant_id}/…` (existing storage policies). Replaced files are not
  deleted yet (Phase 10 cleanup job candidate). Guest header, welcome and print tents show the logo.
- **Default guest language** (Settings) is used when the visitor has no language cookie. One restaurant
  per deployment, so `src/i18n/request.ts` reads the first restaurant's setting (cached 60 s, tag `menu`).
- **Admin UI is English-only** (spec §8 allows); `admin.en.json` is merged into both locales so Bangla
  users see English there instead of missing keys. Guest/staff/kitchen stay fully bilingual.
- **Staff accounts**: `staff_members` has no client write policy, so staff actions use the server-only
  secret-key client after checking: caller is owner/manager of the same restaurant; managers can't
  create, edit or promote to **owner**; you can't deactivate or re-role yourself; the last active owner
  can't be removed. Deactivating also **bans** the auth user (blocks sign-in and token refresh), and
  reactivating lifts it. If creating the staff row fails, the new auth user is deleted again.
  Temporary passwords: 12 chars from `crypto.getRandomValues`.
- **Reorder**: Motion `Reorder` with a drag handle (works with touch) **plus ▲/▼ buttons** for keyboard
  and screen readers. **Layout editor**: drag on a 0.5 m grid, keyboard (arrows, Shift = 2 m, R/Shift+R
  rotate), live announcements, saves only changed tables in one transaction, optional lazy 3D preview
  using the live floor's scene.
- **Tables are deactivated, not deleted** (sessions/orders reference them); deactivating also makes the
  QR invalid. Zones can be deleted (tables keep their place, zone becomes empty).
- **Orders / payments lists** use URL filters (plain GET forms, Dhaka calendar days, max 1 year range,
  50 per page). **CSV export** `/admin/payments/export` re-checks the role, adds a UTF-8 BOM (Excel +
  Bangla) and neutralises spreadsheet formulas (`=`, `+`, `-`, `@`).
- shadcn **tab** text raised to `foreground/80` (axe contrast).
- E2E admin tests restore their fixtures (layout position, rotated QR token, created staff user, menu
  rows, settings).

### Phase 9 (reports)
- **Dashboard lives at `/admin`** (replaces the Phase 8 overview): the spec's §7 "Dashboard" and the
  build plan's "Reports" are the same screen.
- **New migration 0008**: `sales_daily(from, to)` — zero-filled per-day revenue (paid payments by
  `paid_at`) and orders (by `placed_at`) in the restaurant's time zone; owner/manager only; ranges over
  400 days refused. 5 pgTAP checks. Everything else comes from the tested `sales_report()`.
- **Ranges** are Dhaka calendar days (presets Today / Last 7 / Last 30 + custom), each compared with the
  same number of days immediately before; "No earlier data to compare" when the previous period is 0.
  For waiting times a decrease shows as good. Deltas use an arrow icon + signed text, never colour only.
- **Charts are hand-written SVG** (no chart library: ~3 small components, admin-only bundle).
  Followed the data-viz method: forms picked by job (line for trend, columns for hour of day, ranked
  horizontal bars for payment split and top dishes instead of donuts), one series per chart so no legend
  (the title names it), a single validated mark colour (`--viz-series`: `#C97A06` light / `#C27A0A`
  dark — checked with the palette validator for lightness band and ≥ 3:1 on the card; the bright UI
  saffron failed the dark band), 2px line + 10% area wash, ≤ 24px columns with 4px rounded data end,
  hairline grid, value at the line end only, crosshair / per-column tooltip on hover **and** arrow keys
  (one tab stop per chart), and a **Table** switch on every chart. SVGs are measured with
  `ResizeObserver` so axis text keeps its real size.
- **Payment split** maps legacy `sslcommerz` to card; shares use largest-remainder rounding so they add
  to exactly 100%.
- **Report CSV** `/admin/reports/export?from&to`: one file with a `section` column (summary, by_day,
  by_hour, payment_split, top_items), amounts in BDT decimals, same BOM / formula protection as payments.
- "Tables in use" counts only live sessions on **active** tables.
