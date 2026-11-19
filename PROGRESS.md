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
| 5 | Kitchen display | ⏳ next | Switch kitchen's post-login home to `/kitchen` |
| 6 | Live floor (2D/list/3D) | ☐ | |
| 7 | Bill & payments | ☐ | |
| 8 | Admin | ☐ | |
| 9 | Reports | ☐ | |
| 10 | Hardening | ☐ | |
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
- **`pnpm dev:lan`** serves the app to phones on the same Wi-Fi (Supabase URL switched to the PC's LAN
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
- None. Local Supabase (Docker Desktop) must be running for `db:*`, `seed:staff`, and e2e from Phase 3 on.
