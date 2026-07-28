<?php

declare(strict_types=1);

final class ServerController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'server']);
        view('server/index', [
            'title' => 'Waiter Tablet',
            'tables' => RestaurantTable::all(),
            'products' => Product::menuItems(),
            'categories' => Product::categoriesWithProducts(),
            'waiterAlerts' => WaiterRequest::pendingAlerts(),
        ]);
    }

    public static function order(): void
    {
        require_role(['admin', 'manager', 'server']);
        verify_csrf();
        $tableId = (int) ($_POST['table_id'] ?? 0);
        $items = json_decode($_POST['items_json'] ?? '[]', true);
        if (!is_array($items)) {
            $items = [];
        }
        $user = auth_user();
        try {
            $orderId = Order::create($tableId, $items, 'server', (int) $user['user_id']);
            flash('success', 'Order #' . $orderId . ' submitted to kitchen.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('server?table=' . $tableId);
    }

    public static function alerts(): void
    {
        require_role(['admin', 'manager', 'server']);
        header('Content-Type: application/json');
        $user = auth_user();
        $userId = (int) $user['user_id'];
        $alerts = [];
        foreach (WaiterRequest::pendingAlerts() as $row) {
            $alerts[] = [
                'request_id' => (int) $row['request_id'],
                'table_id' => (int) $row['table_id'],
                'table_number' => $row['table_number'],
                'status' => $row['status'],
                'requested_at' => $row['requested_at'],
                'assigned_name' => $row['assigned_name'],
                'assigned_to_me' => (int) ($row['assigned_user_id'] ?? 0) === $userId,
                'is_mine' => $row['status'] === 'accepted' && (int) ($row['assigned_user_id'] ?? 0) === $userId,
            ];
        }
        echo json_encode([
            'ok' => true,
            'alerts' => $alerts,
            'pending_count' => WaiterRequest::pendingCount(),
            'on_duty' => count(WaiterRequest::availableWaiters()) > 0,
        ]);
    }

    public static function acceptWaiter(): void
    {
        require_role(['admin', 'manager', 'server']);
        verify_csrf();
        $requestId = (int) ($_POST['request_id'] ?? 0);
        $user = auth_user();
        try {
            WaiterRequest::accept($requestId, (int) $user['user_id']);
            flash('success', 'You accepted the table call — please go to the table.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('server');
    }

    public static function completeWaiter(): void
    {
        require_role(['admin', 'manager', 'server']);
        verify_csrf();
        $requestId = (int) ($_POST['request_id'] ?? 0);
        $user = auth_user();
        try {
            WaiterRequest::complete($requestId, (int) $user['user_id']);
            flash('success', 'Table call marked complete.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('server');
    }
}
