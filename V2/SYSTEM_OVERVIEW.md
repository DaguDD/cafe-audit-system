# System Overview — Cafe Audit System

## Purpose

The Cafe Audit System is a web-based platform for cafe and restaurant operations. Its main scope is inventory audit and reconciliation: comparing physical stock counts against system records, flagging discrepancies, and keeping sales tied to real ingredient usage.

The same application also supports day-to-day service: table QR ordering, server tablet, kitchen display, billing with VAT and service charge, mobile payment verification, and staff shift tracking.

## Core problem

Cafes track sales digitally (POS) and inventory physically (stock room). Without linking recipes to sales, discrepancies grow silently. This system addresses that by:

1. Recipe-based ingredient deduction when orders are paid
2. Physical audit and reconciliation with variance alerts (default threshold 10%)
3. Waste tracking for spoilage, spills, and damage
4. Table-linked ordering so dine-in sales map to a table session
5. Reports and shift records for operational oversight

## Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Customer QR    │     │  Server Tablet   │     │  Kitchen Display│
│  (no login)     │     │  (server login)  │     │  (kitchen login)│
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │   Order Engine (PHP)   │
                    │  orders / order_items  │
                    └────────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ restaurant_tables│   │ sales + recipes │   │ inventory + audit│
│ QR token → table │   │ deduction on pay│   │ reconciliation   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

## User roles

| Role | Access |
|------|--------|
| admin | Full system + user management |
| manager | Inventory, products, tables, shifts, suppliers, reports |
| auditor | Physical counts, reconciliation, waste logs, reports |
| server (waiter) | Waiter tablet, active tables, billing |
| kitchen | Kitchen display, inventory view, products/recipes, waste |
| staff (cashier) | Payments review, counter POS sales, waste |

## Audit / reconciliation (main scope)

- Opening quantities recorded per shift in `opening_quantities`
- Expected system qty = current inventory (updated by sales, waste, PO receipts)
- Physical audit compares counted qty vs system qty
- Variance % calculated; flagged if above threshold (configurable in `config/app.php`)
- After audit, inventory can sync to physical count

## Table ordering (integrated module)

Option 1 — Customer QR flow:

1. Each table has a unique `qr_token` in `restaurant_tables`
2. Admin prints QR codes linking to `/public/customer/menu.php?table=TOKEN`
3. Customer browses menu, submits order
4. Kitchen receives order; customer can view itemized bill and pay via mobile transfer

Option 2 — Waiter tablet fallback:

1. Waiter logs in, selects table, builds order on tablet
2. Same kitchen and billing flow as QR orders

## Order status lifecycle

```text
pending → committed → preparing → served → paid
                              ↘ cancelled
```

Stock is checked when the order is placed; inventory is deducted when the order is marked paid (via product recipes).

## Itemized customer receipt

Customers see subtotal, VAT, service charge, optional tip, and who served the table. Rates are in `config/app.php` under `billing`.

## Smart auto-managed shifts

Waiter, cashier, and kitchen users are clocked in on login and clocked out on logout. Managers can also open or close shifts manually.

## Technology

- Apache + PHP 8 + MySQL (XAMPP deployment)
- Bootstrap 5 for staff and customer UI
- PDO for database access, BCrypt for passwords, CSRF on staff forms
- Local QR generation (phpqrcode + PHP GD)

## Deployment

Designed for local LAN (cafe Wi‑Fi). Customers scan QR on the same network as the server. No cloud dependency required.
