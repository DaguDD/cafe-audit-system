<?php

/**
 * One-time setup: creates demo users with BCrypt passwords.
 * Run: php database/install.php
 */

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';

try {
    $pdo = Database::connection();
} catch (PDOException $e) {
    fwrite(STDERR, "\nMySQL connection failed: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Import schema first: mysql -u root < database/schema.sql\n");
    fwrite(STDERR, "Then seed: mysql -u root restaurant_v2 < database/seed.sql\n\n");
    exit(1);
}

$users = [
    ['admin', 'admin123', 'System Admin', 'admin'],
    ['manager', 'admin123', 'Dagim Dereje', 'manager'],
    ['auditor', 'admin123', 'Hana Wabe', 'auditor'],
    ['waiter1', 'admin123', 'Biruk G/Tinsae', 'server'],
    ['server1', 'admin123', 'Biruk G/Tinsae', 'server'],
    ['cashier1', 'admin123', 'Kebede Alemu', 'staff'],
    ['staff1', 'admin123', 'Kebede Alemu', 'staff'],
    ['kitchen1', 'admin123', 'Sara Bekele', 'kitchen'],
];

$stmt = $pdo->prepare(
    'INSERT INTO users (username, password_hash, full_name, role)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name), role = VALUES(role)'
);

foreach ($users as [$username, $password, $name, $role]) {
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt->execute([$username, $hash, $name, $role]);
    echo "User ready: {$username} / {$password} ({$role})\n";
}

$mgr = $pdo->query("SELECT user_id FROM users WHERE username = 'manager'")->fetch();
$waiter = $pdo->query("SELECT user_id FROM users WHERE username = 'waiter1'")->fetch();
if ($mgr && $waiter) {
    $check = $pdo->prepare("SELECT shift_id FROM shifts WHERE user_id = ? AND status = 'open'");
    $check->execute([$waiter['user_id']]);
    if (!$check->fetch()) {
        $pdo->prepare('INSERT INTO shifts (user_id, opened_by, status) VALUES (?, ?, \'open\')')
            ->execute([$waiter['user_id'], $mgr['user_id']]);
        $shiftId = (int) $pdo->lastInsertId();
        echo "Opened demo shift for waiter1.\n";
        $items = $pdo->query('SELECT item_id, current_qty FROM inventory')->fetchAll();
        $ins = $pdo->prepare('INSERT IGNORE INTO opening_quantities (shift_id, item_id, opening_qty) VALUES (?, ?, ?)');
        foreach ($items as $item) {
            $ins->execute([$shiftId, $item['item_id'], $item['current_qty']]);
        }
        echo "Recorded opening quantities for shift.\n";
    }
}

$tableCount = (int) $pdo->query('SELECT COUNT(*) FROM restaurant_tables')->fetchColumn();
if ($tableCount === 0) {
    for ($i = 1; $i <= 8; $i++) {
        $num = sprintf('T%02d', $i);
        $token = bin2hex(random_bytes(16));
        $pdo->prepare('INSERT INTO restaurant_tables (table_number, qr_token, capacity) VALUES (?, ?, ?)')
            ->execute([$num, $token, $i <= 2 ? 2 : ($i <= 6 ? 4 : ($i === 7 ? 8 : 4))]);
    }
    echo "Created 8 demo tables with QR tokens.\n";
}

echo "\nSetup complete.\n";
echo "Customer menu example: " . url('customer/menu.php?table=TOKEN') . "\n";
