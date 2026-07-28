-- Run on existing V2 installs: sudo mysql restaurant_v2 < database/patch_payment.sql

USE restaurant_v2;

CREATE TABLE IF NOT EXISTS payment_submissions (
  submission_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  table_id        INT UNSIGNED NOT NULL,
  amount_expected DECIMAL(12,2) NOT NULL,
  amount_claimed  DECIMAL(12,2) NOT NULL,
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
