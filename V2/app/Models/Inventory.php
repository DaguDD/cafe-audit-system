<?php

declare(strict_types=1);

final class Inventory
{
    public static function all(bool $activeOnly = true): array
    {
        $sql = 'SELECT i.*, s.name AS supplier_name
                FROM inventory i
                LEFT JOIN suppliers s ON s.sup_id = i.sup_id';
        if ($activeOnly) {
            $sql .= ' WHERE i.status = \'active\'';
        }
        $sql .= ' ORDER BY i.name';
        return Database::connection()->query($sql)->fetchAll();
    }

    public static function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare('SELECT * FROM inventory WHERE item_id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function lowStock(): array
    {
        return Database::connection()->query(
            'SELECT * FROM inventory
             WHERE status = \'active\' AND current_qty <= min_threshold
             ORDER BY current_qty ASC'
        )->fetchAll();
    }

    public static function create(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO inventory (name, unit, current_qty, min_threshold, unit_cost, sup_id)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['name'],
            $data['unit'],
            $data['current_qty'],
            $data['min_threshold'],
            (float) ($data['unit_cost'] ?? 0),
            $data['sup_id'] ?: null,
        ]);
        return (int) Database::connection()->lastInsertId();
    }

    public static function update(int $id, array $data): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE inventory SET name=?, unit=?, current_qty=?, min_threshold=?, unit_cost=?, sup_id=?, status=?
             WHERE item_id=?'
        );
        $stmt->execute([
            $data['name'],
            $data['unit'],
            $data['current_qty'],
            $data['min_threshold'],
            (float) ($data['unit_cost'] ?? 0),
            $data['sup_id'] ?: null,
            $data['status'],
            $id,
        ]);
    }

    public static function adjustQty(int $itemId, float $delta): void
    {
        $item = self::find($itemId);
        if (!$item) {
            throw new RuntimeException('Inventory item not found.');
        }
        $newQty = (float) $item['current_qty'] + $delta;
        if ($newQty < 0) {
            throw new RuntimeException('Insufficient stock for this operation.');
        }
        $stmt = Database::connection()->prepare(
            'UPDATE inventory SET current_qty = ? WHERE item_id = ?'
        );
        $stmt->execute([$newQty, $itemId]);
    }

    public static function expectedQty(int $itemId, ?string $since = null): float
    {
        $item = self::find($itemId);
        if (!$item) {
            return 0.0;
        }
        return (float) $item['current_qty'];
    }

    /** Stock value report: qty x unit_cost for money audit. */
    public static function moneyAudit(): array
    {
        return Database::connection()->query(
            'SELECT i.item_id, i.name, i.unit, i.current_qty, i.unit_cost,
                    ROUND(i.current_qty * i.unit_cost, 2) AS stock_value,
                    s.name AS supplier_name
             FROM inventory i
             LEFT JOIN suppliers s ON s.sup_id = i.sup_id
             WHERE i.status = \'active\'
             ORDER BY i.name'
        )->fetchAll();
    }

    public static function totalStockValue(): float
    {
        return (float) Database::connection()->query(
            'SELECT COALESCE(SUM(current_qty * unit_cost), 0) FROM inventory WHERE status = \'active\''
        )->fetchColumn();
    }
}
