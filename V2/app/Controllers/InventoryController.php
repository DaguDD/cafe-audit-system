<?php

declare(strict_types=1);

final class InventoryController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'auditor', 'kitchen']);
        view('inventory/index', [
            'title' => 'Inventory',
            'items' => Inventory::all(),
            'suppliers' => Supplier::all(),
        ]);
    }

    public static function store(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            Inventory::create([
                'name' => trim($_POST['name'] ?? ''),
                'unit' => trim($_POST['unit'] ?? 'unit'),
                'current_qty' => (float) ($_POST['current_qty'] ?? 0),
                'min_threshold' => (float) ($_POST['min_threshold'] ?? 1),
                'unit_cost' => (float) ($_POST['unit_cost'] ?? 0),
                'sup_id' => (int) ($_POST['sup_id'] ?? 0) ?: null,
            ]);
            flash('success', 'Inventory item added.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('inventory');
    }

    public static function update(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $id = (int) ($_POST['item_id'] ?? 0);
        try {
            Inventory::update($id, [
                'name' => trim($_POST['name'] ?? ''),
                'unit' => trim($_POST['unit'] ?? 'unit'),
                'current_qty' => (float) ($_POST['current_qty'] ?? 0),
                'min_threshold' => (float) ($_POST['min_threshold'] ?? 1),
                'unit_cost' => (float) ($_POST['unit_cost'] ?? 0),
                'sup_id' => (int) ($_POST['sup_id'] ?? 0) ?: null,
                'status' => $_POST['status'] ?? 'active',
            ]);
            flash('success', 'Inventory item updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('inventory');
    }
}
