#!/bin/bash
# setup-db.sh — import schema, seed, and run install.php on the Pi
# Run as root after install.sh or when resetting the database.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/cafe-audit}"
DB_NAME="${V2_DB_NAME:-restaurant_v2}"
DB_USER="${V2_DB_USER:-restaurant_user}"
DB_PASS="${V2_DB_PASS:-restaurant_v2_pass}"
ROOT_PASS="${MYSQL_ROOT_PASS:-}"

if [ "$(id -u)" -ne 0 ]; then
    echo "Run as root: sudo $0"
    exit 1
fi

if [ -z "$ROOT_PASS" ]; then
    read -rsp "MariaDB root password: " ROOT_PASS
    echo
fi

echo "Creating database and user..."
mysql -u root -p"$ROOT_PASS" <<SQL
CREATE DATABASE IF NOT EXISTS ${DB_NAME}
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "Importing schema..."
mysql -u root -p"$ROOT_PASS" < "${APP_DIR}/database/schema.sql"

echo "Importing seed data..."
mysql -u root -p"$ROOT_PASS" "$DB_NAME" < "${APP_DIR}/database/seed.sql"

echo "Running install.php (demo users, tables, shift)..."
cd "$APP_DIR"
export V2_DB_HOST=127.0.0.1
export V2_DB_NAME="$DB_NAME"
export V2_DB_USER="$DB_USER"
export V2_DB_PASS="$DB_PASS"
php database/install.php

echo "Database setup complete."
