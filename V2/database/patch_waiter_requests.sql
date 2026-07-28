-- Waiter call requests (customer needs assistance without an order)
-- Run once: mysql -u root cafe_audit < database/patch_waiter_requests.sql
-- Or: mysql -u root restaurant_v2 < database/patch_waiter_requests.sql

ALTER TABLE restaurant_tables
  MODIFY status ENUM('available', 'occupied', 'ordering', 'bill_requested', 'waiter_requested') NOT NULL DEFAULT 'available';

CREATE TABLE IF NOT EXISTS waiter_requests (
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
