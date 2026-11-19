# Ember & Spice Table — starter kit for Claude Code

Premium QR dine-in ordering system: guests scan → order → waiter confirms on a live
3D restaurant floor → kitchen display → serve → pay (cash, bKash, Nagad, card, bank).

This folder is the **plan + rules + tested database** that Claude Code will use to
build the full app. (When the app is built, Claude replaces this README with the
project README.)

## What's inside
| File | For |
|---|---|
| `START_PROMPT.md` | The prompts you paste into Claude Code |
| `CLAUDE.md` | Rules Claude Code reads automatically every session |
| `docs/01-PRODUCT-SPEC.md` | Every screen and flow (guest, waiter, kitchen, admin) |
| `docs/02-ARCHITECTURE.md` | Tech stack, folders, realtime, payments, security, tests |
| `docs/03-DATABASE.md` | Database guide |
| `docs/sql/0001_init.sql` | Full schema + security + order state machine + billing (tested) |
| `docs/sql/0002_storage.sql` | Image storage bucket |
| `docs/sql/seed.sql` | Demo restaurant, 12 tables, 24 menu items |
| `docs/sql/db-smoke-test.mjs` | 43 automatic checks for the database |
| `docs/04-DESIGN-SYSTEM.md` | Colours, fonts, motion, the animated 3D live floor |
| `docs/05-BUILD-PLAN.md` | 12 phases with "done" criteria |
| `docs/06-DEPLOY.md` | Going live: Supabase, SSLCommerz, Vercel, restaurant checklist |
| `.env.example` | Settings the app needs |

## Install these first (one time)
1. **Node.js 22 LTS** (or newer) — nodejs.org
2. **pnpm**: open a terminal and run `corepack enable`
3. **Git** — git-scm.com
4. **Docker Desktop** — docker.com (runs the database on your computer). Keep it open while building.
5. **VS Code** + the **Claude Code** extension, signed in.

Later, for going live: a Supabase account, an SSLCommerz sandbox account
(developer.sslcommerz.com), a Vercel account and a domain.

## How to start
1. Unzip this kit into an empty folder, e.g. `ember-table`, and open that folder in VS Code.
2. Open Claude Code, choose **Opus** with `/model`.
3. Press Shift+Tab to switch to **plan mode**, paste **Prompt 1** from `START_PROMPT.md`.
4. Read its plan, approve it, then let it work (auto-accept edits is fine).
5. When a session stops or the context fills up, paste **Prompt 2** to continue.
6. After all phases, paste **Prompt 3** for a full bug hunt.

The whole build is long (many hours of agent work across several sessions). Claude
commits after every phase, so nothing is lost if you stop and continue later.

## Demo logins (after Phase 1)
`owner@demo.local`, `manager@demo.local`, `waiter@demo.local`, `kitchen@demo.local`,
`cashier@demo.local` — password from `DEMO_STAFF_PASSWORD` in `.env.local`.
Demo table links: `http://localhost:3000/t/demo-table-01` … `demo-table-12`.

## Local development (while the build is in progress)
Quick start (full guide with troubleshooting: [RUNNING.md](RUNNING.md)):
```powershell
pnpm db:start      # Docker Desktop must be running
pnpm dev           # http://localhost:3000
pnpm dev:lan       # same, plus phones on your Wi-Fi (prints the link)
```
Build status: see `PROGRESS.md`.
