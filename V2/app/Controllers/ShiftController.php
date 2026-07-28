<?php

declare(strict_types=1);

final class ShiftController
{
    public static function index(): void
    {
        require_role(['admin', 'manager']);
        view('shifts/index', [
            'title' => 'Shift Management',
            'openShifts' => Shift::openShifts(),
            'todayClosed' => Shift::todayClosed(),
            'staff' => array_filter(
                User::all(),
                fn ($u) => in_array($u['role'], ['staff', 'server', 'kitchen'], true) && $u['status'] === 'active'
            ),
            'cafeHours' => (require CONFIG_PATH . '/app.php')['cafe_hours'] ?? [],
        ]);
    }

    public static function open(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $user = auth_user();
        try {
            Shift::openShift((int) $_POST['user_id'], (int) $user['user_id']);
            flash('success', 'Shift opened.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('shifts');
    }

    public static function close(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            Shift::closeShift((int) $_POST['shift_id']);
            flash('success', 'Shift closed.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('shifts');
    }
}
