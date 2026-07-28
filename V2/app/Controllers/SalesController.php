<?php

declare(strict_types=1);

final class SalesController
{
    public static function index(): void
    {
        require_role(['staff', 'manager', 'server', 'admin']);
        $user = auth_user();
        view('sales/index', [
            'title' => 'Record Sales',
            'products' => Product::allActive(),
            'shift' => Shift::resolveForTransaction((int) $user['user_id'], $user['role']),
            'recent' => Sale::recent(15),
        ]);
    }

    public static function store(): void
    {
        require_role(['staff', 'manager', 'server', 'admin']);
        verify_csrf();
        $user = auth_user();
        $shift = Shift::resolveForTransaction((int) $user['user_id'], $user['role']);
        if (!$shift) {
            flash('danger', 'No open shift. Ask a manager to open a shift before recording sales.');
            redirect('sales');
        }

        try {
            Sale::record(
                (int) ($_POST['product_id'] ?? 0),
                max(1, (int) ($_POST['qty_sold'] ?? 1)),
                (int) $shift['shift_id'],
                (int) $user['user_id']
            );
            flash('success', 'Sale recorded and inventory updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('sales');
    }
}
