<?php

declare(strict_types=1);

final class WasteController
{
    public static function index(): void
    {
        require_role(['staff', 'server', 'kitchen', 'auditor', 'manager', 'admin']);
        view('waste/index', [
            'title' => 'Log Waste',
            'items' => Inventory::all(),
            'recent' => WasteLog::recent(15),
        ]);
    }

    public static function store(): void
    {
        require_role(['staff', 'server', 'kitchen', 'auditor', 'manager', 'admin']);
        verify_csrf();
        $user = auth_user();
        $shift = Shift::resolveForTransaction((int) $user['user_id'], $user['role']);

        try {
            WasteLog::log(
                (int) ($_POST['item_id'] ?? 0),
                (float) ($_POST['waste_qty'] ?? 0),
                $_POST['reason'] ?? 'other',
                (int) $user['user_id'],
                $shift ? (int) $shift['shift_id'] : null
            );
            flash('success', 'Waste logged successfully.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('waste');
    }
}
