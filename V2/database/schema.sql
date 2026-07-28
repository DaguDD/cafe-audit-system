-- Cafe Audit System — MySQL schema (3NF)
-- Import: mysql -u root < database/schema.sql

CREATE DATABASE IF NOT EXISTS restaurant_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE restaurant_v2;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS waiter_requests;
DROP TABLE IF EXISTS payment_submissions;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS restaurant_tables;
DROP TABLE IF EXISTS opening_quantities;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS waste_logs;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS login_logs;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('admin', 'manager', 'auditor', 'server', 'kitchen', 'staff') NOT NULL,
  status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE login_logs (
  log_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  action     ENUM('login', 'logout') NOT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  sup_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  contact_info VARCHAR(100) NULL,
  email        VARCHAR(100) NULL,
  status       ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE categories (
  cat_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE inventory (
  item_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  unit          VARCHAR(20)  NOT NULL DEFAULT 'unit',
  current_qty   DECIMAL(12,2) NOT NULL DEFAULT 0,
  min_threshold DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost     DECIMAL(12,2) NOT NULL DEFAULT 0,
  sup_id        INT UNSIGNED NULL,
  status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sup_id) REFERENCES suppliers(sup_id) ON DELETE SET NULL,
  INDEX idx_inventory_low (current_qty, min_threshold)
) ENGINE=InnoDB;

CREATE TABLE products (
  product_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT NULL,
  price       DECIMAL(10,2) NOT NULL,
  cat_id      INT UNSIGNED NULL,
  status      ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cat_id) REFERENCES categories(cat_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE recipes (
  recipe_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  item_id    INT UNSIGNED NOT NULL,
  qty_needed DECIMAL(12,2) NOT NULL,
  UNIQUE KEY uk_product_item (product_id, item_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (item_id) REFERENCES inventory(item_id)
) ENGINE=InnoDB;

CREATE TABLE shifts (
  shift_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  opened_by   INT UNSIGNED NOT NULL,
  opened_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at   TIMESTAMP NULL,
  status      ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  auto_managed TINYINT(1) NOT NULL DEFAULT 0,
  notes       TEXT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (opened_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE opening_quantities (
  opening_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shift_id   INT UNSIGNED NOT NULL,
  item_id    INT UNSIGNED NOT NULL,
  opening_qty DECIMAL(12,2) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_shift_item (shift_id, item_id),
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  FOREIGN KEY (item_id) REFERENCES inventory(item_id)
) ENGINE=InnoDB;

CREATE TABLE restaurant_tables (
  table_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(10) NOT NULL UNIQUE,
  qr_token     VARCHAR(64) NOT NULL UNIQUE,
  status       ENUM('available', 'occupied', 'ordering', 'bill_requested', 'waiter_requested') NOT NULL DEFAULT 'available',
  capacity     INT UNSIGNED NOT NULL DEFAULT 4,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE waiter_requests (
  request_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_id         INT UNSIGNED NOT NULL,
  status           ENUM('pending', 'accepted', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  assigned_user_id INT UNSIGNED NULL,
  requested_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at      TIMESTAMP NULL,
  completed_at     TIMESTAMP NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_waiter_pending (status, requested_at)
) ENGINE=InnoDB;

CREATE TABLE orders (
  order_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_id       INT UNSIGNED NOT NULL,
  order_source   ENUM('qr', 'server') NOT NULL DEFAULT 'qr',
  server_user_id INT UNSIGNED NULL,
  status         ENUM('pending', 'committed', 'preparing', 'served', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  subtotal       DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes          TEXT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at        TIMESTAMP NULL,
  shift_id       INT UNSIGNED NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id),
  FOREIGN KEY (server_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id) ON DELETE SET NULL,
  INDEX idx_orders_status (status),
  INDEX idx_orders_table (table_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  order_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id      INT UNSIGNED NOT NULL,
  product_id    INT UNSIGNED NOT NULL,
  qty           INT UNSIGNED NOT NULL,
  unit_price    DECIMAL(10,2) NOT NULL,
  line_total    DECIMAL(12,2) NOT NULL,
  item_status   ENUM('pending', 'committed', 'preparing', 'served', 'cancelled') NOT NULL DEFAULT 'pending',
  notes         VARCHAR(255) NULL,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;

CREATE TABLE sales (
  sale_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT UNSIGNED NOT NULL,
  qty_sold   INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total      DECIMAL(12,2) NOT NULL,
  shift_id   INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  order_id   INT UNSIGNED NULL,
  table_id   INT UNSIGNED NULL,
  sold_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id) ON DELETE SET NULL,
  INDEX idx_sales_date (sold_at)
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  audit_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id      INT UNSIGNED NOT NULL,
  system_qty   DECIMAL(12,2) NOT NULL,
  physical_qty DECIMAL(12,2) NOT NULL,
  discrepancy  DECIMAL(12,2) NOT NULL,
  variance_pct DECIMAL(8,2) NULL,
  shift_id     INT UNSIGNED NULL,
  user_id      INT UNSIGNED NOT NULL,
  comments     TEXT NULL,
  audited_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(item_id),
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  INDEX idx_audit_date (audited_at)
) ENGINE=InnoDB;

CREATE TABLE waste_logs (
  waste_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id    INT UNSIGNED NOT NULL,
  waste_qty  DECIMAL(12,2) NOT NULL,
  reason     ENUM('expired', 'damaged', 'spilled', 'other') NOT NULL,
  shift_id   INT UNSIGNED NULL,
  user_id    INT UNSIGNED NOT NULL,
  logged_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES inventory(item_id),
  FOREIGN KEY (shift_id) REFERENCES shifts(shift_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
  po_id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id           INT UNSIGNED NOT NULL,
  sup_id            INT UNSIGNED NOT NULL,
  ordered_qty       DECIMAL(12,2) NOT NULL,
  unit_cost         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost        DECIMAL(12,2) NOT NULL DEFAULT 0,
  expected_delivery DATE NULL,
  status            ENUM('pending', 'received', 'cancelled') NOT NULL DEFAULT 'pending',
  created_by        INT UNSIGNED NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  received_at       TIMESTAMP NULL,
  FOREIGN KEY (item_id) REFERENCES inventory(item_id),
  FOREIGN KEY (sup_id) REFERENCES suppliers(sup_id),
  FOREIGN KEY (created_by) REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE payment_submissions (
  submission_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_id        INT UNSIGNED NOT NULL,
  amount_expected DECIMAL(12,2) NOT NULL,
  amount_claimed  DECIMAL(12,2) NOT NULL,
  tip_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method  ENUM('telebirr', 'bank') NOT NULL,
  reference_number VARCHAR(64) NOT NULL,
  sender_phone    VARCHAR(20) NULL,
  screenshot_path VARCHAR(255) NOT NULL,
  screenshot_hash CHAR(64) NOT NULL,
  table_token     VARCHAR(64) NOT NULL,
  ip_address      VARCHAR(45) NULL,
  status          ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by     INT UNSIGNED NULL,
  review_notes    TEXT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at     TIMESTAMP NULL,
  FOREIGN KEY (table_id) REFERENCES restaurant_tables(table_id),
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  UNIQUE KEY uk_payment_reference (reference_number),
  INDEX idx_screenshot_hash (screenshot_hash),
  INDEX idx_table_status (table_id, status),
  INDEX idx_status_created (status, created_at)
) ENGINE=InnoDB;
