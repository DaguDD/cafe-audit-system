<?php

declare(strict_types=1);

final class WaiterRequest
{
    /** @return list<array<string, mixed>> */
    public static function availableWaiters(): array
    {
        return Database::connection()->query(
            "SELECT u.user_id, u.full_name
             FROM users u
             INNER JOIN shifts s ON s.user_id = u.user_id AND s.status = 'open'
             WHERE u.role IN ('server', 'staff') AND u.status = 'active'
             ORDER BY u.full_name"
        )->fetchAll();
    }

    public static function create(int $tableId): int
    {
        $session = RestaurantTable::activeSession($tableId);
        if (!empty($session)) {
            throw new RuntimeException('You have open orders — use Request Bill or Pay Bill instead.');
        }

        $existing = self::activeForTable($tableId);
        if ($existing) {
            throw new RuntimeException('A waiter has already been notified for this table.');
        }

        $waiters = self::availableWaiters();
        if (empty($waiters)) {
            throw new RuntimeException('No waiters are on duty right now. Please ask staff at the counter.');
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                "INSERT INTO waiter_requests (table_id, status) VALUES (?, 'pending')"
            );
            $stmt->execute([$tableId]);
            $id = (int) $pdo->lastInsertId();
            RestaurantTable::setStatus($tableId, 'waiter_requested');
            $pdo->commit();
            return $id;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function activeForTable(int $tableId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT wr.*, t.table_number, u.full_name AS assigned_name
             FROM waiter_requests wr
             JOIN restaurant_tables t ON t.table_id = wr.table_id
             LEFT JOIN users u ON u.user_id = wr.assigned_user_id
             WHERE wr.table_id = ? AND wr.status IN ('pending', 'accepted')
             ORDER BY wr.requested_at DESC
             LIMIT 1"
        );
        $stmt->execute([$tableId]);
        return $stmt->fetch() ?: null;
    }

    /** @return list<array<string, mixed>> */
    public static function pendingAlerts(): array
    {
        return Database::connection()->query(
            "SELECT wr.request_id, wr.table_id, wr.status, wr.requested_at, wr.assigned_user_id,
                    t.table_number, u.full_name AS assigned_name
             FROM waiter_requests wr
             JOIN restaurant_tables t ON t.table_id = wr.table_id
             LEFT JOIN users u ON u.user_id = wr.assigned_user_id
             WHERE wr.status IN ('pending', 'accepted')
             ORDER BY wr.requested_at ASC"
        )->fetchAll();
    }

    public static function accept(int $requestId, int $userId): void
    {
        $req = self::find($requestId);
        if (!$req || !in_array($req['status'], ['pending', 'accepted'], true)) {
            throw new RuntimeException('Request not found or already closed.');
        }
        if ($req['status'] === 'accepted' && (int) $req['assigned_user_id'] !== $userId) {
            throw new RuntimeException('Another waiter is already handling this table.');
        }

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            "UPDATE waiter_requests
             SET status = 'accepted', assigned_user_id = ?, accepted_at = NOW()
             WHERE request_id = ? AND status IN ('pending', 'accepted')"
        );
        $stmt->execute([$userId, $requestId]);
        if ($stmt->rowCount() === 0) {
            throw new RuntimeException('Could not accept this request.');
        }
    }

    public static function complete(int $requestId, int $userId): void
    {
        $req = self::find($requestId);
        if (!$req) {
            throw new RuntimeException('Request not found.');
        }
        if ($req['status'] === 'accepted' && (int) $req['assigned_user_id'] !== $userId) {
            throw new RuntimeException('Only the assigned waiter can close this request.');
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $pdo->prepare(
                "UPDATE waiter_requests
                 SET status = 'completed', completed_at = NOW(), assigned_user_id = COALESCE(assigned_user_id, ?)
                 WHERE request_id = ?"
            )->execute([$userId, $requestId]);

            $openOrders = RestaurantTable::activeSession((int) $req['table_id']);
            if (empty($openOrders)) {
                RestaurantTable::setStatus((int) $req['table_id'], 'available');
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function find(int $requestId): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM waiter_requests WHERE request_id = ?');
        $stmt->execute([$requestId]);
        return $stmt->fetch() ?: null;
    }

    public static function pendingCount(): int
    {
        return (int) Database::connection()->query(
            "SELECT COUNT(*) FROM waiter_requests WHERE status = 'pending'"
        )->fetchColumn();
    }
}
