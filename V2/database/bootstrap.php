<?php

/**
 * Auto-initialize an empty database (schema + seed + demo users).
 * Safe to re-run: skips if the `users` table already exists.
 *
 * Usage: php database/bootstrap.php
 */

declare(strict_types=1);

$host = getenv('V2_DB_HOST') ?: '127.0.0.1';
$port = getenv('V2_DB_PORT') ?: '3306';
$name = getenv('V2_DB_NAME') ?: 'restaurant_v2';
$user = getenv('V2_DB_USER') ?: 'restaurant_user';
$pass = getenv('V2_DB_PASS') ?: 'restaurant_v2_pass';

$dir = __DIR__;

function runSqlFile(PDO $pdo, string $path): void
{
    if (!is_file($path)) {
        throw new RuntimeException("SQL file not found: {$path}");
    }
    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException("Could not read: {$path}");
    }

    // Managed MySQL already has the database; strip create/use/drop-database lines.
    $sql = preg_replace('/^\s*CREATE\s+DATABASE\b.*?;\s*/im', '', $sql) ?? $sql;
    $sql = preg_replace('/^\s*USE\s+\w+\s*;\s*/im', '', $sql) ?? $sql;
    $sql = preg_replace('/^\s*DROP\s+DATABASE\b.*?;\s*/im', '', $sql) ?? $sql;

    $pdo->exec($sql);
}

echo "Connecting to {$host}:{$port}/{$name} as {$user}...\n";

$dsn = sprintf('mysql:host=%s;port=%s;charset=utf8mb4', $host, $port);
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::MYSQL_ATTR_MULTI_STATEMENTS => true,
]);

// Ensure database exists when the app user is allowed to create it.
try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (Throwable $e) {
    // Managed hosts often already created the DB and deny CREATE DATABASE — that is fine.
    echo "Note: CREATE DATABASE skipped (" . $e->getMessage() . ")\n";
}

$pdo->exec("USE `{$name}`");

$hasUsers = false;
try {
    $pdo->query('SELECT 1 FROM users LIMIT 1');
    $hasUsers = true;
} catch (Throwable $e) {
    $hasUsers = false;
}

if ($hasUsers) {
    echo "Database already initialized (users table present). Skipping schema/seed.\n";
} else {
    echo "Importing schema.sql...\n";
    runSqlFile($pdo, $dir . '/schema.sql');
    echo "Importing seed.sql...\n";
    runSqlFile($pdo, $dir . '/seed.sql');

    foreach ([
        'patch_payment.sql',
        'patch_waiter_requests.sql',
        'patch_v3.sql',
        'patch_money_audit.sql',
    ] as $patch) {
        $path = $dir . '/' . $patch;
        if (!is_file($path)) {
            continue;
        }
        echo "Applying {$patch}...\n";
        try {
            runSqlFile($pdo, $path);
        } catch (Throwable $e) {
            echo "  (patch warning: " . $e->getMessage() . ")\n";
        }
    }
}

// Always ensure demo users / tables via install.php (idempotent).
echo "Running install.php (demo users, tables, QR tokens)...\n";
passthru('php ' . escapeshellarg($dir . '/install.php'), $code);
if ($code !== 0) {
    fwrite(STDERR, "install.php exited with code {$code}\n");
    exit($code);
}

echo "Bootstrap complete.\n";
