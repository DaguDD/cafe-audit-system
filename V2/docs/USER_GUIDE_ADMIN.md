# Admin and Manager Guide — Cafe Audit System

## Login

URL: `{APP_URL}/login`  
Demo: `manager` / `admin123` or `admin` / `admin123`

## Dashboard

Shows today's revenue, active shifts, open tables, kitchen queue, low stock alerts, recent sales, and recent audits.

## Table and QR management

Tables & QR (manager/admin):

1. View all tables with live status and QR preview
2. Add Table — enter table number and capacity
3. Regenerate — invalidates old QR codes if a token is compromised
4. Print All QR Codes — printable sheet for table tents

Place printed QR codes on each physical table.

## Menu and recipes

Products (manager/admin):

1. Add menu items with price and category
2. Define recipes — ingredient quantities per single serving
3. Recipes power automatic stock deduction when orders are paid

Inventory:

- Add ingredients, units, and minimum thresholds
- Low-stock items appear on the dashboard

## Shifts

Staff shifts open automatically when server, kitchen, or staff users log in. Managers can also open or close shifts manually from the Shifts page.

## Suppliers and purchase orders

Create purchase orders, mark received, and inventory increases automatically.

## User management

Settings → Users and roles (manager/admin):

- Create accounts for servers, kitchen staff, and auditors
- Deactivate departed staff (do not delete — preserves audit trail)

## Reports

Analytics: export sales, audits, waste, and staff metrics as CSV. Print view supports Save as PDF.

## Order oversight

Active Tables: monitor dine-in sessions, view bills, approve mobile payments, or mark orders paid.

Payments: review customer Telebirr or bank transfer screenshots before closing a table.

## Configuration

Edit `config/app.php`:

- `url` — must match your Apache/XAMPP path
- `name` — system title (Cafe Audit System)
- `cafe_name` — business name shown on the customer menu
- `variance_threshold_pct` — audit alert threshold (default 10%)

Edit `config/database.php` for MySQL credentials.
