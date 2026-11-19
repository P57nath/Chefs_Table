import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

const db = new PGlite();
// Run:  npm i -D @electric-sql/pglite && node docs/sql/db-smoke-test.mjs
// Runs the migration + seed in an in-memory Postgres with Supabase stubs
// and checks security, pricing, state machine and billing (43 checks).
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const SQL = path.dirname(fileURLToPath(import.meta.url)) + path.sep;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗', m); } };

// --- Supabase stubs ---
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, is_anonymous boolean default false);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  create publication supabase_realtime;
`);
await db.exec(fs.readFileSync(SQL + '0001_init.sql', 'utf8'));
console.log('migration OK');
await db.exec(fs.readFileSync(SQL + 'seed.sql', 'utf8'));
console.log('seed OK');

const U = {
  guest1: '11111111-1111-4111-8111-111111111111', guest2: '22222222-2222-4222-8222-222222222222',
  waiter: '33333333-3333-4333-8333-333333333333', kitchen: '44444444-4444-4444-8444-444444444444',
  manager: '55555555-5555-4555-8555-555555555555', outsider: '66666666-6666-4666-8666-666666666666',
  cashier: '77777777-7777-4777-8777-777777777777',
};
const R = '00000000-0000-4000-8000-000000000001';
for (const id of Object.values(U)) await db.query('insert into auth.users(id) values ($1)', [id]);
for (const [k, role] of [['waiter','waiter'],['kitchen','kitchen'],['manager','manager'],['cashier','cashier']])
  await db.query('insert into public.staff_members(user_id, restaurant_id, role, display_name) values ($1,$2,$3,$4)', [U[k], R, role, k]);

async function as(who, sql, params = []) {
  const role = who === 'anon' ? 'anon' : who === 'service' ? 'service_role' : 'authenticated';
  const sub = U[who] ?? '';
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub}', false); set role ${role};`);
  try { return await db.query(sql, params); } finally { await db.exec('reset role;'); }
}
async function err(who, sql, params = []) {
  try { await as(who, sql, params); return null; } catch (e) { return e.message; }
}

console.log('\nanon reads');
ok((await as('anon', 'select count(*)::int n from menu_items')).rows[0].n === 24, 'anon sees 24 menu items');
ok((await as('anon', 'select count(*)::int n from dining_tables')).rows[0].n === 0, 'anon cannot see tables/qr tokens');
ok((await err('anon', `select join_table('demo-table-04')`))?.includes('permission denied'), 'anon cannot call join_table');

console.log('\njoin table');
const j1 = (await as('guest1', `select join_table('demo-table-04') j`)).rows[0].j;
const j2 = (await as('guest2', `select join_table('demo-table-04') j`)).rows[0].j;
ok(j1.session_id === j2.session_id && j1.table_label === 'T4', 'two phones share one session at T4');
ok((await err('guest1', `select join_table('nope')`))?.includes('TABLE_NOT_FOUND'), 'bad QR rejected');
const S = j1.session_id;

const ids = Object.fromEntries((await db.query(`select name, id from menu_items`)).rows.map(r => [r.name, r.id]));
const opt = Object.fromEntries((await db.query(`select o.name, o.id from modifier_options o`)).rows.map(r => [r.name, r.id]));

console.log('\nplace order');
const items = [
  { menu_item_id: ids['Ember Smash Burger'], quantity: 2, modifier_option_ids: [opt['Double'], opt['Cheddar cheese']], note: 'no onion' },
  { menu_item_id: ids['Mango Lassi'], quantity: 1 },
];
const crid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const o1 = (await as('guest1', `select place_order($1, $2::jsonb, $3) id`, [S, JSON.stringify(items), crid])).rows[0].id;
const o1b = (await as('guest1', `select place_order($1, $2::jsonb, $3) id`, [S, JSON.stringify(items), crid])).rows[0].id;
ok(o1 === o1b, 'idempotent retry returns same order');
const sub = (await db.query('select subtotal_minor from orders where id=$1', [o1])).rows[0].subtotal_minor;
ok(sub === 138000, `server-side price = 138000 (got ${sub})`);
ok((await err('guest1', `select place_order($1, $2::jsonb, gen_random_uuid())`, [S, JSON.stringify([{ menu_item_id: ids['Grilled Beef Steak'], quantity: 1 }])]))?.includes('MODIFIER_RULES'), 'required modifier enforced');
ok((await err('guest1', `select place_order($1, $2::jsonb, gen_random_uuid())`, [S, JSON.stringify([{ menu_item_id: ids['Mango Lassi'], quantity: 1, modifier_option_ids: [opt['Double']] }])]))?.includes('INVALID_MODIFIER'), 'foreign modifier rejected');
ok((await err('guest1', `select place_order($1, $2::jsonb, gen_random_uuid())`, [S, JSON.stringify([{ menu_item_id: ids['Mango Lassi'], quantity: 99 }])]))?.includes('INVALID_QUANTITY'), 'quantity capped');
ok((await err('outsider', `select place_order($1, $2::jsonb, gen_random_uuid())`, [S, JSON.stringify(items)]))?.includes('NOT_A_GUEST'), 'outsider cannot order to the table');
await db.query(`update menu_items set is_available=false where id=$1`, [ids['Firni']]);
ok((await err('guest1', `select place_order($1, $2::jsonb, gen_random_uuid())`, [S, JSON.stringify([{ menu_item_id: ids['Firni'], quantity: 1 }])]))?.includes('ITEM_UNAVAILABLE'), 'sold-out item rejected');

console.log('\nvisibility');
ok((await as('guest2', 'select count(*)::int n from orders')).rows[0].n === 1, 'table-mate sees the order');
ok((await as('outsider', 'select count(*)::int n from orders')).rows[0].n === 0, 'outsider sees nothing');
ok((await as('guest2', 'select count(*)::int n from order_items')).rows[0].n === 2, 'table-mate sees items');
ok((await as('waiter', 'select count(*)::int n from orders')).rows[0].n === 1, 'waiter sees order');
const upd = await as('waiter', `update orders set status='served' where id=$1`, [o1]);
ok(upd.affectedRows === 0, 'direct UPDATE blocked by RLS');

console.log('\nstate machine');
ok((await err('kitchen', `select advance_order($1,'confirmed')`, [o1]))?.includes('INVALID_TRANSITION'), 'kitchen cannot confirm');
ok((await err('guest1', `select advance_order($1,'confirmed')`, [o1]))?.includes('FORBIDDEN'), 'guest cannot confirm');
await as('waiter', `select waiter_adjust_items($1, $2::jsonb)`, [o1, JSON.stringify([])]);
await as('waiter', `select advance_order($1,'confirmed')`, [o1]);
ok((await err('guest1', `select cancel_my_order($1)`, [o1]))?.includes('ALREADY_CONFIRMED'), 'guest cannot cancel after confirm');
await as('waiter', `select advance_order($1,'in_kitchen')`, [o1]);
ok((await err('waiter', `select advance_order($1,'preparing')`, [o1]))?.includes('INVALID_TRANSITION'), 'waiter cannot mark preparing');
ok((await err('waiter', `select advance_order($1,'cancelled','x')`, [o1]))?.includes('INVALID_TRANSITION'), 'waiter cannot cancel once in kitchen');
await as('kitchen', `select advance_order($1,'preparing')`, [o1]);
await as('kitchen', `select advance_order($1,'ready')`, [o1]);
await as('waiter', `select advance_order($1,'served')`, [o1]);
const ev = (await as('manager', 'select count(*)::int n from order_events where order_id=$1', [o1])).rows[0].n;
ok(ev === 6, `6 audit events logged (got ${ev})`);
const t = (await db.query('select confirmed_at, sent_at, preparing_at, ready_at, served_at from orders where id=$1', [o1])).rows[0];
ok(Object.values(t).every(Boolean), 'all timestamps set');

console.log('\nwaiter adjusts + guest cancel');
const o2 = (await as('guest2', `select place_order($1, $2::jsonb, gen_random_uuid()) id`, [S, JSON.stringify([{ menu_item_id: ids['Masala Cha'], quantity: 3 }, { menu_item_id: ids['Borhani'], quantity: 1 }])])).rows[0].id;
const cha = (await db.query(`select id from order_items where order_id=$1 and name_snapshot='Masala Cha'`, [o2])).rows[0].id;
await as('waiter', `select waiter_adjust_items($1, $2::jsonb)`, [o2, JSON.stringify([{ order_item_id: cha, quantity: 1 }])]);
ok((await db.query('select subtotal_minor from orders where id=$1', [o2])).rows[0].subtotal_minor === 20000, 'subtotal recomputed after adjust (8000+12000)');
await as('waiter', `select advance_order($1,'in_kitchen')`, [o2]); // confirm & send in one tap
const o3 = (await as('guest1', `select place_order($1, $2::jsonb, gen_random_uuid()) id`, [S, JSON.stringify([{ menu_item_id: ids['Firni'] ?? ids['Mishti Doi'], quantity: 1 }])]).catch(() => null));
const o4 = (await as('guest1', `select place_order($1, $2::jsonb, gen_random_uuid()) id`, [S, JSON.stringify([{ menu_item_id: ids['Mishti Doi'], quantity: 1 }])])).rows[0].id;
await as('guest1', `select cancel_my_order($1)`, [o4]);
ok((await db.query('select status from orders where id=$1', [o4])).rows[0].status === 'cancelled', 'guest cancels own unconfirmed order');

console.log('\nservice requests + floor');
const r1 = (await as('guest1', `select create_service_request($1,'request_bill') id`, [S])).rows[0].id;
const r2 = (await as('guest2', `select create_service_request($1,'request_bill') id`, [S])).rows[0].id;
ok(r1 === r2, 'duplicate bill request deduped');
ok((await db.query('select status from table_sessions where id=$1', [S])).rows[0].status === 'billing', 'session → billing');
const floor = (await as('waiter', 'select floor_snapshot() f')).rows[0].f;
ok(floor.length === 12, '12 tables in floor snapshot');
const t4 = floor.find(x => x.label === 'T4');
ok(t4.session && t4.session.orders.length === 2 && t4.session.open_requests.length === 1, 'T4 shows 2 live orders + bill request');
ok((await err('guest1', 'select floor_snapshot()'))?.includes('FORBIDDEN'), 'guest cannot read floor');

console.log('\nbilling');
const bill = (await as('guest1', 'select session_bill($1) b', [S])).rows[0].b;
// subtotal 138000 + 20000 = 158000; service 5% = 7900; VAT 7.5% of 165900 = 12442.5 -> 12443 (round half away from zero)
ok(bill.subtotal_minor === 158000 && bill.service_charge_minor === 7900 && bill.vat_minor === 12443 && bill.total_minor === 178343,
   `bill math (${JSON.stringify(bill)})`);
ok((await err('cashier', 'select record_cash_payment($1, $2)', [S, 99999999]))?.includes('AMOUNT_EXCEEDS_DUE'), 'overpayment rejected');
ok((await err('waiter', 'select close_session($1)', [S]))?.includes('UNPAID_BALANCE'), 'cannot close unpaid table');

console.log('\ngateway payment (server only)');
await as('service', `insert into payments(restaurant_id, session_id, method, channel, amount_minor, tran_id) values ($1,$2,'sslcommerz','bkash',100000,'TRX1')`, [R, S]);
ok((await err('guest1', `select mark_gateway_payment('TRX1','v',100000,'paid','{}')`))?.includes('permission denied'), 'client cannot mark payment paid');
ok((await err('service', `select mark_gateway_payment('TRX1','v',5,'paid','{}')`))?.includes('AMOUNT_MISMATCH'), 'amount mismatch rejected');
await as('service', `select mark_gateway_payment('TRX1','v',100000,'paid','{}')`);
await as('service', `select mark_gateway_payment('TRX1','v',100000,'paid','{}')`); // IPN + redirect both arrive
ok((await db.query(`select count(*)::int n from payments where status='paid'`)).rows[0].n === 1, 'idempotent paid');
const due = (await as('cashier', 'select session_bill($1) b', [S])).rows[0].b.due_minor;
ok(due === 78343, `due after bKash = 78343 (got ${due})`);
await as('cashier', 'select record_cash_payment($1, $2)', [S, due]);
await as('waiter', 'select close_session($1)', [S]);
ok((await db.query('select status from table_sessions where id=$1', [S])).rows[0].status === 'closed', 'table closed');
ok((await err('guest1', `select place_order($1, $2::jsonb, gen_random_uuid())`, [S, JSON.stringify(items)]))?.includes('SESSION_CLOSED'), 'cannot order on closed session');
const j3 = (await as('guest1', `select join_table('demo-table-04') j`)).rows[0].j;
ok(j3.session_id !== S, 'rescan opens a fresh session');
await as('guest1', 'select submit_feedback($1, 5::smallint, $2)', [S, 'Lovely kacchi']);

console.log('\nreports');
const rep = (await as('manager', `select sales_report(now() - interval '1 day', now() + interval '1 day') r`)).rows[0].r;
ok(rep.revenue_minor === 178343 && rep.orders === 2 && rep.avg_rating == 5, `report (${JSON.stringify(rep).slice(0, 160)}…)`);
ok((await err('waiter', `select sales_report(now() - interval '1 day', now())`))?.includes('FORBIDDEN'), 'waiter cannot see reports');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
