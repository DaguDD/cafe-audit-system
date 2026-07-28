<?php

declare(strict_types=1);

final class OrderController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'server']);
        view('orders/index', [
            'title' => 'Active Tables',
            'tables' => RestaurantTable::all(),
        ]);
    }

    public static function tableDetail(): void
    {
        require_role(['admin', 'manager', 'server']);
        $id = (int) ($_GET['id'] ?? 0);
        $table = RestaurantTable::find($id);
        if (!$table) {
            flash('danger', 'Table not found.');
            redirect('orders');
        }
        view('orders/detail', [
            'title' => 'Table ' . $table['table_number'],
            'table' => $table,
            'session' => RestaurantTable::activeSession($id),
            'bill' => Order::tableBill($id),
            'pendingPayment' => PaymentSubmission::pendingForTable($id),
            'latestPayment' => PaymentSubmission::latestForTable($id),
        ]);
    }

    public static function pay(): void
    {
        require_role(['admin', 'manager', 'server']);
        verify_csrf();
        $orderId = (int) ($_POST['order_id'] ?? 0);
        $user = auth_user();
        $shift = Shift::resolveForTransaction((int) $user['user_id'], $user['role']);
        if (!$shift) {
            flash('danger', 'No open shift. Ask a manager to open a shift for a server or staff member.');
            redirect('orders');
        }
        try {
            Order::pay($orderId, (int) $user['user_id'], (int) $shift['shift_id']);
            flash('success', 'Order paid. Inventory deducted and sale recorded.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        $order = Order::find($orderId);
        redirect('orders/detail?id=' . ($order['table_id'] ?? ''));
    }

    public static function payAll(): void
    {
        require_role(['admin', 'manager', 'server']);
        verify_csrf();
        $tableId = (int) ($_POST['table_id'] ?? 0);
        $user = auth_user();
        $shift = Shift::resolveForTransaction((int) $user['user_id'], $user['role']);
        if (!$shift) {
            flash('danger', 'No open shift. Ask a manager to open a shift first.');
            redirect('orders/detail?id=' . $tableId);
        }
        $bill = Order::tableBill($tableId);
        try {
            foreach ($bill['orders'] as $order) {
                Order::pay((int) $order['order_id'], (int) $user['user_id'], (int) $shift['shift_id']);
            }
            RestaurantTable::setStatus($tableId, 'available');
            flash('success', 'All orders paid for this table.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('orders/detail?id=' . $tableId);
    }

    public static function cancel(): void
    {
        require_role(['admin', 'manager', 'server']);
        verify_csrf();
        $orderId = (int) ($_POST['order_id'] ?? 0);
        try {
            Order::cancel($orderId);
            flash('success', 'Order cancelled.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        $order = Order::find($orderId);
        redirect('orders/detail?id=' . ($order['table_id'] ?? ''));
    }
}
