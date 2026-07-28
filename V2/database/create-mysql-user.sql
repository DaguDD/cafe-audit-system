-- Optional: dedicated MySQL user for V2 (Ubuntu/production)
-- Run: sudo mysql < database/create-mysql-user.sql
-- Then update config/database.php to match.

CREATE USER IF NOT EXISTS 'restaurant_user'@'localhost' IDENTIFIED BY 'restaurant_v2_pass';
GRANT ALL PRIVILEGES ON restaurant_v2.* TO 'restaurant_user'@'localhost';
FLUSH PRIVILEGES;
