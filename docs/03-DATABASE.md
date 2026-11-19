# 03 — Database

The SQL in `docs/sql/` is **ready and tested**. Copy it into the Supabase project
instead of re-designing it:

| Kit file | Goes to | Purpose |
|---|---|---|
| `docs/sql/0001_init.sql` | `supabase/migrations/<timestamp>_init.sql` | Schema, RLS, state machine, RPCs, realtime publication |
| `docs/sql/0002_storage.sql` | `supabase/migrations/<timestamp+1>_storage.sql` | `menu-images` bucket + policies |
| `docs/sql/seed.sql` | `supabase/seed.sql` | Demo restaurant, 3 zones, 12 tables (QR tokens `demo-table-01…12`), 6 categories, 24 items with modifiers |
| `docs/sql/db-smoke-test.mjs` | keep in `docs/sql/` | 43 checks in in-memory Postgres (PGlite) — run with `node docs/sql/db-smoke-test.mjs` after `pnpm add -D @electric-sql/pglite` |

Use timestamps like `20260101000000_init.sql` and `20260101000100_storage.sql`.
Any change later = a **new** migration file. Never edit an applied migration.
After every schema change: `pnpm db:types` (`supabase gen types typescript --local > src/types/database.ts`).

## Entities
```
restaurants 1─* staff_members (auth.users)
restaurants 1─* zones 1─* dining_tables (qr_token, pos_x/pos_y/rotation for the floor)
restaurants 1─* menu_categories 1─* menu_items 1─* modifier_groups 1─* modifier_options
dining_tables 1─* table_sessions (max ONE live per table) 1─* session_guests (anon users)
table_sessions 1─* orders 1─* order_items (price/name snapshots)
orders 1─* order_events (audit, written by trigger)
table_sessions 1─* service_requests · payments · feedback
```

## Money & percentages
- `*_minor` = poisha integers. ৳420 → `42000`.
- `vat_bps`, `service_charge_bps` = basis points. 7.5 % → `750`.
- Bill: service = round(subtotal × service%); VAT = round((subtotal + service) × VAT%).
  Only orders with status beyond `placed` and not `cancelled`, non-voided lines.

## Order state machine (enforced by `advance_order`)
```
placed ─▶ confirmed ─▶ in_kitchen ─▶ preparing ─▶ ready ─▶ served
  │  └──── confirm & send ────▶│ └──── (skip) ────▶│
  └─▶ cancelled  ← from placed/confirmed (floor staff, reason required)
                 ← from in_kitchen/preparing/ready (manager/owner only)
  guest: cancel_my_order() only while placed
```
Each transition stamps its timestamp (`confirmed_at`, `sent_at`, `preparing_at`,
`ready_at`, `served_at`, `cancelled_at`) and writes `order_events`.

## RPC reference
| Function | Caller | Returns | Notes |
|---|---|---|---|
| `join_table(p_qr_token)` | guest (any authed user) | jsonb `{session_id, session_status, table_id, table_label, restaurant_id, restaurant_name, restaurant_slug, currency, vat_bps, service_charge_bps}` | Race-safe, reuses the live session |
| `place_order(p_session_id, p_items, p_client_request_id, p_note?)` | guest | order uuid | `p_items = [{menu_item_id, quantity, modifier_option_ids?, note?}]`. Idempotent. Validates availability & modifier min/max. Re-opens a `billing` session. |
| `cancel_my_order(p_order_id)` | guest | void | Only while `placed` |
| `advance_order(p_order_id, p_to, p_reason?)` | staff | orders row | Role-checked transitions; `ready` ticks all items done |
| `waiter_adjust_items(p_order_id, p_changes)` | floor staff | void | `[{order_item_id, quantity}]`, 0 = void; only placed/confirmed; auto-cancels if empty |
| `set_order_item_done(p_order_item_id, p_done)` | kitchen | void | |
| `set_item_availability(p_item_id, p_available)` | any staff | void | Sold-out toggle |
| `create_service_request(p_session_id, p_type, p_note?)` | guest | uuid | Dedupes open requests per type; `request_bill` sets session `billing` |
| `update_service_request(p_request_id, p_status)` | staff | void | |
| `session_bill(p_session_id)` | guest of session / staff | jsonb `{subtotal_minor, service_charge_bps, service_charge_minor, vat_bps, vat_minor, total_minor, paid_minor, due_minor, unconfirmed_orders, currency}` | |
| `record_cash_payment(p_session_id, p_amount_minor, p_channel='cash')` | floor staff | uuid | Rejects amount > due |
| `mark_gateway_payment(p_tran_id, p_val_id, p_amount_minor, p_status, p_payload)` | **server only (service_role)** | payments row | Idempotent; amount must match |
| `close_session(p_session_id, p_force=false)` | staff (force: manager/owner) | void | Needs due = 0 and no unconfirmed orders unless forced |
| `submit_feedback(p_session_id, p_rating, p_comment?)` | guest | void | Upsert per guest |
| `floor_snapshot()` | staff | jsonb array of tables with live session, orders, open requests | One call powers the floor |
| `sales_report(p_from, p_to)` | owner/manager | jsonb (revenue, orders, avg ticket, avg confirm/kitchen seconds, by_method, top_items, by_hour, avg_rating) | |

Supabase JS returns RPC errors as `{ code, message }`; messages are the stable codes
above (e.g. `ITEM_UNAVAILABLE:Firni`). Map them in `src/lib/errors.ts`.

## Things to add as new migrations if/when needed
- `pg_cron` job to delete anonymous users older than 30 days with no open session.
- Daily order number reset (display-only, e.g. `#A-023`) if the owner wants it.
- Per-station routing (grill / drinks) — add `station` to menu_items and filter KDS.
