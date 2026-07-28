# Customer Guide — Cafe Audit System

## How it works

Each table has a QR code on a tent or sticker. Scanning it opens the mobile menu through the Cafe Audit System. No app download or login is required.

## Step-by-step

### 1. Scan QR code

Use your phone camera or a QR scanner app. The link format is:

```text
{your-cafe-url}/customer/menu.php?table=UNIQUE_TOKEN
```

The page shows the cafe name, the Cafe Audit System header, and your table number (for example Table T03).

### 2. Browse menu

Items are grouped by category (Hot Drinks, Food, and so on). Each card shows name, description, and price in ETB.

### 3. Add to cart

Tap Add on any item. Tap the Cart button to review quantities. Use minus and plus to adjust.

### 4. Submit order

1. Open the cart drawer
2. Optionally add special requests (for example extra hot, no sugar)
3. Tap Send to Kitchen
4. A confirmation appears; order status shows under Your orders

### 5. Track status

| Status     | Meaning                    |
|------------|----------------------------|
| committed  | Received by kitchen        |
| preparing  | Being made                 |
| served     | On the way or delivered    |
| paid       | Bill settled               |

Reload the page to see status updates.

### 6. View itemized bill

Tap View itemized bill to expand a receipt showing line items, VAT, service charge, who served you, and optional tip.

### 7. Pay your bill

When you are ready to leave:

1. Tap Pay Bill
2. Review the itemized total (including VAT and service charge)
3. Optionally add a tip
4. Pay via Telebirr or bank transfer using the account details shown
5. Enter the transaction reference and upload a screenshot of your payment
6. Staff will verify and close your table

You can also tap Request Bill to notify a server if you prefer to pay in person.

## Troubleshooting

| Issue              | Solution                                      |
|--------------------|-----------------------------------------------|
| Table not found    | Rescan QR; ask staff for a new code           |
| Insufficient stock | Item unavailable — choose something else    |
| Page won't load    | Connect to the cafe Wi-Fi                     |
| Wrong table        | Do not order — ask staff to move you          |

## Privacy

- No personal account is required
- The table is identified only by an anonymous QR token
- The token belongs to the table, not to an individual customer

## Demo URL

For local testing with seed data:

```text
http://restaurant-v2.local/customer/menu.php?table=qr_t01_a8f3c2d1e9b4
```

This opens the menu for demo Table T01.
