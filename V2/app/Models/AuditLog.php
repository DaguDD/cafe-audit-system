<?php

declare(strict_types=1);

final class AuditLog
{
    public static function submitBatch(array $entries, int $userId, ?int $shiftId, ?string $comments): void
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            foreach ($entries as $entry) {
                $itemId = (int) $entry['item_id'];
                $physical = (float) $entry['physical_qty'];
                if ($physical < 0) {
                    throw new RuntimeException('Physical quantity cannot be negative.');
                }
                $system = (float) Inventory::expectedQty($itemId);
                $discrepancy = $physical - $system;
                $variancePct = $system != 0.0 ? abs($discrepancy / $system) * 100 : ($discrepancy != 0.0 ? 100 : 0);

                $stmt = $pdo->prepare(
                    'INSERT INTO audit_logs
                     (item_id, system_qty, physical_qty, discrepancy, variance_pct, shift_id, user_id, comments)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([
                    $itemId, $system, $physical, $discrepancy, $variancePct,
                    $shiftId, $userId, $comments,
                ]);

                // Sync inventory to physical count after audit
                $upd = $pdo->prepare('UPDATE inventory SET current_qty = ? WHERE item_id = ?');
                $upd->execute([$physical, $itemId]);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function recent(int $limit = 10): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT a.*, i.name AS item_name, i.unit, u.full_name AS auditor_name
             FROM audit_logs a
             JOIN inventory i ON i.item_id = a.item_id
             JOIN users u ON u.user_id = a.user_id
             ORDER BY a.audited_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
