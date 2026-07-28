# Audit Workflow — Cafe Audit System

## Goal

Eliminate the reconciliation gap between what the system thinks you have and what is physically on the shelf.

This is the primary scope of the Cafe Audit System.

## Actors

- Manager — opens shifts, receives purchase orders, manages inventory master data
- Auditor — performs physical counts and submits reconciliation
- System — calculates expected qty, variance %, flags discrepancies above the threshold

## Daily workflow

### 1. Shift open

1. Manager or staff logs in (shifts can open automatically for operational roles)
2. System records opening quantities for active inventory items when a shift is opened manually
3. Opening qty = current system qty at shift start

### 2. Operations (automatic)

During service, inventory changes via:

| Event | Effect on inventory |
|-------|---------------------|
| Table order paid | Recipe ingredients deducted |
| Manual POS sale | Recipe ingredients deducted |
| Waste logged | Item qty reduced |
| PO received | Item qty increased |

### 3. Physical count (auditor)

1. Auditor → Reconciliation
2. Count each ingredient physically
3. Enter physical qty per item
4. Add optional comments
5. Submit batch

### 4. System calculation

For each item:

```text
system_qty   = current inventory in database
physical_qty = auditor's count
discrepancy  = physical_qty - system_qty
variance_pct = |discrepancy / system_qty| × 100  (or 100% if system_qty = 0)
```

### 5. Variance alerts

Configured in `config/app.php`:

```php
'variance_threshold_pct' => 10,
```

Items exceeding 10% variance are highlighted as high shortage or high surplus in the UI and reports.

### 6. Inventory sync

After audit submission, `inventory.current_qty` is updated to match `physical_qty`. This resets the system baseline until the next sales, waste, or purchase order events.

## Reports

Analytics module exports:

- Sales CSV
- Audit history CSV
- Waste logs CSV
- Staff performance
- Login events

Print view supports browser Save as PDF.

## Best practices

1. Audit at consistent intervals (end of shift or daily)
2. Investigate variances above the threshold before syncing (check waste logs, unpaid orders)
3. Ensure table orders are marked paid before auditing — committed but unpaid orders do not deduct inventory yet
4. Cross-reference kitchen waste with variance on high-usage items (milk, coffee)

## Table ordering and audits

Table orders in committed, preparing, or served status have not yet deducted inventory. Only paid orders create sales rows and trigger recipe deduction. Auditors should confirm no large backlog of unpaid table sessions before counting.
