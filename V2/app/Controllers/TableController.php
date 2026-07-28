<?php

declare(strict_types=1);

final class TableController
{
    public static function index(): void
    {
        require_role(['admin', 'manager']);
        view('tables/index', [
            'title' => 'Tables & QR Codes',
            'tables' => RestaurantTable::all(),
        ]);
    }

    public static function store(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $number = trim($_POST['table_number'] ?? '');
        $capacity = max(1, (int) ($_POST['capacity'] ?? 4));
        if ($number === '') {
            flash('danger', 'Table number is required.');
            redirect('tables');
        }
        try {
            RestaurantTable::create($number, $capacity);
            flash('success', 'Table ' . $number . ' created with QR token.');
        } catch (Throwable $e) {
            flash('danger', 'Could not create table: ' . $e->getMessage());
        }
        redirect('tables');
    }

    public static function regenerate(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $id = (int) ($_POST['table_id'] ?? 0);
        if ($id <= 0) {
            flash('danger', 'Invalid table.');
            redirect('tables');
        }
        RestaurantTable::regenerateToken($id);
        flash('success', 'QR token regenerated. Reprint the QR code.');
        redirect('tables');
    }

    public static function printQr(): void
    {
        require_role(['admin', 'manager']);
        $config = require CONFIG_PATH . '/app.php';
        $tables = RestaurantTable::all();
        require APP_PATH . '/Views/tables/print.php';
        exit;
    }
}
