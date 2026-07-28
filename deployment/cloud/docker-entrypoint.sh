#!/bin/bash
# Wait for MySQL, auto-bootstrap empty DB, then start Apache.
set -euo pipefail

DB_HOST="${V2_DB_HOST:-db}"
DB_PORT="${V2_DB_PORT:-3306}"
DB_NAME="${V2_DB_NAME:-restaurant_v2}"
DB_USER="${V2_DB_USER:-restaurant_user}"
DB_PASS="${V2_DB_PASS:-restaurant_v2_pass}"

echo "[cafe-audit] Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
for i in $(seq 1 60); do
    if php -r "
try {
    new PDO(
        'mysql:host=${DB_HOST};port=${DB_PORT}',
        '${DB_USER}',
        '${DB_PASS}',
        [PDO::ATTR_TIMEOUT => 3]
    );
    exit(0);
} catch (Throwable \$e) {
    exit(1);
}
" 2>/dev/null; then
        echo "[cafe-audit] MySQL is ready."
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "[cafe-audit] ERROR: MySQL not reachable after 120s."
        exit 1
    fi
    sleep 2
done

if [ -d /var/www/html/storage ]; then
    chown -R www-data:www-data /var/www/html/storage || true
    find /var/www/html/storage -type d -exec chmod 775 {} \; 2>/dev/null || true
    find /var/www/html/storage -type f -exec chmod 664 {} \; 2>/dev/null || true
    mkdir -p /var/www/html/storage/uploads/payments
    chown -R www-data:www-data /var/www/html/storage/uploads || true
fi

# Auto-init when the database has no users table yet
if ! php -r "
try {
    \$pdo = new PDO(
        'mysql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_NAME}',
        '${DB_USER}',
        '${DB_PASS}'
    );
    \$pdo->query('SELECT 1 FROM users LIMIT 1');
    exit(0);
} catch (Throwable \$e) {
    exit(1);
}
" 2>/dev/null; then
    echo "[cafe-audit] Empty database detected — running bootstrap.php..."
    php /var/www/html/database/bootstrap.php || {
        echo "[cafe-audit] WARNING: bootstrap failed. App will start; fix DB then re-run:"
        echo "  docker compose exec web php database/bootstrap.php"
    }
else
    echo "[cafe-audit] Database already has data — skipping bootstrap."
fi

exec "$@"
