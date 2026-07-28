# Defense Preparation — Dagim Dereje (UU94191R)

**Project:** Cafe Audit System (CAS) with V2 extensions  
**Role:** Project Leader / Lead Developer  
**Institution:** Unity University  
**Advisor:** Mr. Nahom G.

This document is a deep study guide for Dagim. Read it end-to-end before defense. You own architecture, audit engine, sales, reporting, and integration testing — but you must also be able to explain the full system if a teammate cannot answer.

---

## 1. Executive elevator pitch

### 30 seconds

"We built the **Cafe Audit System** — a web application for small cafes that closes the gap between **what the POS says you sold** and **what is physically on the shelf**. Staff record sales and table orders; the system deducts ingredients using **recipes**. Auditors perform physical counts; the system flags **variances above 10%** and syncs inventory. V2 adds **QR table ordering**, a **kitchen display**, **mobile payment verification**, and **shift tracking** — all running on a **local network** without depending on the public internet."

### 2 minutes

"Cafes lose money silently when inventory records drift from reality: unrecorded waste, unpaid orders, or manual errors. Our system addresses the **reconciliation problem** as the core thesis scope.

We use a classic **three-tier architecture**: Apache serves PHP views and controllers; MySQL stores normalized data; browsers on the LAN access staff dashboards, customer QR menus, and kitchen screens.

**Six roles** — admin, manager, auditor, waiter, kitchen, cashier — each see only what they need. Managers configure products, recipes, and tables. Waiters and customers place orders. Kitchen prepares them. Cashiers verify Telebirr or bank transfers. Auditors reconcile physical stock.

The **audit engine** compares counted quantity to system quantity, calculates variance percentage, highlights items above a configurable threshold (default **10%**), writes `audit_logs`, and updates `inventory.current_qty`.

**Sales** — whether from counter POS or paid table orders — trigger **recipe-based deduction**: each product links to ingredients in the `recipes` table.

We deployed for demo on **XAMPP** or optionally a **Raspberry Pi** on cafe Wi‑Fi so examiners' phones scan QR codes on the same network. We deliberately did **not** use Vercel because the stack requires PHP sessions, MySQL, and persistent file uploads for payment screenshots.

I led architecture and the audit/sales/reporting modules; teammates covered requirements, UI, inventory backend, shifts, and documentation."

---

## 2. Problem statement and why cafe audit matters

### The business problem

Small cafes track **sales digitally** (POS, spreadsheets) and **inventory physically** (stock room, fridge). Without linking every sale to ingredient usage, the system quantity becomes fiction. Managers discover shortages only at month-end — too late to find root cause (theft, spillage, unrecorded comps, unpaid dine-in tabs).

### Why reconciliation matters

| Without reconciliation | With CAS |
|------------------------|----------|
| Shrinkage discovered late | Variance flagged per shift or daily |
| Sales and stock disconnected | Recipes tie menu items to ingredients |
| No accountability per shift | `shifts`, `opening_quantities`, `audit_logs` |
| Guesswork on ordering | Low-stock alerts via `min_threshold` |

### Thesis angle

The project demonstrates that a **low-cost, on-premise** web system can give cafe owners **operational visibility** comparable to expensive cloud POS add-ons — appropriate for Ethiopian cafe context where LAN Wi‑Fi and mobile payment (Telebirr) are common but dedicated cloud budgets are not.

---

## 3. System scope

### Core (CAS — original scope)

- Ingredient **inventory** master data and suppliers
- **Physical audit** and reconciliation with variance alerts
- **Manual POS sales** with recipe deduction
- **Waste logging** (spoilage, damage)
- **Purchase orders** and receiving stock
- **Shifts** and opening quantity snapshots
- **Reports** (sales, audit history, waste, staff, login logs)

### V2 extensions (integrated modules)

- **Restaurant tables** with unique `qr_token` per table
- **Customer QR ordering** (`public/customer/menu.php`) — no login
- **Waiter tablet** — server role places orders when QR is unused
- **Kitchen display** — order lifecycle: pending → committed → preparing → served → paid
- **Itemized billing** — VAT (15%), service charge (10%), optional tip
- **Mobile payment verification** — customer uploads screenshot; cashier approves
- **Auto-managed shifts** — clock in/out on login for operational roles

All modules share one database (`restaurant_v2`) and one authentication model.

---

## 4. Architecture

### Three-tier MVC (LAN-first)

```text
┌─────────────────────────────────────────────────────────────┐
│  Presentation (Browser)                                      │
│  Bootstrap 5 · staff UI · customer menu · kitchen board      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP (same Wi‑Fi / LAN)
┌────────────────────────────▼────────────────────────────────┐
│  Application (PHP 8, Apache)                                 │
│  Router → Controllers → Models → Views                       │
│  public/index.php (front controller)                         │
│  CSRF · sessions · RBAC · BCrypt                             │
└────────────────────────────┬────────────────────────────────┘
                             │ PDO
┌────────────────────────────▼────────────────────────────────┐
│  Data (MySQL / MariaDB) — restaurant_v2, InnoDB, 3NF         │
└───────────────────────────────────────────────────────────────┘
```

### Key technical choices

| Choice | Reason |
|--------|--------|
| PHP + Apache | Matches XAMPP thesis environment; ubiquitous on LAMP hosting |
| Custom MVC (no framework) | Transparent for academic evaluation; small codebase |
| MySQL InnoDB | FK integrity, transactions for sales + deduction |
| Server-side sessions | Staff auth; 30-minute timeout (`session_timeout` 1800s) |
| Local QR (phpqrcode + GD) | No external API; works offline on LAN |
| `APP_URL` env var | QR links and payment URLs must match reachable host |

### Request flow example (audit submit)

1. Auditor POSTs physical counts to `/audit/submit`
2. `AuditController::submit()` — `require_role`, `verify_csrf()`
3. `AuditLog::submitBatch()` — per item: read `system_qty`, compute discrepancy and `variance_pct`
4. Flag high variance via `variance_threshold_pct` in `config/app.php`
5. Update `inventory.current_qty` to physical count
6. Insert rows into `audit_logs` linked to `shift_id` and `user_id`

---

## 5. All six roles and capabilities

Roles are stored in `users.role` ENUM: `admin`, `manager`, `auditor`, `server`, `kitchen`, `staff`.

| Role | Code name | Primary tasks |
|------|-----------|---------------|
| **Admin** | `admin` | Full access, user management, all modules |
| **Manager** | `manager` | Inventory, products, recipes, tables, shifts, suppliers, POs, reports, settings view |
| **Auditor** | `auditor` | Physical audit/reconciliation, waste logs, reports |
| **Waiter** | `server` | Waiter tablet, active tables, place orders, billing handoff |
| **Kitchen** | `kitchen` | Kitchen display, mark order status, inventory view, waste |
| **Cashier** | `staff` | Payment verification, counter POS sales, waste |

### Demo users (`database/install.php`)

Password for all: **`admin123`**

| Username | Role | Full name (demo) |
|----------|------|------------------|
| manager | manager | **Dagim Dereje** ← your manager demo |
| auditor | auditor | Hana Wabe |
| waiter1 | server | Biruk G/Tinsae |
| kitchen1 | kitchen | Sara Bekele |
| cashier1 | staff | Kebede Alemu |
| admin | admin | System Admin |

**You** demo as **manager** — you open shifts, show tables/QR, reports, and settings. Know auditor flow for reconciliation demo.

### RBAC implementation

- `require_role([...])` in controllers — redirects to 403 if role not allowed
- `auth_user()` reads session after login
- Views hide navigation items by role (defense: mention server-side enforcement is authoritative)

---

## 6. Key modules Dagim owns — technical depth

### 6.1 Audit reconciliation

**Tables:** `inventory`, `audit_logs`, `opening_quantities`, `shifts`

**Flow:**

1. Shift opens → `opening_quantities` snapshot (optional baseline)
2. During service: sales, waste, PO receipts change `inventory.current_qty`
3. Auditor enters **physical_qty** per item on audit screen
4. For each item:
   - `system_qty` = current DB quantity
   - `discrepancy` = physical − system
   - `variance_pct` = |discrepancy / system| × 100 (100% if system is 0 and physical ≠ 0)
5. UI highlights items where `variance_pct > variance_threshold_pct` (default **10**)
6. On submit: `inventory` synced to physical; row in `audit_logs`

**Code path:** `AuditController` → `AuditLog::submitBatch()` → `Inventory::updateQty()`

**Defense tip:** Unpaid table orders do **not** deduct inventory until status is **paid**. Auditors should confirm no large backlog of unpaid sessions before counting — otherwise system qty looks higher than reality.

### 6.2 Sales and recipe deduction

**Tables:** `sales`, `products`, `recipes`, `inventory`, `orders`, `order_items`

**Manual POS (`SalesController`):**

- Requires open `shift`
- `Sale::record(product_id, qty, shift_id, user_id)`
- For each recipe line: `inventory.current_qty -= recipe.qty × qty_sold`

**Table orders:**

- Order placed → stock **checked** at commit time
- Deduction happens when order marked **paid** (links to `sales` with `order_id`, `table_id`)

**Why recipes matter:** A latte isn't one inventory row — it's milk, coffee, cup. Recipes make audit meaningful.

### 6.3 Reporting

**`Report` model / `ReportController`:**

- Sales CSV export
- Audit history with variance columns
- Waste logs
- Staff performance
- Login events (`login_logs`)
- Print view → browser Save as PDF

Know that reports prove **accountability** — tie audit findings to shift and user.

### 6.4 Integration testing (your responsibility)

Be ready to describe **end-to-end scenarios** you tested:

- Sale → inventory drops → audit shows expected qty
- Table order full lifecycle → payment → deduction
- Variance above 10% → flagged in UI and report
- Role denial (waiter cannot access audit)
- CSRF failure on forged POST
- QR URL with wrong `APP_URL` breaks customer menu (config test)

---

## 7. V2 modules — enough to explain if teammates are weak

### QR ordering

- Each row in `restaurant_tables` has `table_number` (T01…) and secret `qr_token`
- QR encodes: `{APP_URL}/customer/menu.php?table={token}`
- Customer adds items → POST creates `orders` with `order_source = 'qr'`
- No authentication — security is **obscure token** + LAN-only deployment

### Waiter tablet

- `server` role: select table, build order, `order_source = 'server'`
- Same kitchen and billing pipeline as QR

### Kitchen display

- `kitchen` role sees orders by status
- Updates: committed → preparing → served
- Does not mark paid — separation of duties

### Payments

- Customer sees subtotal + VAT + service charge + tip
- Pays via Telebirr/CBE (demo numbers in `config/app.php` `payment` array)
- Uploads screenshot to `storage/uploads/payments/`
- `payment_submissions` table; cashier approves → order → **paid**

### Shifts

- `Shift::autoClockIn` on login for waiter/cashier/kitchen
- Manager can open/close manually
- Sales and audits attach to `shift_id`

**If Amir is absent:** say he implemented shift auto-clock and helped XAMPP docs; you understand the `shifts` and `opening_quantities` relationship.

---

## 8. Database overview (main tables)

Database: **`restaurant_v2`**, utf8mb4, InnoDB, 3NF.

| Table | Purpose |
|-------|---------|
| `users` | Staff accounts, BCrypt `password_hash`, role ENUM |
| `login_logs` | Login/logout audit trail |
| `inventory` | Ingredients: `current_qty`, `min_threshold`, unit |
| `categories` | Product grouping |
| `products` | Menu items, price, active flag |
| `recipes` | `product_id` → `item_id` + qty per serving |
| `suppliers` | Vendor directory |
| `purchase_orders` | PO header/status |
| `shifts` | Open/close, `user_id`, `opened_by` |
| `opening_quantities` | Per-shift ingredient baseline |
| `sales` | Sale lines; optional `order_id`, `table_id` |
| `waste_logs` | Spoilage/damage with qty and reason |
| `audit_logs` | system_qty, physical_qty, discrepancy, variance_pct |
| `restaurant_tables` | table_number, qr_token, status, capacity |
| `orders` | Table session orders, status lifecycle |
| `order_items` | Line items per order |
| `payment_submissions` | Customer payment proofs |
| `waiter_requests` | Call waiter / request bill from customer UI |

**ER summary:** `users` → `shifts` → sales/audit/waste; `restaurant_tables` → `orders` → `order_items` → `products` → `recipes` → `inventory`.

Install order: `schema.sql` → `seed.sql` → `install.php`.

---

## 9. Security

| Control | Implementation |
|---------|----------------|
| **Password storage** | BCrypt, cost 12, via `password_hash()` in `install.php` |
| **Login** | `password_verify()`; failed attempts logged |
| **Sessions** | PHP sessions; timeout 1800 seconds |
| **RBAC** | `require_role()` on every sensitive controller action |
| **CSRF** | `verify_csrf()` on POST forms; token in session |
| **SQL injection** | PDO prepared statements throughout models |
| **XSS** | `e()` helper escapes output in views |
| **Customer QR** | Token in URL; not guessable if `random_bytes` used |
| **Uploads** | Payment images in `storage/uploads/payments/`; validate on server |

**Honest limits:** No HTTPS in default LAN demo; QR token leakage if photographed; no rate limiting on customer menu — acceptable for thesis scope, not for public internet without hardening.

---

## 10. NFR highlights

| NFR | How we address it |
|-----|-------------------|
| **Performance** | Indexed queries on `orders.status`, `sales.sold_at`; Pi tuning (swap, small InnoDB buffer) |
| **Usability** | Bootstrap 5 responsive UI; role-specific dashboards; QR for customers |
| **Reliability** | MariaDB transactions for sales; shift required before POS sale |
| **Maintainability** | MVC separation; `docs/` user guides; schema in version control |
| **Scalability** | LAN-scale (tens of clients), not cloud multi-tenant — stated limitation |
| **Security** | See section 9 |

Hana (UU94149R) owns NFR/UAT narrative — but you must paraphrase if she hesitates.

---

## 11. Deployment story

### Primary: XAMPP laptop demo

- Apache + MySQL + PHP on Windows/Linux
- Copy `V2/` to `htdocs`
- Import schema/seed, run `install.php`
- Set `config/app.php` `url` or `APP_URL` env
- **Most reliable for defense** — no network firewall issues

### Optional: Raspberry Pi 3 B+

- Native LAMP on Raspberry Pi OS Bookworm
- App at `/var/www/cafe-audit/public`
- Pi on cafe Wi‑Fi; phones scan QR on same network
- Narrative: **low-cost on-premise server**
- Guide: `deployment/raspberry-pi/README.md`, `install.sh`

### Optional: Docker cloud

- `deployment/cloud/docker-compose.yml` — builds from repo root, app from `V2/`
- Railway / Render for portfolio backup
- Ephemeral disk warning for uploads

### Why not Vercel?

No PHP runtime, no MySQL, no persistent filesystem for sessions and payment screenshots. GitHub Pages is static-only. Our stack needs **stateful LAMP**.

---

## 12. Demo script — 15 minutes (step-by-step)

| Min | Action | Login | Talking point |
|-----|--------|-------|---------------|
| 0–1 | Intro slide + architecture diagram | — | Problem: reconciliation gap |
| 1–2 | Open login page | — | LAN deployment, no cloud required |
| 2–3 | Dashboard | manager | Low stock, open shift, KPIs |
| 3–4 | Products & recipes | manager | Link menu to ingredients |
| 4–5 | Tables + QR | manager | Each table unique token |
| 5–7 | Phone scans QR, order 2 items | customer | Same Wi‑Fi critical |
| 7–8 | Kitchen board | kitchen1 | Status workflow |
| 8–9 | Waiter tablet | waiter1 | Alternative to QR |
| 9–10 | Customer bill + upload payment | customer | VAT + service charge |
| 10–11 | Approve payment | cashier1 | Marks paid → deducts stock |
| 11–13 | Audit reconciliation | auditor | Enter physical counts, show 10% flag |
| 13–14 | Reports export | manager | CSV / print PDF |
| 14–15 | Q&A | — | Limitations + future work |

**Backup plan:** If Wi‑Fi blocks phones, pre-record a 60-second screen capture of QR flow.

---

## 13. Likely examiner questions and suggested answers

### Technical

**Q: How is variance calculated?**  
A: For each item, discrepancy = physical minus system quantity. Variance percent is absolute discrepancy divided by system quantity, times 100. If system is zero but physical is not, we treat variance as 100%. Items above 10% threshold are flagged.

**Q: When is inventory deducted?**  
A: On manual POS sale immediately when recorded. For table orders, only when the order status becomes paid and a sale row is created. Recipes define how much of each ingredient per product.

**Q: Why PHP and not Node/React?**  
A: Alignment with course stack, XAMPP availability, and cafe LAN deployment patterns. Server-rendered pages are simpler for staff on tablets.

**Q: How do you prevent SQL injection?**  
A: PDO prepared statements in all models; no string concatenation of user input in SQL.

**Q: Explain three-tier architecture.**  
A: Presentation = browser views; application = PHP controllers/models; data = MySQL. Apache routes HTTP to `public/index.php`.

**Q: What happens if two waiters edit the same table?**  
A: Orders are rows keyed by order_id; last write wins on status. Honest limitation — production would add locking or optimistic concurrency.

### Project management

**Q: What was your role as leader?**  
A: Architecture, audit engine, sales, reporting, integration testing, and coordinating module interfaces (orders → sales → inventory).

**Q: How did you gather requirements?**  
A: Martha led stakeholder interviews and SRS; use cases for auditor, manager, waiter; we iterated after prototype demos.

**Q: How did you test?**  
A: Unit tests on backend modules (Biruk); UAT scripts with Hana; I ran integration paths across roles.

**Q: Biggest challenge?**  
A: Linking table order lifecycle to inventory deduction only on payment — avoiding double deduction and race with audit.

**Q: What would you do differently?**  
A: API layer for mobile app; HTTPS; object storage for uploads; automated backup.

---

## 14. Per-teammate cheat sheet

| Teammate | ID | Should speak about | Dagim covers if needed |
|----------|-----|-------------------|------------------------|
| **Martha Tilahun** | UU94151R | SRS, stakeholder interviews, use cases, problem domain | Requirements traceability to audit and sales modules |
| **Hana Wabe** | UU94149R | NFR, UAT test cases, audit user acceptance | Variance threshold usability; 10% flag visibility |
| **Biruk G/Tinsae** | UU92993R | ERD, inventory CRUD, suppliers, PO, unit tests | `inventory`, `suppliers`, `purchase_orders` tables |
| **Yanet Daniel** | UU94260R | Wireframes, UI mockups, Bootstrap layout | Role-based navigation; customer menu simplicity |
| **Amir Mohammed** | UU8784 | XAMPP setup, shifts module, reports UI, presentation slides | `Shift::autoClockIn`, `opening_quantities`, DEPLOY docs |

**Division rule:** Each person answers first on their module. You intervene with **integration** context — how modules connect through database FKs and shift boundaries.

---

## 15. Risks, limitations, and future work (be honest)

### Limitations

- LAN-only customer QR — guest Wi‑Fi isolation breaks demo
- 1 GB Pi handles demo load, not busy restaurant peak
- Payment verification is manual screenshot review, not Telebirr API
- Single-branch; no multi-cafe central dashboard
- English UI; birr formatting basic
- No automated nightly backup in default install

### Risks mitigated

- Data loss: advise mysqldump before demo
- Wrong APP_URL: checklist in deployment guides
- Forgotten password: re-run `install.php` resets demo hashes

### Future work

- Telebirr/CBE payment API integration
- HTTPS with Let's Encrypt (WAN)
- S3-compatible storage for payment proofs
- PWA waiter app
- Multi-branch reporting
- Email/SMS alerts on high variance
- Docker Kubernetes — overkill for thesis; cloud optional

---

## 16. FR/NFR quick reference table

### Functional requirements (sample — align with your SRS)

| ID | Requirement | Module | Evidence |
|----|-------------|--------|----------|
| FR-01 | Staff login with role-based access | Auth | `AuthController`, `users.role` |
| FR-02 | Record manual sale | Sales | `SalesController`, `sales` table |
| FR-03 | Deduct ingredients via recipe | Sales/Orders | `recipes`, `Sale::record` |
| FR-04 | Physical audit with variance | Audit | `AuditController`, `audit_logs` |
| FR-05 | Flag variance above threshold | Audit | `variance_threshold_pct` |
| FR-06 | Log waste | Waste | `waste_logs` |
| FR-07 | Manage suppliers and POs | Inventory | Biruk's modules |
| FR-08 | Open/close shifts | Shifts | `shifts`, Amir's work |
| FR-09 | QR table ordering | V2 Orders | `restaurant_tables`, customer menu |
| FR-10 | Kitchen order display | V2 Kitchen | Order status transitions |
| FR-11 | Mobile payment upload | V2 Payments | `payment_submissions` |
| FR-12 | Export operational reports | Reports | CSV, print view |
| FR-13 | Manage tables and QR print | Tables | `TableController`, GD QR |

### Non-functional requirements (sample)

| ID | Requirement | Target | Evidence |
|----|-------------|--------|----------|
| NFR-01 | Response time on LAN | < 3 s page load | Local Apache, no CDN |
| NFR-02 | Password security | BCrypt | `install.php` cost 12 |
| NFR-03 | Session timeout | 30 min | `session_timeout` 1800 |
| NFR-04 | Usability | Bootstrap responsive | Yanet's mockups implemented |
| NFR-05 | Maintainability | MVC + docs | `SYSTEM_OVERVIEW.md`, guides |
| NFR-06 | Data integrity | 3NF, FK constraints | `schema.sql` InnoDB |
| NFR-07 | Offline LAN operation | No internet after setup | Pi / XAMPP |
| NFR-08 | Auditability | login_logs, audit_logs | Report exports |

---

## Final checklist — night before defense

- [ ] XAMPP (or Pi) running; `manager` / `admin123` works
- [ ] `APP_URL` matches how you open the app
- [ ] At least one table QR printed or on slide
- [ ] Phone on same Wi‑Fi tested
- [ ] Sample audit with one intentional variance > 10%
- [ ] Teammates know their 2-minute section
- [ ] Architecture diagram on slide
- [ ] GitHub repo URL ready for advisor
- [ ] This document skimmed once more

**You built the reconciliation heart of the system. Own the demo. Good luck, Dagim.**

— Unity University, Cafe Audit System, 2026
