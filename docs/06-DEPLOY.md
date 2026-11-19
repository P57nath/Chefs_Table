# 06 — Deploy to production

Target: **Vercel** (app) + **Supabase Cloud** (database/auth/realtime/storage),
both in **Singapore** (closest major region to Dhaka).

## 1. Supabase
1. Create a project, region *Southeast Asia (Singapore)*. Save the DB password.
2. `pnpm supabase login` → `pnpm supabase link --project-ref <ref>` →
   `pnpm supabase db push` (applies migrations). Run `seed.sql` only if you want the
   demo menu in production (SQL editor), otherwise create the restaurant via Admin.
3. Authentication → Providers: enable **Email** (disable public sign-ups: staff are
   created by admins) and **Anonymous sign-ins**. Turn on CAPTCHA (Cloudflare
   Turnstile) for anonymous sign-ins if you set Turnstile keys.
4. Authentication → URL configuration: Site URL `https://your-domain`, add redirect URLs.
5. API keys: copy the **publishable** and **secret** keys.
6. Create the first owner: run `pnpm seed:staff` against production with only the
   owner account enabled, or create the user in the dashboard and insert a
   `staff_members` row (role `owner`) in the SQL editor.

## 2. SSLCommerz
1. Sandbox: register at developer.sslcommerz.com → test `store_id` / `store_passwd`.
2. Live: apply for a merchant account (trade licence, bank details, website with
   policies: **Terms, Privacy, Refund/Return, Contact** — build these as simple
   pages under `/legal/*` because SSLCommerz checks for them).
3. In the merchant panel set the **IPN URL** to
   `https://your-domain/api/payments/sslcommerz/ipn` and enable the channels you want
   (bKash, Nagad, Rocket, cards, internet banking).
4. Set `SSLCOMMERZ_MODE=live` only after a successful live test transaction.

## 3. Vercel
1. Import the Git repo. Framework: Next.js. Region: `sin1` (Singapore) for functions.
2. Environment variables (Production + Preview): everything in `.env.example`.
   `PAYMENT_GATEWAY=sslcommerz` in Production (env.ts refuses `mock` there).
3. Domain: add your domain, HTTPS is automatic.
4. Deploy. Smoke test: `/api/health`, landing, scan a printed QR, place an order, see
   it on the floor, kitchen, pay 10 ৳ via live bKash, close table.

## 4. Restaurant go-live checklist
- [ ] Admin → Settings: name, logo, address, phone, VAT %, service %.
- [ ] Admin → Menu: real items, photos, prices, Bangla names.
- [ ] Admin → Tables & floor: real layout; **Rotate all QR tokens** (demo tokens are public!).
- [ ] Admin → QR: print table tents, laminate, place.
- [ ] Admin → Staff: create waiter/kitchen/cashier accounts; disable demo accounts.
- [ ] Mount kitchen tablet/TV; install staff PWA on waiter tablets; test sounds.
- [ ] Wi-Fi strong at every table (guests need data).
- [ ] Do a full dry-run lunch with the team.

## 5. Operations
- Backups: Supabase daily backups (Pro plan) or scheduled `pg_dump`.
- Monitoring: Vercel Analytics + Speed Insights; add Sentry via the `reportError()` hook.
- Uptime ping on `/api/health` (checks DB connectivity).
- Realtime limits: check your Supabase plan's concurrent connections
  (every guest phone + staff device = 1 connection).
