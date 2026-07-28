<?php

declare(strict_types=1);

final class Sale
{
    public static function record(int $productId, int $qty, int $shiftId, int $userId): void
    {
        self::recordFromOrder($productId, $qty, $shiftId, $userId, null, null);
    }

    public static function recordFromOrder(
        int $productId,
        int $qty,
        int $shiftId,
        int $userId,
        ?int $orderId = null,
        ?int $tableId = null
    ): void {
        $pdo = Database::connection();
        $product = Product::find($productId);
        if (!$product || $product['status'] !== 'active') {
            throw new RuntimeException('Product not available.');
        }

        $recipes = Product::recipes($productId);
        if (empty($recipes)) {
            throw new RuntimeException('No recipe defined for this product.');
        }

        foreach ($recipes as $recipe) {
            $needed = (float) $recipe['qty_needed'] * $qty;
            if ((float) $recipe['current_qty'] < $needed) {
                throw new RuntimeException(
                    'Insufficient stock: ' . $recipe['item_name'] . ' (need ' . $needed . ' ' . $recipe['unit'] . ')'
                );
            }
        }

        $ownTransaction = !$pdo->inTransaction();
        if ($ownTransaction) {
            $pdo->beginTransaction();
        }
        try {
            $unitPrice = (float) $product['price'];
            $total = $unitPrice * $qty;
            $stmt = $pdo->prepare(
                'INSERT INTO sales (product_id, qty_sold, unit_price, total, shift_id, user_id, order_id, table_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$productId, $qty, $unitPrice, $total, $shiftId, $userId, $orderId, $tableId]);

            foreach ($recipes as $recipe) {
                $needed = (float) $recipe['qty_needed'] * $qty;
                Inventory::adjustQty((int) $recipe['item_id'], -$needed);
            }

            if ($ownTransaction) {
                $pdo->commit();
            }
        } catch (Throwable $e) {
            if ($ownTransaction && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function todayTotal(): float
    {
        $row = Database::connection()->query(
            'SELECT COALESCE(SUM(total), 0) AS total FROM sales WHERE DATE(sold_at) = CURDATE()'
        )->fetch();
        return (float) $row['total'];
    }

    public static function recent(int $limit = 10): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT s.*, p.name AS product_name, u.full_name AS staff_name
             FROM sales s
             JOIN products p ON p.product_id = s.product_id
             JOIN users u ON u.user_id = s.user_id
             ORDER BY s.sold_at DESC LIMIT ?'
        );
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** @return array<int, array{label: string, total: float}> */
    public static function revenueLast7Days(): array
    {
        $rows = Database::connection()->query(
            'SELECT DATE(sold_at) AS day, COALESCE(SUM(total), 0) AS total
             FROM sales
             WHERE sold_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
             GROUP BY DATE(sold_at)
             ORDER BY day ASC'
        )->fetchAll();

        $map = [];
        foreach ($rows as $row) {
            $map[$row['day']] = (float) $row['total'];
        }

        $result = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = date('Y-m-d', strtotime("-{$i} days"));
            $result[] = [
                'label' => date('D', strtotime($day)),
                'total' => $map[$day] ?? 0.0,
            ];
        }
        return $result;
    }
}
