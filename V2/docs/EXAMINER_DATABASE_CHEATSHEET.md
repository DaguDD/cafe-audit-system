# Database Command Cheatsheet — Cafe Audit System (Raspberry Pi)

> **PC / XAMPP version:** see `V2/docs/EXAMINER_DATABASE_CHEATSHEET_PC.md`

Use on the **Raspberry Pi** terminal during defense. Database: **`restaurant_v2`** · Engine: **MariaDB/MySQL**

Credentials (also in `/etc/cafe-audit/env`):

| Setting | Value |
|---------|-------|
| Host | `127.0.0.1` |
| Database | `restaurant_v2` |
| User | `restaurant_user` |
| Password | `restaurant_v2_pass` |

Schema file on Pi: `/var/www/cafe-audit/database/schema.sql`

---

## 1. Connect

**App user (recommended for demo):**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2
```

**Root (full admin):**

```bash
sudo mysql restaurant_v2
```

**Run one command without entering MySQL:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "SHOW TABLES;"
```

Exit MySQL shell: `exit`

---

## 2. Basic database info

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "SELECT DATABASE();"
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "SHOW TABLES;"
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "SHOW TABLE STATUS;"
```

**Count tables:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e \
"SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema='restaurant_v2';"
```

---

## 3. List all tables (with row counts)

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT table_name AS 'Table', table_rows AS 'Approx rows'
FROM information_schema.tables
WHERE table_schema = 'restaurant_v2'
ORDER BY table_name;"
```

---

## 4. Describe table structure

**Single table:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "DESCRIBE users;"
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "DESCRIBE orders;"
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "DESCRIBE inventory;"
```

**Full CREATE statement (shows keys and foreign keys):**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "SHOW CREATE TABLE orders\G"
```

**All columns in all tables:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT table_name, column_name, column_type, is_nullable, column_key
FROM information_schema.columns
WHERE table_schema = 'restaurant_v2'
ORDER BY table_name, ordinal_position;"
```

---

## 5. Show relationships (foreign keys) — ERD in terminal

**All relationships:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
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
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT
  TABLE_NAME, COLUMN_NAME,
  REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'restaurant_v2'
  AND (TABLE_NAME = 'orders' OR REFERENCED_TABLE_NAME = 'orders')
  AND REFERENCED_TABLE_NAME IS NOT NULL;"
```

**What to say in defense:**  
“This reads `information_schema`, MariaDB’s system catalog. It lists every foreign key — the same relationships shown in an ERD.”

---

## 6. Staff and roles

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT user_id, username, full_name, role, status FROM users ORDER BY role, username;"
```

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT * FROM login_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## 7. Tables, orders, menu

**Cafe tables and QR status:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT table_id, table_number, status, capacity, qr_token FROM restaurant_tables;"
```

**Products and prices:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT p.product_id, p.name, c.name AS category, p.price, p.status
FROM products p
LEFT JOIN categories c ON c.cat_id = p.cat_id
ORDER BY p.product_id;"
```

**Active orders:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT o.order_id, t.table_number, o.order_source, o.status, o.subtotal, o.created_at
FROM orders o
JOIN restaurant_tables t ON t.table_id = o.table_id
WHERE o.status NOT IN ('paid', 'cancelled')
ORDER BY o.created_at DESC;"
```

**Order line items (JOIN demo):**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
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
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT item_id, name, unit, current_qty, min_threshold, unit_cost, status
FROM inventory ORDER BY name;"
```

**Low stock:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT name, current_qty, min_threshold, unit
FROM inventory
WHERE current_qty <= min_threshold;"
```

**Recipes (product → ingredients):**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT p.name AS product, i.name AS ingredient, r.qty_needed, i.unit
FROM recipes r
JOIN products p ON p.product_id = r.product_id
JOIN inventory i ON i.item_id = r.item_id
ORDER BY p.name, i.name;"
```

**Suppliers and purchase orders:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
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
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT s.sale_id, p.name AS product, s.qty_sold, s.unit_price, s.total, s.sold_at
FROM sales s
JOIN products p ON p.product_id = s.product_id
WHERE DATE(s.sold_at) = CURDATE()
ORDER BY s.sold_at DESC;"
```

**Audit logs:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT a.audit_id, i.name AS item, a.system_qty, a.physical_qty,
       a.discrepancy, a.variance_pct, a.audited_at
FROM audit_logs a
JOIN inventory i ON i.item_id = a.item_id
ORDER BY a.audited_at DESC
LIMIT 10;"
```

**Waste logs:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT w.waste_id, i.name AS item, w.waste_qty, w.reason, w.logged_at
FROM waste_logs w
JOIN inventory i ON i.item_id = w.item_id
ORDER BY w.logged_at DESC
LIMIT 10;"
```

**Payment submissions:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT ps.submission_id, t.table_number, ps.amount_expected, ps.amount_claimed,
       ps.payment_method, ps.reference_number, ps.status, ps.created_at
FROM payment_submissions ps
JOIN restaurant_tables t ON t.table_id = ps.table_id
ORDER BY ps.created_at DESC
LIMIT 10;"
```

**Pending payments only:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT submission_id, reference_number, amount_claimed, status, created_at
FROM payment_submissions
WHERE status = 'pending';"
```

---

## 10. Shifts

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
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
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT COUNT(*) AS sales_count, COALESCE(SUM(total), 0) AS revenue_etb
FROM sales WHERE DATE(sold_at) = CURDATE();"
```

**Orders by status:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT status, COUNT(*) AS count FROM orders GROUP BY status;"
```

**Users by role:**

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2 -e "
SELECT role, COUNT(*) AS count FROM users WHERE status='active' GROUP BY role;"
```

---

## 12. Export schema (structure only)

```bash
mysqldump -u restaurant_user -prestaurant_v2_pass --no-data restaurant_v2
```

Save to file:

```bash
mysqldump -u restaurant_user -prestaurant_v2_pass --no-data restaurant_v2 > ~/restaurant_v2_schema.sql
cat ~/restaurant_v2_schema.sql
```

---

## 13. Interactive MySQL session (step-by-step demo)

```bash
mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2
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
| Connect | `mysql -u restaurant_user -prestaurant_v2_pass restaurant_v2` |
| List tables | `SHOW TABLES;` |
| Table structure | `DESCRIBE tablename;` |
| See foreign keys | `SHOW CREATE TABLE tablename\G` |
| All relationships | Section 5 query (`information_schema`) |
| View rows | `SELECT * FROM tablename LIMIT 10;` |
| Export structure | `mysqldump --no-data restaurant_v2` |

---

## 15. Full database overview (one script)

Copy and run on the Pi:

```bash
DB_USER=restaurant_user
DB_PASS=restaurant_v2_pass
DB_NAME=restaurant_v2

echo "=== TABLES ==="
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;"

echo "=== ROW COUNTS ==="
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "
SELECT table_name, table_rows FROM information_schema.tables
WHERE table_schema='$DB_NAME' ORDER BY table_name;"

echo "=== FOREIGN KEYS (RELATIONSHIPS) ==="
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "
SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA='$DB_NAME' AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME;"

echo "=== USERS ==="
mysql -u $DB_USER -p$DB_PASS $DB_NAME -e "SELECT username, full_name, role FROM users;"
```

---

## Defense tips

1. Run **section 5** when they ask for the relationship diagram.
2. Run one **JOIN** query (section 7) to show real linked data.
3. Say the schema is **3NF** with **InnoDB foreign keys**.
4. Demo login in the app: **manager** / **admin123**
