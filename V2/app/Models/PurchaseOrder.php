<?php

declare(strict_types=1);

final class PurchaseOrder
{
    public static function all(): array
    {
        return Database::connection()->query(
            'SELECT po.*, i.name AS item_name, s.name AS supplier_name
             FROM purchase_orders po
             JOIN inventory i ON i.item_id = po.item_id
             JOIN suppliers s ON s.sup_id = po.sup_id
             ORDER BY FIELD(po.status, \'pending\', \'received\', \'cancelled\'), po.created_at DESC'
        )->fetchAll();
    }

    public static function pendingCount(): int
    {
        return (int) Database::connection()->query(
            'SELECT COUNT(*) AS c FROM purchase_orders WHERE status = \'pending\''
        )->fetch()['c'];
    }

    public static function create(array $data, int $createdBy): void
    {
        $qty = (float) $data['ordered_qty'];
        $unitCost = (float) ($data['unit_cost'] ?? 0);
        $total = round($qty * $unitCost, 2);
        $stmt = Database::connection()->prepare(
            'INSERT INTO purchase_orders (item_id, sup_id, ordered_qty, unit_cost, total_cost, expected_delivery, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['item_id'],
            $data['sup_id'],
            $qty,
            $unitCost,
            $total,
            $data['expected_delivery'] ?: null,
            $createdBy,
        ]);
    }

    public static function markReceived(int $poId): void
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT * FROM purchase_orders WHERE po_id = ? AND status = \'pending\'');
        $stmt->execute([$poId]);
        $po = $stmt->fetch();
        if (!$po) {
            throw new RuntimeException('Purchase order not found or already processed.');
        }

        $pdo->beginTransaction();
        try {
            Inventory::adjustQty((int) $po['item_id'], (float) $po['ordered_qty']);
            // Update inventory unit cost when a cost was recorded on the PO
            if ((float) $po['unit_cost'] > 0) {
                $updCost = $pdo->prepare('UPDATE inventory SET unit_cost = ? WHERE item_id = ?');
                $updCost->execute([(float) $po['unit_cost'], (int) $po['item_id']]);
            }
            $upd = $pdo->prepare(
                'UPDATE purchase_orders SET status = \'received\', received_at = NOW() WHERE po_id = ?'
            );
            $upd->execute([$poId]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /** Purchase spend summary for money audit. */
    public static function spendSummary(int $limit = 50): array
    {
        $limit = max(1, min(200, $limit));
        return Database::connection()->query(
            'SELECT po.*, i.name AS item_name, i.unit, s.name AS supplier_name
             FROM purchase_orders po
             JOIN inventory i ON i.item_id = po.item_id
             JOIN suppliers s ON s.sup_id = po.sup_id
             ORDER BY po.created_at DESC
             LIMIT ' . $limit
        )->fetchAll();
    }

    public static function totalSpend(?string $status = 'received'): float
    {
        if ($status === null || $status === '') {
            return (float) Database::connection()->query(
                'SELECT COALESCE(SUM(total_cost), 0) FROM purchase_orders'
            )->fetchColumn();
        }
        $stmt = Database::connection()->prepare(
            'SELECT COALESCE(SUM(total_cost), 0) FROM purchase_orders WHERE status = ?'
        );
        $stmt->execute([$status]);
        return (float) $stmt->fetchColumn();
    }
}
