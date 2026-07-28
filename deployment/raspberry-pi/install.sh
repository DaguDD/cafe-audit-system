#!/bin/bash
# install.sh — Cafe Audit System on Raspberry Pi 3 B+ (Bookworm)
# Native LAMP stack. Idempotent where possible. Run as root.
#
# Usage:
#   sudo bash install.sh [/path/to/V2/source]
#
# Default source: script directory ../../V2 (repo layout)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${1:-${SCRIPT_DIR}/../../V2}"
APP_DIR="/var/www/cafe-audit"
VHOST_NAME="cafe-audit.conf"
DB_NAME="restaurant_v2"
DB_USER="restaurant_user"
DB_PASS="restaurant_v2_pass"
PHP_VERSION="8.2"

log() { echo "[cafe-audit] $*"; }

if [ "$(id -u)" -ne 0 ]; then
    echo "Run as root: sudo bash $0"
    exit 1
fi

if [ ! -f "${SOURCE_DIR}/public/index.php" ]; then
    echo "V2 source not found at: ${SOURCE_DIR}"
    echo "Copy the V2 folder to the Pi or pass the path: sudo bash $0 /path/to/V2"
    exit 1
fi

log "Updating packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

log "Installing Apache, MariaDB, PHP ${PHP_VERSION}..."
apt-get install -y -qq \
    apache2 \
    mariadb-server \
    "php${PHP_VERSION}" \
    "php${PHP_VERSION}-cli" \
    "php${PHP_VERSION}-mysql" \
    "php${PHP_VERSION}-gd" \
    "php${PHP_VERSION}-mbstring" \
    "php${PHP_VERSION}-xml" \
    "php${PHP_VERSION}-curl" \
    libapache2-mod-php"${PHP_VERSION}"

a2enmod rewrite
a2enmod php"${PHP_VERSION}" 2>/dev/null || true

log "Enabling services on boot..."
systemctl enable apache2 mariadb
systemctl start apache2 mariadb

log "Deploying application to ${APP_DIR}..."
mkdir -p "$APP_DIR"
rsync -a --delete \
    --exclude '.git' \
    --exclude 'storage/uploads/*' \
    --exclude '.env' \
    "${SOURCE_DIR}/" "${APP_DIR}/"

mkdir -p "${APP_DIR}/storage/uploads/payments"
chown -R www-data:www-data "${APP_DIR}/storage"
find "${APP_DIR}/storage" -type d -exec chmod 775 {} \;
find "${APP_DIR}/storage" -type f -exec chmod 664 {} \;
chown -R www-data:www-data "$APP_DIR"

log "Installing Apache virtual host..."
cp "${SCRIPT_DIR}/apache/cafe-audit.conf" "/etc/apache2/sites-available/${VHOST_NAME}"
a2ensite "${VHOST_NAME}" 2>/dev/null || true
a2dissite 000-default.conf 2>/dev/null || true
systemctl reload apache2

# Optional env file for APP_URL (Apache SetEnv or systemd — app reads getenv)
if [ -f "${SCRIPT_DIR}/env.example" ] && [ ! -f /etc/cafe-audit/env ]; then
    mkdir -p /etc/cafe-audit
    cp "${SCRIPT_DIR}/env.example" /etc/cafe-audit/env
    log "Created /etc/cafe-audit/env — edit APP_URL to your Pi IP."
fi

# Inject APP_URL into Apache if set in env file
if [ -f /etc/cafe-audit/env ]; then
    # shellcheck disable=SC1091
    set -a
    source /etc/cafe-audit/env
    set +a
    if [ -n "${APP_URL:-}" ]; then
        if ! grep -q "SetEnv APP_URL" "/etc/apache2/sites-available/${VHOST_NAME}"; then
            sed -i "/<\/VirtualHost>/i \\    SetEnv APP_URL ${APP_URL}" "/etc/apache2/sites-available/${VHOST_NAME}"
            systemctl reload apache2
        fi
    fi
fi

log "MariaDB: ensure database user exists (schema import is separate — run setup-db.sh)..."
if mysql -u root -e "SELECT 1" &>/dev/null; then
    mysql -u root <<SQL || true
CREATE DATABASE IF NOT EXISTS ${DB_NAME}
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
else
    log "MariaDB root needs a password. Run: sudo mysql_secure_installation"
    log "Then run: sudo bash ${SCRIPT_DIR}/setup-db.sh"
fi

# Low-memory tuning hint (1GB Pi)
MYSQL_CNF="/etc/mysql/mariadb.conf.d/99-cafe-audit.cnf"
if [ ! -f "$MYSQL_CNF" ]; then
    log "Applying MariaDB low-memory settings for 1GB RAM..."
    cat > "$MYSQL_CNF" <<'CNF'
[mysqld]
innodb_buffer_pool_size = 64M
innodb_log_file_size = 16M
max_connections = 30
CNF
    systemctl restart mariadb || true
fi

# Swap recommendation
if [ "$(swapon --show | wc -l)" -le 1 ]; then
    log "Tip: enable 1GB swap for stability — see README.md"
fi

log "Install complete."
echo ""
echo "Next steps:"
echo "  1. Edit /etc/cafe-audit/env — set APP_URL=http://YOUR_PI_IP"
echo "  2. sudo bash ${SCRIPT_DIR}/setup-db.sh"
echo "  3. Open http://YOUR_PI_IP/login (or http://cafe-audit.local if hosts configured)"
echo "  4. Login: manager / admin123"
echo ""
