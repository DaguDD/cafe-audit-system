# Database Command Cheatsheet — Cafe Audit System (PC / XAMPP)

Use on your **development PC** during defense (XAMPP or local MySQL).  
Database: **`restaurant_v2`** · Engine: **MySQL / MariaDB**

---

## Project paths (this machine)

| Item | Path |
|------|------|
| V2 app folder | `/home/dagim/Desktop/Final Project/V2` |
| Schema SQL | `V2/database/schema.sql` |
| Seed SQL | `V2/database/seed.sql` |
| DB config | `V2/config/database.php` |
| App URL config | `V2/config/app.php` |

---

## Connection options

Pick **one** method that works on your PC:

| Method | When to use | Connect command |
|--------|-------------|-----------------|
| **Root (no password)** | Default XAMPP / many local Linux installs | `mysql -u root restaurant_v2` |
| **Root (with password)** | If you set a MySQL root password | `mysql -u root -p restaurant_v2` |
| **App user** | After running `database/create-mysql-user.sql` | `mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2` |

**Shortcut for this cheatsheet** — set once per terminal session:

```bash
# Linux PC (most common for this project):
alias mysqldb='mysql -u root restaurant_v2'

# If root has a password, use instead:
# alias mysqldb='mysql -u root -pYOUR_PASSWORD restaurant_v2'

# If you created restaurant_user:
# alias mysqldb='mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2'
```

Then replace `mysql -u root restaurant_v2` below with `mysqldb`, or use the alias in all examples.

**Windows XAMPP** (Command Prompt):

```cmd
C:\xampp\mysql\bin\mysql.exe -u root restaurant_v2
```

---

## First-time setup (if database is empty)

From the V2 folder:

```bash
cd "/home/dagim/Desktop/Final Project/V2"

# 1. Create tables
mysql -u root < database/schema.sql

# 2. Optional: dedicated app user
mysql -u root < database/create-mysql-user.sql

# 3. Seed demo data
mysql -u root restaurant_v2 < database/seed.sql

# 4. Demo users, tables, QR tokens
php database/install.php
```

Start **Apache** and **MySQL** in XAMPP before opening the app in the browser.

---

## 1. Connect

**Interactive shell:**

```bash
mysql -u root restaurant_v2
```

**One command without staying inside MySQL:**

```bash
mysql -u root restaurant_v2 -e "SHOW TABLES;"
```

Exit MySQL shell: `exit`

---

## 2. Basic database info

```bash
mysql -u root restaurant_v2 -e "SELECT DATABASE();"
mysql -u root restaurant_v2 -e "SHOW TABLES;"
mysql -u root restaurant_v2 -e "SHOW TABLE STATUS;"
```

**Count tables:**

```bash
mysql -u root restaurant_v2 -e \
"SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='restaurant_v2';"
```

---

## 3. List all tables (with row counts)

```bash
mysql -u root restaurant_v2 -e "
SELECT table_name AS 'Table', table_rows AS 'Approx rows'
FROM information_schema.tables
WHERE table_schema = 'restaurant_v2'
ORDER BY table_name;"
```

---

## 4. Describe table structure

**Single table:**

```bash
mysql -u root restaurant_v2 -e "DESCRIBE users;"
mysql -u root restaurant_v2 -e "DESCRIBE orders;"
mysql -u root restaurant_v2 -e "DESCRIBE inventory;"
```

**Full CREATE statement (shows keys and foreign keys):**

```bash
mysql -u root restaurant_v2 -e "SHOW CREATE TABLE orders\G"
```

**All columns in all tables:**

```bash
mysql -u root restaurant_v2 -e "
SELECT table_name, column_name, column_type, is_nullable, column_key
FROM information_schema.columns
WHERE table_schema = 'restaurant_v2'
ORDER BY table_name, ordinal_position;"
```

---

## 5. Show relationships (foreign keys) — ERD in terminal

**All relationships:**

```bash
mysql -u root restaurant_v2 -e "
SELECT
  TABLE_NAME AS 'From table',
  COLUMN_NAME AS 'Column',
  REFERENCED_TABLE_NAME AS 'References table',
  REFERENCED_COLUMN_NAME AS 'References column'
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'restaurant_v2'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;"
```

**Relationships for one table (example: orders):**

```bash
mysql -u root restaurant_v2 -e "
SELECT
  TABLE_NAME, COLUMN_NAME,
  REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'restaurant_v2'
  AND (TABLE_NAME = 'orders' OR REFERENCED_TABLE_NAME = 'orders')
  AND REFERENCED_TABLE_NAME IS NOT NULL;"
```

**What to say in defense:**  
“This reads `information_schema`, MySQL’s system catalog. It lists every foreign key — the same relationships shown in an ERD.”

---

## 6. Staff and roles

```bash
mysql -u root restaurant_v2 -e "
SELECT user_id, username, full_name, role, status FROM users ORDER BY role, username;"
```

```bash
mysql -u root restaurant_v2 -e "
SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## 7. Tables, orders, menu

**Cafe tables and QR status:**

```bash
mysql -u root restaurant_v2 -e "
SELECT table_id, table_number, status, capacity, qr_token FROM restaurant_tables;"
```

**Products and prices:**

```bash
mysql -u root restaurant_v2 -e "
SELECT p.product_id, p.name, c.name AS category, p.price, p.status
FROM products p
LEFT JOIN categories c ON c.cat_id = p.cat_id
ORDER BY p.product_id;"
```

**Active orders:**

```bash
mysql -u root restaurant_v2 -e "
SELECT o.order_id, t.table_number, o.order_source, o.status, o.subtotal, o.created_at
FROM orders o
JOIN restaurant_tables t ON t.table_id = o.table_id
WHERE o.status NOT IN ('paid', 'cancelled')
ORDER BY o.created_at DESC;"
```

**Order line items (JOIN demo):**

```bash
mysql -u root restaurant_v2 -e "
SELECT oi.order_item_id, o.order_id, t.table_number, p.name AS product,
       oi.qty, oi.unit_price, oi.line_total, oi.item_status
FROM order_items oi
JOIN orders o ON o.order_id = oi.order_id
JOIN restaurant_tables t ON t.table_id = o.table_id
JOIN products p ON p.product_id = oi.product_id
ORDER BY oi.order_item_id DESC
LIMIT 15;"
```

---

## 8. Inventory, recipes, suppliers

**Inventory stock:**

```bash
mysql -u root restaurant_v2 -e "
SELECT item_id, name, unit, current_qty, min_threshold, unit_cost, status
FROM inventory ORDER BY name;"
```

**Low stock:**

```bash
mysql -u root restaurant_v2 -e "
SELECT name, current_qty, min_threshold, unit
FROM inventory
WHERE current_qty <= min_threshold;"
```

**Recipes (product → ingredients):**

```bash
mysql -u root restaurant_v2 -e "
SELECT p.name AS product, i.name AS ingredient, r.qty_needed, i.unit
FROM recipes r
JOIN products p ON p.product_id = r.product_id
JOIN inventory i ON i.item_id = r.item_id
ORDER BY p.name, i.name;"
```

**Suppliers and purchase orders:**

```bash
mysql -u root restaurant_v2 -e "
SELECT po.po_id, s.name AS supplier, i.name AS item,
       po.ordered_qty, po.unit_cost, po.total_cost, po.status
FROM purchase_orders po
JOIN suppliers s ON s.sup_id = po.sup_id
JOIN inventory i ON i.item_id = po.item_id
ORDER BY po.po_id DESC;"
```

---

## 9. Sales, audit, waste, payments

**Today’s sales:**

```bash
mysql -u root restaurant_v2 -e "
SELECT s.sale_id, p.name AS product, s.qty_sold, s.unit_price, s.total, s.sold_at
FROM sales s
JOIN products p ON p.product_id = s.product_id
WHERE DATE(s.sold_at) = CURDATE()
ORDER BY s.sold_at DESC;"
```

**Audit logs:**

```bash
mysql -u root restaurant_v2 -e "
SELECT a.audit_id, i.name AS item, a.system_qty, a.physical_qty,
       a.discrepancy, a.variance_pct, a.audited_at
FROM audit_logs a
JOIN inventory i ON i.item_id = a.item_id
ORDER BY a.audited_at DESC
LIMIT 10;"
```

**Waste logs:**

```bash
mysql -u root restaurant_v2 -e "
SELECT w.waste_id, i.name AS item, w.waste_qty, w.reason, w.logged_at
FROM waste_logs w
JOIN inventory i ON i.item_id = w.item_id
ORDER BY w.logged_at DESC
LIMIT 10;"
```

**Payment submissions:**

```bash
mysql -u root restaurant_v2 -e "
SELECT ps.submission_id, t.table_number, ps.amount_expected, ps.amount_claimed,
       ps.payment_method, ps.reference_number, ps.status, ps.created_at
FROM payment_submissions ps
JOIN restaurant_tables t ON t.table_id = ps.table_id
ORDER BY ps.created_at DESC
LIMIT 10;"
```

**Pending payments only:**

```bash
mysql -u root restaurant_v2 -e "
SELECT submission_id, reference_number, amount_claimed, status, created_at
FROM payment_submissions
WHERE status = 'pending';"
```

---

## 10. Shifts

```bash
mysql -u root restaurant_v2 -e "
SELECT s.shift_id, u.username, u.role, s.status, s.opened_at, s.closed_at
FROM shifts s
JOIN users u ON u.user_id = s.user_id
ORDER BY s.opened_at DESC
LIMIT 10;"
```

---

## 11. Summary queries (good for examiners)

**Revenue today:**

```bash
mysql -u root restaurant_v2 -e "
SELECT COUNT(*) AS sales_count, COALESCE(SUM(total), 0) AS revenue_etb
FROM sales WHERE DATE(sold_at) = CURDATE();"
```

**Orders by status:**

```bash
mysql -u root restaurant_v2 -e "
SELECT status, COUNT(*) AS count FROM orders GROUP BY status;"
```

**Users by role:**

```bash
mysql -u root restaurant_v2 -e "
SELECT role, COUNT(*) AS count FROM users WHERE status='active' GROUP BY role;"
```

---

## 12. Export schema (structure only)

```bash
mysqldump -u root --no-data restaurant_v2
```

Save to file:

```bash
mysqldump -u root --no-data restaurant_v2 > ~/restaurant_v2_schema.sql
cat ~/restaurant_v2_schema.sql
```

---

## 13. Interactive MySQL session (step-by-step demo)

```bash
mysql -u root restaurant_v2
```

Then inside MySQL:

```sql
SHOW TABLES;

DESCRIBE users;
DESCRIBE orders;
DESCRIBE order_items;

SELECT username, role FROM users;

SELECT table_number, status FROM restaurant_tables;

SELECT TABLE_NAME, REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'restaurant_v2'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

exit
```

---

## 14. Quick reference

| Goal | Command |
|------|---------|
| Connect | `mysql -u root restaurant_v2` |
| List tables | `SHOW TABLES;` |
| Table structure | `DESCRIBE tablename;` |
| See foreign keys | `SHOW CREATE TABLE tablename\G` |
| All relationships | Section 5 query (`information_schema`) |
| View rows | `SELECT * FROM tablename LIMIT 10;` |
| Export structure | `mysqldump -u root --no-data restaurant_v2` |
| Re-seed demo | `php database/install.php` (from V2 folder) |

---

## 15. Full database overview (one script)

Run on your PC:

```bash
DB_CMD="mysql -u root"
DB_NAME=restaurant_v2

echo "=== TABLES ==="
$DB_CMD $DB_NAME -e "SHOW TABLES;"

echo "=== ROW COUNTS ==="
$DB_CMD $DB_NAME -e "
SELECT table_name, table_rows FROM information_schema.tables
WHERE table_schema='$DB_NAME' ORDER BY table_name;"

echo "=== FOREIGN KEYS (RELATIONSHIPS) ==="
$DB_CMD $DB_NAME -e "
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA='$DB_NAME' AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;"

echo "=== USERS ==="
$DB_CMD $DB_NAME -e "SELECT username, full_name, role FROM users;"
```

If root has a password: `DB_CMD="mysql -u root -pYOUR_PASSWORD"`

---

## PC vs Raspberry Pi

| | **This PC (XAMPP)** | **Raspberry Pi** |
|---|---------------------|------------------|
| Cheatsheet | `V2/docs/EXAMINER_DATABASE_CHEATSHEET_PC.md` | `cafe-audit-pi-bundle/EXAMINER_DATABASE_CHEATSHEET.md` |
| Typical connect | `mysql -u root restaurant_v2` | `mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2` |
| Schema path | `V2/database/schema.sql` | `/var/www/cafe-audit/database/schema.sql` |
| App URL | `config/app.php` → `url` | `/etc/cafe-audit/env` → `APP_URL` |

---

## Defense tips

1. Run **section 5** when they ask for the relationship diagram.
2. Run one **JOIN** query (section 7) to show real linked data.
3. Say the schema is **3NF** with **InnoDB foreign keys**.
4. Demo login in browser: **manager** / **admin123**
5. Open schema file if asked: `V2/database/schema.sql`
