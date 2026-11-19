# Running Ember & Spice on your computer

Everything below is typed in the **VS Code terminal** (menu **Terminal → New Terminal**).
On Windows that terminal is PowerShell — the commands here are written for it.

---

## 1. One-time setup

You only do this once per computer.

1. Install **Node.js 22** or newer, **Git**, and **Docker Desktop**.
2. Enable pnpm:
   ```powershell
   corepack enable
   ```
3. Install the project's packages (inside the project folder):
   ```powershell
   pnpm install
   ```
4. **Start Docker Desktop** and wait until it says *Engine running*.
5. Start the local database (the first time downloads images and takes a few minutes):
   ```powershell
   pnpm db:start
   ```
6. Create your settings file and fill in the keys:
   ```powershell
   Copy-Item .env.example .env.local
   pnpm exec supabase status
   ```
   Open `.env.local` and copy from the `status` output:
   - **Publishable** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret** key → `SUPABASE_SECRET_KEY`
7. Load the demo restaurant (menu + 12 tables) and the demo staff accounts:
   ```powershell
   pnpm db:reset
   pnpm seed:staff
   ```

---

## 2. Every day: start the app

1. Open **Docker Desktop** (wait for *Engine running*).
2. In the VS Code terminal:
   ```powershell
   pnpm db:start
   pnpm dev
   ```
3. When it prints `Ready`, open http://localhost:3000

`pnpm db:start` is quick if the database is already running — it just says so.

### Stop it
- Stop the app: click the terminal and press **Ctrl + C**.
- Stop the database (optional, frees memory; your data is kept):
  ```powershell
  pnpm db:stop
  ```

---

## 3. What to open

| What | Link |
|---|---|
| Landing page | http://localhost:3000 |
| Guest menu (a table's QR code) | http://localhost:3000/t/demo-table-01 … `demo-table-12` |
| Staff login | http://localhost:3000/login |
| Kitchen display (kitchen / manager / owner) | http://localhost:3000/kitchen |
| Component showcase (dev only) | http://localhost:3000/dev/ui |
| Database admin (Supabase Studio) | http://127.0.0.1:54323 |

**Demo staff accounts** — password is `DEMO_STAFF_PASSWORD` in `.env.local` (default `ChangeMe!2026`):

| Email | Role | Lands on |
|---|---|---|
| `waiter@demo.local`, `waiter2@demo.local` | Waiter | Orders board |
| `cashier@demo.local` | Cashier | Orders board |
| `manager@demo.local` | Manager | Orders board |
| `owner@demo.local` | Owner | Orders board |
| `kitchen@demo.local` | Kitchen | Kitchen display (`/kitchen`) |

**Try the full flow:** sign in as the waiter in one browser window, open
`/t/demo-table-01` in another window (or on your phone), order something, and watch it
appear on the waiter's board with a chime. Press **Confirm & send** and the guest's
tracker changes to "The chef is cooking". Sign in as `kitchen@demo.local` in a third window
to see the ticket on the kitchen display, press **Start** and **Ready**, and watch the guest's
tracker follow along.

Tip: to be a guest and staff at the same time, use a normal window for one and a
private/incognito window for the other.

---

## 4. Open it on your phone

### Option A — same Wi-Fi (simplest)
Instead of `pnpm dev`, run:
```powershell
pnpm dev:lan
```
It prints a link such as `http://192.168.0.108:3000/t/demo-table-01`. Open that on the
phone (type `http://`, keep the `:3000`).

If the phone can't open it:
- Turn **off** any VPN on the phone (including **Tailscale**) and use the same Wi-Fi as the laptop.
- Guest Wi-Fi networks and some routers block devices from seeing each other
  ("AP / client isolation"). Try another network or turn that off in the router.
- When Windows asks whether Node.js may use the network, click **Allow**.

### Option B — Tailscale (works even on different networks)
Both the laptop and the phone need the Tailscale app, signed in to the same account.

1. Once, in **PowerShell opened as Administrator** (Start menu → right-click
   PowerShell → *Run as administrator*), allow the two ports:
   ```powershell
   New-NetFirewallRule -DisplayName "Ember dev (3000, 54321)" -Direction Inbound -Protocol TCP -LocalPort 3000,54321 -Action Allow -Profile Private,Public
   ```
2. Find the laptop's Tailscale address (starts with `100.`):
   ```powershell
   tailscale ip -4
   ```
3. Start the app on that address (replace with your IP):
   ```powershell
   $env:LAN_IP="100.102.40.30"; pnpm dev:lan
   ```
4. On the phone (Tailscale on): `http://100.102.40.30:3000/t/demo-table-01`

To go back to normal Wi-Fi mode in the same terminal: `Remove-Item Env:LAN_IP`.

---

## 5. Checks and tests

| Command | What it does |
|---|---|
| `pnpm gate` | Everything required before a commit: types, lint, format, secret check, unit tests, DB smoke test, production build |
| `pnpm test` | Unit tests only (fast) |
| `pnpm db:test` | Database security tests (needs the database running) |
| `pnpm e2e` | Browser tests against a production build (needs the database running; creates its own tables `E1…E24`) |

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| `error during connect … dockerDesktopLinuxEngine` | Docker Desktop isn't running. Open it, wait for *Engine running*, try again. |
| `Port 3000 is in use` / `EADDRINUSE` | An old server is still running. Close its terminal, or run the command below, then start again. |
| Staff login says *Email or password is incorrect* | Run `pnpm seed:staff` (needed again after every `pnpm db:reset`). |
| Guest page says *This code isn't active* | Check the link (`demo-table-01` … `12`). After `db:reset` the demo tables are back. |
| App starts but shows *Invalid public environment variables* | `.env.local` is missing or keys are empty — repeat step 6 of the one-time setup. |
| Want a clean slate (all orders deleted) | `pnpm db:reset` then `pnpm seed:staff`. **This erases all local data.** |

Free port 3000 (stops whatever is using it):
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
