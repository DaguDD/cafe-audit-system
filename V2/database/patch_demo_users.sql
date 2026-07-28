-- Adds missing demo users waiter1 and staff1 (password: admin123).
-- Prefer: php database/install.php  (generates fresh BCrypt hashes)
-- Or run this if PHP CLI is unavailable:

INSERT INTO users (username, password_hash, full_name, role, status)
VALUES
  ('waiter1', '$2y$12$wRNAE/PUM1RjphwNb//7duOKzCYTTaqkSe2l2n0bh4unchPTZCr0u', 'Biruk G/Tinsae', 'server', 'active'),
  ('cashier1', '$2y$12$wRNAE/PUM1RjphwNb//7duOKzCYTTaqkSe2l2n0bh4unchPTZCr0u', 'Kebede Alemu', 'staff', 'active'),
  ('staff1', '$2y$12$wRNAE/PUM1RjphwNb//7duOKzCYTTaqkSe2l2n0bh4unchPTZCr0u', 'Kebede Alemu', 'staff', 'active')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  role = VALUES(role),
  status = 'active';
