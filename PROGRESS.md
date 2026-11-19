# PROGRESS

Gate per phase: `pnpm gate` = typecheck · lint · format:check · check:secrets · test · db:smoke · build
(+ `pnpm e2e` from Phase 10; already runs green locally).

## Phases
| # | Phase | Status | Notes |
|---|---|---|---|
| 0 | Scaffold & tooling | ✅ done | Gate green, 43/43 DB smoke checks, e2e smoke green on 3 viewports |
| 1 | Database | ✅ done | Migrations + seed apply cleanly, types generated, 37/37 pgTAP RLS checks, demo staff seeded and can log in |
| 2 | Design system & app shell | ✅ done | Tokens (OKLCH, dark/light), fonts, i18n en/bn, providers, custom components, `/dev/ui`, landing; 57 unit tests, e2e incl. axe AA on landing (both themes, 3 viewports) |
| 3 | Guest app | ⏳ next | |
| 4 | Staff auth & orders | ☐ | |
| 5 | Kitchen display | ☐ | |
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
