# Cafe Audit System

Web application for cafe inventory audit, reconciliation, sales tracking, recipe-based stock control, table ordering, kitchen workflow, and staff reporting. PHP 8, MySQL, Bootstrap 5. Designed for XAMPP or Apache on a local network.

## Main scope

- Physical inventory audits and variance detection
- Recipe-linked stock deduction when sales are recorded
- Waste logging, suppliers, and purchase orders
- Shift tracking and operational reports

Integrated modules in the same system:

- Table QR ordering and kitchen display
- Itemized billing (VAT, service charge, tips)
- Mobile payment verification (Telebirr / bank)
- Auto-managed staff shifts on login/logout

## Stack

| Layer | Technology |
|-------|------------|
| Server | Apache (XAMPP) with mod_rewrite |
| Backend | PHP 8.x, MVC |
| Database | MySQL / MariaDB |
| Frontend | HTML5, Bootstrap 5, JavaScript |
| QR codes | phpqrcode + PHP GD |

## Quick start (XAMPP)

1. Copy this folder to `htdocs/` (or configure a virtual host)
2. Start Apache and MySQL in XAMPP
3. Import `database/schema.sql` then `database/seed.sql`
4. Run `php database/install.php`
5. Open the URL set in `config/app.php` (default for local Apache: adjust to match your path)

Default database: `restaurant_v2` (development) or `cafe_audit` (shareable package).

Edit `config/app.php`:

- `name` — Cafe Audit System
- `cafe_name` — business name on customer menu
- `url` — must match how you access `public/` in the browser

## Demo logins

Password for all demo users: `admin123`

| Username | Role |
|----------|------|
| admin | Admin |
| manager | Manager |
| auditor | Auditor |
| waiter1 | Waiter (floor) |
| cashier1 | Cashier |
| staff1 | Cashier (legacy alias) |
| kitchen1 | Kitchen |

## Deployment

Optional deployment guides: **[../deployment/cloud/](../deployment/cloud/)** (Docker / Railway / Render) and **[../deployment/raspberry-pi/](../deployment/raspberry-pi/)** (native LAMP on Raspberry Pi).

For thesis defense, use **XAMPP on your LAN** or a **Pi on cafe Wi‑Fi** as the primary demo.

## Documentation
- `SYSTEM_OVERVIEW.md` — architecture and features
- `docs/AUDIT_WORKFLOW.md` — audit process (core scope)
- `docs/USER_GUIDE_ADMIN.md` — manager guide
- `docs/USER_GUIDE_WAITER.md` — waiter guide
- `docs/USER_GUIDE_CUSTOMER.md` — customer QR flow
- `docs/BILLING_AND_SHIFTS.md` — receipts, payments, shifts
- `docs/EXAMINER_DATABASE_CHEATSHEET_PC.md` — MySQL commands for defense (PC / XAMPP)
- `docs/DATABASE_SCHEMA.md` — schema and ERD summary

## Project layout

```text
app/          Controllers, models, views
config/       app.php, database.php
database/     schema.sql, seed.sql, install.php
docs/         User and workflow guides
lib/          QR generator
public/       Web root (index.php, customer menu)
storage/      Payment screenshot uploads
```

Unity University — Cafe Audit System
