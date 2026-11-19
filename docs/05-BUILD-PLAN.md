# 05 — Build plan (work strictly in this order)

Each phase ends with the **gate**: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
all green (+ `pnpm e2e` from Phase 10 on), `PROGRESS.md` updated, git commit
`feat(phase-N): <summary>`. Don't start the next phase with a red gate.

---

## Phase 0 — Scaffold & tooling
1. `git init` if needed. The folder already contains `CLAUDE.md`, `docs/`, `README.md`,
   `.env.example`, so **`create-next-app` will refuse a non-empty folder**: scaffold into
   `./_scaffold` (`pnpm create next-app@latest _scaffold --ts --tailwind --eslint --app
   --src-dir --import-alias "@/*" --use-pnpm --turbopack`), move its contents to the
   root (don't overwrite kit files; merge `.gitignore`; rename its README to keep ours),
   delete `_scaffold`, run `pnpm install`.
2. TypeScript `strict`, `noUncheckedIndexedAccess`. ESLint (next config) + Prettier
   with Tailwind plugin. Path alias `@/*`.
3. Add deps: `@supabase/supabase-js @supabase/ssr @tanstack/react-query zustand
   zod react-hook-form @hookform/resolvers motion lucide-react sonner next-intl
   next-themes clsx tailwind-merge class-variance-authority nanoid qrcode
   three @react-three/fiber @react-three/drei server-only`;
   dev: `vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
   jsdom @playwright/test @axe-core/playwright @types/three @types/qrcode
   @electric-sql/pglite supabase prettier prettier-plugin-tailwindcss`.
4. `pnpm dlx shadcn@latest init` then add: button card sheet dialog drawer tabs input
   textarea label switch checkbox radio-group badge skeleton dropdown-menu tooltip
   separator scroll-area avatar select popover calendar table sonner form toggle-group.
5. Scripts in package.json: `dev, build, start, typecheck (tsc --noEmit), lint, format,
   test (vitest run), test:watch, e2e (playwright test), db:start (supabase start),
   db:reset (supabase db reset), db:types, db:smoke (node docs/sql/db-smoke-test.mjs),
   seed:staff (tsx scripts/create-demo-staff.ts)`. Add `tsx` dev dep.
6. `src/lib/env.ts` with Zod (server vs public), `.env.local` from `.env.example`.
7. Vitest + Playwright configs, one sample test each. GitHub Actions CI (Architecture §10).
8. Create `PROGRESS.md` with the phase checklist.

**Gate** + `pnpm db:smoke` passes.

## Phase 1 — Database
1. `pnpm supabase init` (creates `supabase/config.toml`). Set
   `[auth] enable_anonymous_sign_ins = true`, site_url `http://localhost:3000`,
   additional redirect urls. Enable realtime (default).
2. Copy SQL per `docs/03-DATABASE.md` (migrations with timestamps + seed).
3. `pnpm db:start` (needs Docker Desktop running) → `pnpm db:reset` → `pnpm db:types`.
4. `scripts/create-demo-staff.ts` (admin API): creates owner@demo.local,
   manager@demo.local, waiter@demo.local, waiter2@demo.local, kitchen@demo.local,
   cashier@demo.local with password from `DEMO_STAFF_PASSWORD` env, inserts
   `staff_members` (restaurant `00000000-0000-4000-8000-000000000001`), idempotent.
5. pgTAP tests in `supabase/tests/` for RLS per role (guest/outsider/waiter/kitchen/
   manager) mirroring the smoke test highlights.

**Accept**: `supabase db reset` clean, types generated, `supabase test db` green,
demo staff can log in (verified in Phase 4).

## Phase 2 — Design system & app shell
1. Tokens in `globals.css` (`@theme`), dark/light via `next-themes` (`class` strategy),
   fonts via `next/font` (Fraunces, Inter, Noto Sans/Serif Bengali), grain overlay util.
2. Re-skin shadcn components to the design system; build the custom components list
   (§9) incl. SlideToConfirm, MoneyText, Timer, StatusPill, EmptyState, ErrorState,
   Skeleton set, ConnectionBanner, LanguageToggle.
3. next-intl with `en` and `bn` (cookie-based locale, no locale prefix in URLs),
   Bangla digits helper, `formatMoney`.
4. Providers: QueryClient (sensible defaults: staleTime 15 s, retry 2 with backoff,
   refetchOnWindowFocus true), Theme, Toaster, Intl.
5. A hidden `/dev/ui` page (only in development) showcasing every component in both
   themes and both languages.
6. Landing page `/`.

**Accept**: `/dev/ui` looks premium in dark & light, en & bn; Lighthouse a11y ≥ 95.

## Phase 3 — Guest app
Spec §4. Order: bootstrap (anon sign-in + `join_table`) → welcome → menu (RSC data,
chips with scroll-spy, search, filters, chef's specials) → item sheet (modifier rules
mirrored client-side for UX; server is the authority) → cart (zustand, persisted per
session, fly-to-cart) → place order (idempotent) → tracker (live via realtime,
illustrated stages, ETA, all rounds) → call waiter / request bill → cancel while placed.

**Accept**: on a 390×844 viewport the full flow works against local Supabase;
duplicate submits create one order; sold-out item errors are friendly; a second
browser on the same QR sees the same orders live; reduced motion respected.

## Phase 4 — Staff auth & orders (list first)
Login page, `proxy.ts` session refresh + guards, server layouts with role checks,
Start-shift screen (audio unlock, wake lock), Orders board (kanban) with all actions
(adjust items, confirm, send, confirm & send, reject with reason, served), Requests
page, Sold-out page, alerts (chime/vibrate/toast, diff-based), connection banner +
polling fallback.

**Accept**: guest places order → appears on board in < 1 s with chime; waiter confirms
& sends; guest tracker updates live; permissions verified for each role.

## Phase 5 — Kitchen display
Spec §6. Columns, tickets, timers with thresholds, tick items, Start, Ready (bump),
all-day panel, chime on new ticket, huge-type dark UI, landscape 1920×1080 and
1280×800 layouts.

**Accept**: end-to-end flow guest → waiter → kitchen → waiter served → guest sees
"Served" — all live.

## Phase 6 — Live floor (2D + list, then 3D)
1. `features/floor/status.ts`: pure function `tableState(snapshotRow) → {state, priority,
   since, counts}` with unit tests for the priority rules.
2. List view and 2D SVG map with pulses and badges; Table sheet (right drawer /
   bottom sheet) reusing the order actions from Phase 4, plus bill summary, record
   cash payment, close table.
3. 3D diorama per Design System §6 (lazy chunk). Scene, tables, chairs, procedural
   characters, state animations, waiter walk, Html badges, camera controls, day/night,
   PerformanceMonitor fallback, keyboard + live-region accessibility.
4. View toggle (3D / 2D / List) remembered per device; zone filter.

**Accept**: 12 tables at 60 fps on a mid-range tablet (Chrome devtools throttling as a
proxy), auto-fallback works with WebGL disabled, every state from the colour table is
visibly distinct in all three views.

## Phase 7 — Bill & payments
Guest bill page, split/custom amount, payment tiles, SSLCommerz gateway (session,
IPN, return route — follow Architecture §7 exactly), mock gateway for dev/test,
result page with polling, cash flow, pending_review handling on the floor (badge +
manager can mark verified via a small server action that calls an admin-only path —
add a migration function `review_gateway_payment(p_payment_id, p_approve)` restricted to
owner/manager), feedback after due = 0, close table.

**Accept**: sandbox payment through SSLCommerz succeeds and the floor shows Paid live;
IPN replay doesn't double-count; amount tampering is rejected; mock flow e2e green.

## Phase 8 — Admin
Spec §7: dashboard shell, menu editor (with image crop/compress/upload, modifiers,
reorder), tables + floor layout editor (2D drag, snap, rotate) with 3D preview, QR
page (PNG/SVG download, A4 print sheet via print CSS, rotate token), staff management
(server actions with role checks), orders history with event timeline, payments list +
CSV export, settings. `revalidateTag('menu')` after menu changes.

**Accept**: a manager can rebrand (name, logo, accent), edit the full menu with
photos, rearrange the floor (reflected in 3D), print QR tents, add a waiter — without
touching code.

## Phase 9 — Reports
Dashboard KPIs and charts from `sales_report` (Recharts or visx, styled to tokens),
date ranges in Dhaka time, empty states, CSV export.

## Phase 10 — Hardening ("overcome all bugs")
1. Playwright suite from Architecture §10 (multi-context full flow, permissions,
   sold-out, duplicate submit, payments mock, axe scans). Fix everything it finds.
2. Edge cases: session closed while guest is on menu; waiter and manager act on the
   same order simultaneously (INVALID_TRANSITION → refetch + toast); realtime
   disconnect/reconnect; phone sleeps and wakes; slow 3G; very long names in Bangla;
   12+ items in a ticket; 0 tables; empty menu category; image upload failure;
   expired staff session mid-shift.
3. Performance: bundle analyse; guest first-load JS budget; images; fonts subset;
   no 3D code in guest chunks.
4. Security review against Architecture §9; secret-key grep CI check; headers; CSP
   tested in production build.
5. PWA for `/staff` and `/kitchen` (manifest, icons, offline fallback), `noindex`
   for private routes, `robots.ts`, metadata/OG for landing.
6. Error boundaries per route segment, `not-found`, `global-error`.

## Phase 11 — Deploy
Follow `docs/06-DEPLOY.md`. Update project README with run/deploy steps, demo
accounts, how to change brand/menu, and how to print QR codes.

---

## Definition of done (whole project)
- All gates green, e2e suite green locally and in CI.
- Every screen: loading/empty/error/success designed; en + bn; dark + light where applicable.
- No console errors or React warnings in any flow.
- Lighthouse (mobile) guest menu: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- `PROGRESS.md` lists any deviations from the docs with reasons.
