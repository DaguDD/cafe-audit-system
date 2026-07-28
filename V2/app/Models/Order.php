<?php

declare(strict_types=1);

final class Order
{
    public static function create(
        int $tableId,
        array $items,
        string $source = 'qr',
        ?int $serverUserId = null,
        ?string $notes = null
    ): int {
        if (empty($items)) {
            throw new RuntimeException('Order must contain at least one item.');
        }

        $pdo = Database::connection();
        $table = RestaurantTable::find($tableId);
        if (!$table) {
            throw new RuntimeException('Table not found.');
        }

        $subtotal = 0.0;
        $validated = [];

        foreach ($items as $item) {
            $productId = (int) ($item['product_id'] ?? 0);
            $qty = (int) ($item['qty'] ?? 0);
            if ($productId <= 0 || $qty <= 0) {
                continue;
            }
            $product = Product::find($productId);
            if (!$product || $product['status'] !== 'active') {
                throw new RuntimeException('Product unavailable: #' . $productId);
            }
            $recipes = Product::recipes($productId);
            if (empty($recipes)) {
                throw new RuntimeException('No recipe for: ' . $product['name']);
            }
            foreach ($recipes as $recipe) {
                $needed = (float) $recipe['qty_needed'] * $qty;
                if ((float) $recipe['current_qty'] < $needed) {
                    throw new RuntimeException(
                        'Insufficient stock for ' . $product['name'] . ': ' . $recipe['item_name']
                    );
                }
            }
            $lineTotal = (float) $product['price'] * $qty;
            $subtotal += $lineTotal;
            $validated[] = [
                'product_id' => $productId,
                'qty' => $qty,
                'unit_price' => (float) $product['price'],
                'line_total' => $lineTotal,
            ];
        }

        if (empty($validated)) {
            throw new RuntimeException('No valid items in order.');
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO orders (table_id, order_source, server_user_id, status, subtotal, notes)
                 VALUES (?, ?, ?, \'committed\', ?, ?)'
            );
            $stmt->execute([$tableId, $source, $serverUserId, $subtotal, $notes]);
            $orderId = (int) $pdo->lastInsertId();

            $itemStmt = $pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, qty, unit_price, line_total, item_status)
                 VALUES (?, ?, ?, ?, ?, \'committed\')'
            );
            foreach ($validated as $row) {
                $itemStmt->execute([
                    $orderId,
                    $row['product_id'],
                    $row['qty'],
                    $row['unit_price'],
                    $row['line_total'],
                ]);
            }

            RestaurantTable::setStatus($tableId, 'ordering');
            $pdo->commit();
            return $orderId;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function find(int $orderId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT o.*, t.table_number, u.full_name AS server_name
             FROM orders o
             JOIN restaurant_tables t ON t.table_id = o.table_id
             LEFT JOIN users u ON u.user_id = o.server_user_id
             WHERE o.order_id = ?'
        );
        $stmt->execute([$orderId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function items(int $orderId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT oi.*, p.name AS product_name
             FROM order_items oi
             JOIN products p ON p.product_id = oi.product_id
             WHERE oi.order_id = ?
             ORDER BY oi.order_item_id'
        );
        $stmt->execute([$orderId]);
        return $stmt->fetchAll();
    }

    public static function kitchenQueue(): array
    {
        $rows = Database::connection()->query(
            'SELECT o.*, t.table_number
             FROM orders o
             JOIN restaurant_tables t ON t.table_id = o.table_id
             WHERE o.status IN (\'committed\', \'preparing\')
             ORDER BY o.created_at ASC'
        )->fetchAll();

        foreach ($rows as &$row) {
            $row['items'] = self::items((int) $row['order_id']);
        }
        unset($row);

        return $rows;
    }

    public static function updateStatus(int $orderId, string $status): void
    {
        $allowed = ['pending', 'committed', 'preparing', 'served', 'paid', 'cancelled'];
        if (!in_array($status, $allowed, true)) {
            throw new InvalidArgumentException('Invalid order status.');
        }
        $stmt = Database::connection()->prepare('UPDATE orders SET status = ? WHERE order_id = ?');
        $stmt->execute([$status, $orderId]);
    }

    public static function markPreparing(int $orderId): void
    {
        self::updateStatus($orderId, 'preparing');
        $pdo = Database::connection();
        $pdo->prepare(
            'UPDATE order_items SET item_status = \'preparing\' WHERE order_id = ? AND item_status != \'cancelled\''
        )->execute([$orderId]);
    }

    public static function markServed(int $orderId): void
    {
        self::updateStatus($orderId, 'served');
        Database::connection()->prepare(
            'UPDATE order_items SET item_status = \'served\' WHERE order_id = ? AND item_status != \'cancelled\''
        )->execute([$orderId]);
    }

    public static function pay(int $orderId, int $userId, int $shiftId): void
    {
        $order = self::find($orderId);
        if (!$order) {
            throw new RuntimeException('Order not found.');
        }
        if ($order['status'] === 'paid') {
            throw new RuntimeException('Order already paid.');
        }
        if ($order['status'] === 'cancelled') {
            throw new RuntimeException('Cannot pay cancelled order.');
        }

        $items = self::items($orderId);
        $pdo = Database::connection();
        $ownTransaction = !$pdo->inTransaction();
        if ($ownTransaction) {
            $pdo->beginTransaction();
        }
        try {
            foreach ($items as $item) {
                if ($item['item_status'] === 'cancelled') {
                    continue;
                }
                Sale::recordFromOrder(
                    (int) $item['product_id'],
                    (int) $item['qty'],
                    $shiftId,
                    $userId,
                    $orderId,
                    (int) $order['table_id']
                );
            }

            $pdo->prepare(
                'UPDATE orders SET status = \'paid\', paid_at = NOW(), shift_id = ? WHERE order_id = ?'
            )->execute([$shiftId, $orderId]);

            $open = $pdo->prepare(
                'SELECT COUNT(*) FROM orders
                 WHERE table_id = ? AND status NOT IN (\'paid\', \'cancelled\')'
            );
            $open->execute([$order['table_id']]);
            if ((int) $open->fetchColumn() === 0) {
                RestaurantTable::setStatus((int) $order['table_id'], 'available');
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

    public static function cancel(int $orderId): void
    {
        $order = self::find($orderId);
        if (!$order || $order['status'] === 'paid') {
            throw new RuntimeException('Cannot cancel this order.');
        }
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            self::updateStatus($orderId, 'cancelled');
            $pdo->prepare(
                'UPDATE order_items SET item_status = \'cancelled\' WHERE order_id = ?'
            )->execute([$orderId]);

            $open = $pdo->prepare(
                'SELECT COUNT(*) FROM orders
                 WHERE table_id = ? AND status NOT IN (\'paid\', \'cancelled\')'
            );
            $open->execute([$order['table_id']]);
            if ((int) $open->fetchColumn() === 0) {
                RestaurantTable::setStatus((int) $order['table_id'], 'available');
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function requestBill(int $tableId): void
    {
        $bill = self::tableBill($tableId);
        if ((float) $bill['total'] <= 0) {
            throw new RuntimeException('Nothing to bill yet. Tap Request Waiter if you need assistance.');
        }
        RestaurantTable::setStatus($tableId, 'bill_requested');
    }

    public static function tableBill(int $tableId): array
    {
        $orders = Database::connection()->prepare(
            'SELECT * FROM orders
             WHERE table_id = ? AND status NOT IN (\'paid\', \'cancelled\')
             ORDER BY created_at'
        );
        $orders->execute([$tableId]);
        $rows = $orders->fetchAll();
        $total = 0.0;
        foreach ($rows as &$row) {
            $row['items'] = self::items((int) $row['order_id']);
            $total += (float) $row['subtotal'];
        }
        unset($row);
        return ['orders' => $rows, 'total' => $total];
    }
}
