-- Add purchase cost tracking for money audit
-- Run once against restaurant_v2 (or change USE line):
--   mysql -u root restaurant_v2 < database/patch_money_audit.sql
--
-- Safe to ignore "Duplicate column name" if you already ran this.

USE restaurant_v2;

ALTER TABLE inventory
  ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER min_threshold;

ALTER TABLE purchase_orders
  ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER ordered_qty;

ALTER TABLE purchase_orders
  ADD COLUMN total_cost DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER unit_cost;

UPDATE inventory SET unit_cost = 850.00 WHERE name = 'Arabica Coffee Beans' AND unit_cost = 0;
UPDATE inventory SET unit_cost = 45.00 WHERE name = 'Whole Milk' AND unit_cost = 0;
UPDATE inventory SET unit_cost = 55.00 WHERE name = 'Sugar' AND unit_cost = 0;
UPDATE inventory SET unit_cost = 2.50 WHERE name = 'Paper Cups (12oz)' AND unit_cost = 0;
UPDATE inventory SET unit_cost = 18.00 WHERE name = 'Croissant Dough' AND unit_cost = 0;
UPDATE inventory SET unit_cost = 220.00 WHERE name = 'Chocolate Syrup' AND unit_cost = 0;
UPDATE inventory SET unit_cost = 5.00 WHERE name = 'Ice Cubes' AND unit_cost = 0;
