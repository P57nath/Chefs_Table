# CLAUDE.md — project rules (read this first, every session)

You are building **Ember & Spice Table** — a premium QR dine-in ordering system:
customer scans the table QR → browses the menu → places an order → the waiter sees
it live on an animated restaurant floor → confirms → sends to kitchen → kitchen
prepares → waiter serves → customer pays (cash, bKash, Nagad, card, bank).

The brand, menu and prices are placeholders. Everything brand-related must come
from the database or `src/config/brand.ts`, never hard-coded in components.

## Source of truth (read before writing code)
| File | What it decides |
|---|---|
| `docs/01-PRODUCT-SPEC.md` | Every screen, flow and feature. |
| `docs/02-ARCHITECTURE.md` | Stack, folders, data flow, realtime, security. |
| `docs/03-DATABASE.md` + `docs/sql/*.sql` | Schema, RLS, RPCs. **Tested — do not rewrite; extend with new migrations.** |
| `docs/04-DESIGN-SYSTEM.md` | Look & feel, tokens, motion, the 3D live floor. |
| `docs/05-BUILD-PLAN.md` | Phase order and acceptance criteria. Work phase by phase. |
| `docs/06-DEPLOY.md` | Production setup. |
| `PROGRESS.md` | You create and maintain this: phase status, decisions, open issues. |

If the docs disagree with each other, the order above wins (spec > architecture > …).
If something is truly ambiguous, choose the option that is safer for money and data,
write the decision in `PROGRESS.md`, and continue.

## Stack (do not swap without writing why in PROGRESS.md)
Next.js 16 (App Router, TypeScript strict, Turbopack) · React 19 · Tailwind CSS v4 ·
shadcn/ui (Radix) · Motion (`motion/react`) · lucide-react · TanStack Query v5 ·
Zustand (cart only) · React Hook Form + Zod v4 · Supabase (Postgres, Auth incl.
anonymous sign-ins, Realtime, Storage) via `@supabase/ssr` · React Three Fiber v9 +
drei (live floor) · next-intl (English + বাংলা) · Vitest + Testing Library ·
Playwright · pnpm.

Install the **latest stable** versions. Next.js ships version-matched docs inside
`node_modules/next/dist/docs` — read them for any API you are unsure about
(e.g. Next 16 uses `proxy.ts` instead of `middleware.ts`; async `params`/`cookies()`).

## Non-negotiable engineering rules
1. **Money** is integer minor units (poisha). Never use floats for money. Format only
   at the edge with `formatMoney()` in `src/lib/money.ts` (`৳1,234` / `৳১,২৩৪` in bn).
2. **Prices and totals are computed in Postgres** (`place_order`, `session_bill`).
   The client sends item ids, quantities and modifier ids — never prices.
3. **All operational writes go through RPCs** in `docs/sql/0001_init.sql`
   (`place_order`, `advance_order`, `record_cash_payment`, …). Tables only have
   SELECT policies for clients. Don't add INSERT/UPDATE policies to orders,
   order_items, sessions, payments or requests.
4. **Secret key** (`SUPABASE_SECRET_KEY`) is used only in server code under
   `src/lib/supabase/admin.ts`, imported with `import 'server-only'`. Never in a
   client component, never prefixed `NEXT_PUBLIC_`.
5. **Every mutation is idempotent or guarded**: customer order submit sends a
   `client_request_id` (uuid generated once per cart submit, reused on retry);
   payment webhooks are idempotent (`mark_gateway_payment`).
6. **Realtime events are invalidation signals.** On any event, invalidate the
   related TanStack Query keys and refetch. On reconnect / tab focus, refetch everything.
   Never build state only from event payloads.
7. **Validate every input** at the boundary with Zod (server actions, route handlers,
   forms). Map Postgres error codes/messages (`ITEM_UNAVAILABLE:…`, `SESSION_CLOSED`, …)
   to friendly, translated messages in `src/lib/errors.ts`.
8. **Every screen has four states**: loading (skeletons, not spinners), empty,
   error (with retry), success. No layout shift. No blank screens.
9. **Accessibility**: WCAG 2.2 AA contrast, visible focus, 44×44 px tap targets,
   labelled controls, `prefers-reduced-motion` respected, the 3D floor always has the
   2D/list equivalent.
10. **No `any`, no `@ts-ignore`, no `eslint-disable`** without a one-line reason.
11. **Server Components by default.** `"use client"` only for interactive leaves.
12. **Never invent features that touch money or security** beyond the spec without
    recording it in `PROGRESS.md`.
13. Do not hotlink random internet images. Menu images come from Supabase Storage;
    when missing, render the designed placeholder described in the design system.

## Workflow rules
- Work **one phase at a time** from `docs/05-BUILD-PLAN.md`. At the end of each phase
  run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (and `pnpm e2e` once it
  exists). Fix every failure before moving on. Then update `PROGRESS.md` and make a git
  commit `feat(phase-N): …`.
- Prefer small, composable components (< ~200 lines). Co-locate feature code under
  `src/features/<feature>/`.
- When you fix a bug, add a test that would have caught it.
- Keep `README.md` (project) and `.env.example` accurate as you go.
- Commands that need Docker (`supabase start`) may fail if Docker isn't running — tell
  the user exactly what to start, and continue with work that doesn't need it.
