<?php

declare(strict_types=1);

final class KitchenController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'kitchen']);
        view('kitchen/index', [
            'title' => 'Kitchen Display',
            'queue' => Order::kitchenQueue(),
        ]);
    }

    public static function update(): void
    {
        require_role(['admin', 'manager', 'kitchen']);
        verify_csrf();
        $orderId = (int) ($_POST['order_id'] ?? 0);
        $action = $_POST['action'] ?? '';
        try {
            if ($action === 'preparing') {
                Order::markPreparing($orderId);
                flash('success', 'Order marked preparing.');
            } elseif ($action === 'served') {
                Order::markServed($orderId);
                flash('success', 'Order marked served.');
            }
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('kitchen');
    }
}
