# Billing, Receipts, and Staff Shifts — Cafe Audit System

## Itemized customer receipt

Customers with active orders see View itemized bill on the table menu. The receipt shows:

| Line | Description |
|------|-------------|
| Line items | Qty × product name and line total |
| Subtotal | Sum of menu items |
| VAT | Configurable % (`config/app.php` → `billing.vat_rate`, default 15%) |
| Service charge | Configurable % (`billing.service_charge_rate`, default 10%) |
| Tip | Optional — customer chooses preset or custom amount |
| Total due | Subtotal + VAT + service + tip |

Server transparency: the receipt displays who served the table (server name from tablet orders) or “Self-service (QR menu)” for QR-only orders.

## Mobile payment flow

1. Customer taps Pay Bill
2. Sees Telebirr or bank account details (Settings → Payment details)
3. Pays exact total from receipt
4. Enters transaction reference and uploads screenshot
5. Staff approves under Payments or Active Tables

### Anti-fraud

- Exact amount match (including VAT, service, tip)
- Unique transaction reference
- Screenshot SHA-256 hash (no duplicate images)
- One pending payment per table
- Max 3 attempts per hour per table
- Manual staff approval required

## Auto-managed staff shifts

| Event | Behavior |
|-------|----------|
| Server / staff / kitchen login | Auto-opens shift (`auto_managed = 1`) if none active |
| Logout | Auto-closes shift, records `closed_at` |
| Shifts page | Live duration for active staff; today's completed shifts with hours |
| Manager | Can still manually open/close or force clock-out |

Cafe hours displayed from `config/app.php` → `cafe_hours` (default 08:00–22:00).

## Database patches (existing installs only)

```bash
mysql -u root restaurant_v2 < database/patch_payment.sql
mysql -u root restaurant_v2 < database/patch_v3.sql
```

## QR codes

QR images use phpqrcode with PHP GD. Admin pages embed codes via data URI. Enable GD in php.ini if codes do not appear.
