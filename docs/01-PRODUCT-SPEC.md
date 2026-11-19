# 01 — Product spec

## 1. Concept
A dine-in ordering system that feels like a premium consumer app on the guest's phone
and like a calm, living "mini-game" view of the restaurant for staff.

**Four apps, one codebase, one database:**

| App | Who | Device | Route root |
|---|---|---|---|
| Guest | Customers at a table | Their phone (no install, no login) | `/t/[token]` |
| Floor | Waiters, cashier | Tablet / phone (installable PWA) | `/staff` |
| Kitchen (KDS) | Cooks | Wall-mounted tablet / TV | `/kitchen` |
| Admin | Owner, manager | Laptop / tablet | `/admin` |

Plus a public landing page `/` (brand, "scan the QR at your table", staff login link).

## 2. Roles & permissions
| Action | Guest | Waiter | Kitchen | Cashier | Manager | Owner |
|---|---|---|---|---|---|---|
| Browse menu, place order, call waiter, request bill, pay online | ✓ (own table) | | | | | |
| Cancel own order while still unconfirmed | ✓ | | | | | |
| See live floor & orders | | ✓ | | ✓ | ✓ | ✓ |
| Edit order before confirming (qty / remove line) | | ✓ | | ✓ | ✓ | ✓ |
| Confirm order / send to kitchen / mark served | | ✓ | | ✓ | ✓ | ✓ |
| Kitchen: start, tick items, mark ready | | | ✓ | | ✓ | ✓ |
| Toggle item sold-out ("86") | | ✓ | ✓ | ✓ | ✓ | ✓ |
| Cancel order after it reached the kitchen | | | | | ✓ | ✓ |
| Record cash/card-machine payment, close table | | ✓ | | ✓ | ✓ | ✓ |
| Force-close an unpaid table | | | | | ✓ | ✓ |
| Menu, tables, floor layout, QR codes, settings | | | | | ✓ | ✓ |
| Staff accounts | | | | | ✓ (not owners) | ✓ |
| Reports | | | | | ✓ | ✓ |

These are enforced in Postgres (see `docs/sql/0001_init.sql`). The UI hides what a
role can't do, but the database is the real guard.

## 3. The core flow (must feel instant)
```
Guest scans QR ─▶ /t/{token}
  └─ silent anonymous sign-in ─▶ join_table(token) ─▶ session for that table
Guest browses ─▶ adds to cart ─▶ reviews ─▶ "Slide to place order"
  └─ place_order() ─▶ order.status = placed
Waiter's floor: table T4 lights up, a guest avatar raises a hand, bubble "New order · 3 items", chime
  └─ waiter taps T4 ─▶ order sheet ─▶ (optional edits) ─▶ "Confirm" ─▶ "Send to kitchen"
     (or one tap "Confirm & send")              status: confirmed ─▶ in_kitchen
Kitchen display: new ticket slides in with a timer
  └─ "Start" ─▶ preparing ─▶ tick items ─▶ "Ready" ─▶ ready
Floor: a plate appears at the kitchen pass + T4 shows "Ready to serve"
  └─ waiter taps "Served" ─▶ served
Guest tracker updates live at every step (placed → confirmed → cooking → ready → served)
Guest: "Request bill" ─▶ bill sheet ─▶ pay online (bKash / Nagad / card / bank via SSLCommerz)
       or "Pay cash to waiter"
Waiter/cashier records cash ─▶ due = 0 ─▶ "Close table" ─▶ session closed
Guest sees thank-you + 5-star feedback
```
Several phones can join the same table; everyone sees all orders of the table.
A guest can order again any time while the table is open (round 2, desserts…).

## 4. Guest app (mobile-first, 360–430 px wide, works up to desktop)

### 4.1 Arrival `/t/[token]`
- Full-bleed animated welcome (brand mark, warm gradient, subtle ember particles),
  "Welcome to Ember & Spice · You're at **Table 4**", language toggle EN / বাংলা,
  one primary button "View menu". Auto-continues after 1.2 s if the guest doesn't tap.
- Invalid / rotated QR → friendly "This code isn't active. Please ask your waiter."
- Table already closed by staff while the guest still has the page → show thank-you
  screen with "Start a new order" (re-joins).
- Anonymous sign-in happens silently; if Cloudflare Turnstile keys are configured,
  run it invisibly first.

### 4.2 Menu
- Sticky header: brand, table chip "T4", language toggle, search icon.
- Hero strip: "Chef's specials" horizontal carousel (items tagged `chef_special`).
- Sticky category chips with scroll-spy (tap to smooth-scroll; active chip follows scroll).
- Item cards: photo (or designed placeholder), name (+ Bangla name in bn mode),
  2-line description, price, tag pills (Veg 🌿, Spicy 🌶 × level, New, Bestseller),
  "+" quick-add button. Items with required modifiers open the detail sheet instead.
- Sold-out items: greyed, "Sold out today" label, cannot be added; updates live.
- Search: instant client-side fuzzy search over names (both languages) & descriptions.
- Filters: Veg only, Spice level ≤ N.

### 4.3 Item detail (bottom sheet, drag to dismiss)
Large image, description, modifier groups (radio when max=1, checkboxes otherwise,
"Required" badge, min/max enforced with inline hints), special instructions (200 chars),
quantity stepper (1–20), sticky "Add · ৳780" button showing the live line total.

### 4.4 Cart
- Floating cart bar (count, total, "View cart") with a satisfying add animation
  (item thumbnail flies into the bar, count bumps).
- Cart sheet: lines with modifiers, steppers, swipe-to-remove, order note,
  subtotal + "VAT & service added on the bill". "Slide to place order" control
  (prevents accidental taps; keyboard-accessible alternative button).
- Cart persists per table session in `sessionStorage`; cleared on success.
- Submit: generates `client_request_id` once; on network failure shows "Retry"
  re-using the same id (no duplicate orders).
- Errors mapped: item went sold out → highlight the line, offer remove.

### 4.5 Live tracker (the "wow" screen for guests)
- Animated illustrated stage scene (SVG + Motion): a little chef character at a stove;
  the scene changes per status: *Sent* (ticket flies to waiter) → *Confirmed* (waiter
  nods) → *Cooking* (pan sizzles, steam) → *Ready* (bell rings, plate on the pass) →
  *Served* (plate lands on a table, sparkle). Reduced motion → static illustrations.
- Vertical progress timeline with timestamps and an estimated time
  (max `prep_minutes` among items, counted from `sent_at`).
- All orders of the table listed (round 1, round 2 …) with item lists and statuses.
- "Cancel" visible only while `placed`.
- Action bar: **Call waiter** · **Order more** · **Request bill**.
  Call waiter opens quick options: Call waiter / Water / Cutlery / Other (note).
  Pressing again while open shows "Your waiter has been notified · 2 min ago".
- Haptic (`navigator.vibrate`) + soft sound when status changes (if allowed).

### 4.6 Bill & payment
- Bill sheet: itemised lines of confirmed orders, subtotal, service charge (x%),
  VAT (y%), total, paid, **due**. Unconfirmed orders shown separately:
  "Waiting for confirmation — not on the bill yet". Pay buttons disabled while
  `unconfirmed_orders > 0`.
- Payment choices (big tiles with brand-neutral icons and labels):
  bKash · Nagad · Card · Internet banking → all go to SSLCommerz hosted checkout
  (the tile pre-selects the channel when supported); **Cash** → creates a
  `request_bill` service request with note "Paying cash".
- Return page `/t/[token]/payment/result?status=…` shows success / failed / cancelled
  and polls `session_bill` until the IPN lands (max 30 s, then "We're confirming your
  payment, you can close this page").
- Split bill: "Pay a custom amount" (≤ due) so friends can pay separately.
- After due reaches 0: confetti-light celebration + feedback (1–5 stars + comment).

## 5. Floor app (waiters & cashier) `/staff`
Design for a 10–11" tablet in landscape first, then phone portrait.

### 5.1 Start of shift
Login (email + password). After login, a "Start shift" screen: name, role, toggles for
sound and vibration, "Start" (this user gesture unlocks audio and requests a screen
wake lock).

### 5.2 Live floor (home) — see design system §6 for visuals
- Default view: **3D isometric live floor** of the restaurant. Toggle to **2D map** and
  **List**. Remember choice per device. Auto-fallback to 2D if WebGL is unavailable or
  FPS stays < 30 (PerformanceMonitor).
- Each table shows its live state:
  - Free (no session) · Seated (session open, no orders) · **New order** (any `placed`)
  · Confirmed / in kitchen · **Ready to serve** (any `ready`) · Served / eating ·
  **Bill requested** · **Call waiter** · Paid (due 0, not closed).
  Priority when several apply: Call waiter > New order > Ready > Bill > Cooking > Eating > Seated > Free.
- Live counters on top: New orders, Ready to serve, Requests, Occupied tables x/y.
- Alerts: chime + vibration + toast for new order, call waiter, order ready, bill
  request. Unacknowledged new orders older than 2 min pulse red.
- Zone filter chips (Main Hall / Window / Terrace).
- Tap a table → **Table sheet** (right drawer on tablet, bottom sheet on phone):
  - Header: table label, guests, time seated, session status.
  - Open requests with "Done" buttons.
  - Orders, newest first. For `placed`: editable lines (stepper / remove with reason),
    customer note, buttons **Confirm**, **Send to kitchen**, **Confirm & send** (primary),
    **Reject** (reason required).
    For `ready`: **Mark served**. Others: status pill + timeline.
  - Bill summary + **Record cash payment** (amount defaults to due; quick buttons) and
    **Close table** (enabled when due = 0).
  - Every action is optimistic with rollback on error and a toast.

### 5.3 Orders board `/staff/orders`
Kanban columns: New · Confirmed · In kitchen · Ready · Served (today). Cards show
table, order no, age timer, item count, total. Same actions as the table sheet.

### 5.4 Requests `/staff/requests`
Live list of open requests with age; acknowledge / resolve.

### 5.5 Sold-out toggle `/staff/menu`
Searchable list of items with an availability switch.

## 6. Kitchen display `/kitchen`
- Dark, high-contrast, huge type, readable from 2 m. Landscape TV / tablet.
- Columns: **New (in_kitchen)** · **Preparing** · **Ready (last 10 min)**.
- Ticket: table label, order no, age timer (green < 10 min, amber < 20, red ≥ 20),
  items with quantities in large type, modifiers and notes highlighted, tap an item to
  tick it done. Buttons: **Start** → preparing, **Ready** (bump).
- "All-day" side panel: total count per item across open tickets.
- New ticket: slide-in + chime. Auto-scroll off; no modal dialogs.
- Recall: un-bump last ready ticket within 60 s (manager/kitchen) — implement as
  a short-lived undo in UI only if safe; otherwise skip and note in PROGRESS.md.

## 7. Admin `/admin`
- **Dashboard**: today's revenue, orders, avg ticket, avg confirm time, avg kitchen
  time, live occupancy, payment split (cash/bKash/Nagad/card/bank), top items,
  orders-by-hour chart, rating. Date range picker (Today / 7 days / 30 days / custom).
- **Menu**: categories (drag to reorder), items (create/edit/duplicate/archive),
  image upload with crop to 4:3 and compression to WebP (client-side) before upload,
  modifier groups & options editor, Bangla fields, tags, spice level, prep minutes,
  availability.
- **Tables & floor**: zones; tables list; **floor layout editor** (drag tables on a
  grid, rotate, shape, seats) that saves `pos_x/pos_y/rotation`; preview in 3D.
- **QR codes**: per table, show QR, download PNG/SVG, **print sheet** (A4, 2×3 table
  tents with brand, table label, "Scan to order", URL fallback). "Rotate QR" (new token,
  old prints stop working) with confirmation.
- **Staff**: invite/create staff (email, name, role, temporary password), deactivate,
  change role (managers can't create or edit owners).
- **Orders**: searchable history with filters (date, table, status), order detail with
  event timeline (`order_events`).
- **Payments**: list with method/channel/status, filter; export CSV.
- **Settings**: restaurant name, tagline, logo, address, phone, hours, Wi-Fi, VAT %,
  service charge %, default language, theme accent; payment gateway mode
  (sandbox/live) is env-driven and shown read-only.

## 8. Cross-cutting
- **Languages**: English and Bangla for guest UI (full), staff UI (full), admin
  (English, Bangla optional). Bangla digits in bn mode for prices and times.
- **Time zone**: everything displayed in `Asia/Dhaka`.
- **PWA**: staff and kitchen apps installable (manifest, icons, offline fallback page
  "Reconnecting…"). Guest app is a normal web page (fast first load matters more).
- **Connection banner**: realtime disconnected → slim banner "Reconnecting…" and
  polling fallback every 10 s until reconnected.
- **Performance budgets**: guest menu LCP < 2.0 s on 4G mid-range Android; guest JS
  < 200 KB gzip on first load (3D code never loads for guests); staff floor 3D chunk
  lazy-loaded.
- **SEO**: only the landing page is indexable; `/t/*`, `/staff`, `/kitchen`, `/admin`
  are `noindex`.
- **Privacy**: guests are anonymous; no phone/email collected.
