# Prompts to paste into Claude Code (VS Code)

**Model:** Claude Opus 5.5 (in Claude Code type `/model` and pick Opus).
Use **plan mode first** (Shift+Tab until it says "plan mode") for the first prompt so you
can approve the plan; after you approve, let it work with auto-accept edits on.

---

## Prompt 1 — start the project (paste once)

```
You are a senior full-stack engineer and product designer. Build the complete,
production-ready application described in this folder.

Before writing any code, read these files fully and in this order:
CLAUDE.md, docs/01-PRODUCT-SPEC.md, docs/02-ARCHITECTURE.md, docs/03-DATABASE.md,
docs/sql/0001_init.sql, docs/04-DESIGN-SYSTEM.md, docs/05-BUILD-PLAN.md,
docs/06-DEPLOY.md, .env.example.

What we are building: a premium QR dine-in ordering system for a restaurant
(placeholder brand "Ember & Spice"). Guest scans the table QR → browses the menu →
places an order → the waiter sees it live on an animated 3D restaurant floor →
confirms → sends to kitchen → kitchen prepares → waiter serves → guest pays with
cash, bKash, Nagad, card or bank (SSLCommerz). Guest UI in English and Bangla.

Rules:
1. Follow CLAUDE.md at all times. The SQL in docs/sql is already tested (43 checks) —
   use it as-is and extend only with new migrations.
2. Work through docs/05-BUILD-PLAN.md phase by phase, in order. Do not skip phases or
   leave TODOs/placeholders in shipped code.
3. At the end of every phase run the gate (typecheck, lint, tests, build), fix all
   failures, update PROGRESS.md, and commit. Then go straight on to the next phase
   without waiting for me, unless you are blocked by something only I can do
   (Docker not running, missing credentials). In that case tell me exactly what to do
   and keep working on anything that isn't blocked.
4. Install the latest stable versions of every package and check their current docs
   (Next.js has version-matched docs in node_modules/next/dist/docs). Don't rely on
   memory for APIs that changed recently (Next 16 proxy.ts, async params/cookies,
   Tailwind v4 config, React Three Fiber v9, Supabase new API keys).
5. Design quality matters as much as correctness: follow docs/04-DESIGN-SYSTEM.md
   precisely. Every screen needs loading, empty, error and success states, dark/light
   where specified, English and Bangla, and must work on a 390px phone and a 1180px tablet.
6. Think about failure cases before you write each feature (double taps, network loss,
   realtime reconnect, two staff acting on the same order, item sold out mid-cart,
   payment callbacks arriving twice or out of order) and write tests for them.
7. When something in the docs is ambiguous, pick the safer option for money and data,
   record the decision in PROGRESS.md, and continue.

Start now: show me your plan for Phase 0 and Phase 1 (commands you'll run and files
you'll create), then execute it.
```

---

## Prompt 2 — continue (paste whenever a session ends or the context resets)

```
Read CLAUDE.md and PROGRESS.md, then check `git log --oneline -15` and `git status`.
Continue with the next unfinished phase in docs/05-BUILD-PLAN.md (re-read the docs
sections that phase depends on). Finish any half-done work first, keep the gate green,
update PROGRESS.md and commit at the end of each phase.
```

---

## Prompt 3 — bug hunt (paste after Phase 10, or any time things feel shaky)

```
Act as a QA lead. Read CLAUDE.md, docs/01-PRODUCT-SPEC.md and PROGRESS.md.
1. Run the full gate and the Playwright suite; fix every failure at its root cause.
2. Walk through every flow in the spec as each role (guest on 390x844, waiter on
   1180x820, kitchen on 1920x1080, manager on desktop) using Playwright, in English
   and Bangla, dark and light. List every bug, visual glitch, missing state, console
   error and accessibility problem you find, then fix them one by one, adding a test
   for each.
3. Review security against docs/02-ARCHITECTURE.md §9 and money handling against
   CLAUDE.md rules 1–5.
Report what you fixed and anything that still needs my decision.
```

---

## Prompt 4 — rebrand later (when you have the real shop name/menu)

```
Our real brand is: <NAME>, tagline <TAGLINE>, accent colour <HEX>, logo at
<path/to/logo.svg>. Update src/config/brand.ts fallbacks, the landing page copy,
PWA manifest/icons, metadata and the demo seed. The live restaurant data is edited in
Admin, so don't hard-code anything else. Here is the real menu: <paste or attach>.
Write it as a new seed file (prices in poisha) and give me SQL I can run in the
Supabase SQL editor to replace the demo menu.
```
