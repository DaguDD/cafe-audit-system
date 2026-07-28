<?php

declare(strict_types=1);

final class WasteLog
{
    public static function log(int $itemId, float $qty, string $reason, int $userId, ?int $shiftId): void
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            Inventory::adjustQty($itemId, -$qty);
            $stmt = $pdo->prepare(
                'INSERT INTO waste_logs (item_id, waste_qty, reason, shift_id, user_id)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$itemId, $qty, $reason, $shiftId, $userId]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function recent(int $limit = 10): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT w.*, i.name AS item_name, u.full_name AS staff_name
             FROM waste_logs w
             JOIN inventory i ON i.item_id = w.item_id
             JOIN users u ON u.user_id = w.user_id
             ORDER BY w.logged_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
