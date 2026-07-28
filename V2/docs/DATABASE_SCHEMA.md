# Database Schema — Cafe Audit System

Database name: `restaurant_v2`  
Engine: InnoDB · Charset: utf8mb4 · Normal form: 3NF

## Entity Relationship Summary

```text
users ──┬── shifts ──┬── opening_quantities
        │            ├── sales
        │            ├── waste_logs
        │            └── audit_logs
        │
        ├── orders (server_user_id)
        └── login_logs

restaurant_tables ── orders ── order_items ── products
                                              └── recipes ── inventory
                                                              └── suppliers
                                                                      └── purchase_orders

categories ── products
```

## Core Tables

### `users`
Staff accounts with RBAC roles: `admin`, `manager`, `auditor`, `server`, `kitchen`, `staff`.

### `restaurant_tables`
| Column | Type | Description |
|--------|------|-------------|
| table_id | INT PK | Internal ID |
| table_number | VARCHAR(10) UNIQUE | Display label (T01, T02…) |
| qr_token | VARCHAR(64) UNIQUE | Secret token embedded in QR URL |
| status | ENUM | available, occupied, ordering, bill_requested |
| capacity | INT | Seat count |

### `orders`
| Column | Type | Description |
|--------|------|-------------|
| order_id | INT PK | Order identifier |
| table_id | FK | Links to restaurant_tables |
| order_source | ENUM | `qr` or `server` |
| server_user_id | FK nullable | Set when server places order |
| status | ENUM | pending, committed, preparing, served, paid, cancelled |
| subtotal | DECIMAL | Sum of line items |
| shift_id | FK nullable | Set when paid |

### `order_items`
Line items per order with per-item status tracking.

### `sales` (extended)
Now includes optional `order_id` and `table_id` for table-order traceability.

### `opening_quantities`
Shift opening stock snapshot per ingredient for audit baseline.

## V1 Tables (unchanged purpose)

| Table | Purpose |
|-------|---------|
| inventory | Ingredient stock levels |
| products | Menu items & prices |
| recipes | Ingredient qty per product |
| audit_logs | Physical vs system reconciliation |
| waste_logs | Spoilage/damage tracking |
| purchase_orders | Supplier orders |
| shifts | Staff shift open/close |
| suppliers | Vendor directory |
| categories | Product grouping |

## Indexes

- `orders`: `(status)`, `(table_id)`
- `sales`: `(sold_at)`
- `audit_logs`: `(audited_at)`
- `inventory`: `(current_qty, min_threshold)` for low-stock queries

## Install Order

```bash
mysql -u root < database/schema.sql
mysql -u root restaurant_v2 < database/seed.sql
php database/install.php
```

## Sample QR Token (from seed)

Table T01 token: `qr_t01_a8f3c2d1e9b4`  
Menu URL: `{APP_URL}/customer/menu.php?table=qr_t01_a8f3c2d1e9b4`
