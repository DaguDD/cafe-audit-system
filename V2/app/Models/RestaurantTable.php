<?php

declare(strict_types=1);

final class RestaurantTable
{
    public static function all(): array
    {
        return Database::connection()->query(
            'SELECT t.*,
                    (SELECT COUNT(*) FROM orders o
                     WHERE o.table_id = t.table_id
                       AND o.status NOT IN (\'paid\', \'cancelled\')) AS active_orders,
                    (SELECT COALESCE(SUM(o.subtotal), 0) FROM orders o
                     WHERE o.table_id = t.table_id
                       AND o.status NOT IN (\'paid\', \'cancelled\')) AS open_total
             FROM restaurant_tables t
             ORDER BY t.table_number'
        )->fetchAll();
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM restaurant_tables WHERE table_id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findByToken(string $token): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM restaurant_tables WHERE qr_token = ?');
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function findByNumber(string $number): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM restaurant_tables WHERE table_number = ?');
        $stmt->execute([$number]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function create(string $tableNumber, int $capacity = 4): int
    {
        $token = bin2hex(random_bytes(16));
        $stmt = Database::connection()->prepare(
            'INSERT INTO restaurant_tables (table_number, qr_token, capacity) VALUES (?, ?, ?)'
        );
        $stmt->execute([$tableNumber, $token, $capacity]);
        return (int) Database::connection()->lastInsertId();
    }

    public static function regenerateToken(int $tableId): string
    {
        $token = bin2hex(random_bytes(16));
        $stmt = Database::connection()->prepare(
            'UPDATE restaurant_tables SET qr_token = ? WHERE table_id = ?'
        );
        $stmt->execute([$token, $tableId]);
        return $token;
    }

    public static function setStatus(int $tableId, string $status): void
    {
        $allowed = ['available', 'occupied', 'ordering', 'bill_requested', 'waiter_requested'];
        if (!in_array($status, $allowed, true)) {
            throw new InvalidArgumentException('Invalid table status.');
        }
        $stmt = Database::connection()->prepare(
            'UPDATE restaurant_tables SET status = ? WHERE table_id = ?'
        );
        $stmt->execute([$status, $tableId]);
    }

    public static function customerMenuUrl(array $table): string
    {
        return url('customer/menu.php?table=' . urlencode($table['qr_token']));
    }

    public static function activeSession(int $tableId): array
    {
        $pdo = Database::connection();
        $orders = $pdo->prepare(
            'SELECT o.*, u.full_name AS server_name
             FROM orders o
             LEFT JOIN users u ON u.user_id = o.server_user_id
             WHERE o.table_id = ? AND o.status NOT IN (\'paid\', \'cancelled\')
             ORDER BY o.created_at ASC'
        );
        $orders->execute([$tableId]);
        $orderRows = $orders->fetchAll();

        foreach ($orderRows as &$order) {
            $order['items'] = Order::items((int) $order['order_id']);
        }
        unset($order);

        return $orderRows;
    }
}
