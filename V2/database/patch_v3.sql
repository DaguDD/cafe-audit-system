-- V3 patch: itemized billing tip + auto-managed shifts
-- Run once: sudo mysql restaurant_v2 < database/patch_v3.sql

USE restaurant_v2;

ALTER TABLE payment_submissions
  ADD COLUMN tip_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER amount_claimed;

ALTER TABLE shifts
  ADD COLUMN auto_managed TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
