<?php

declare(strict_types=1);

final class SupplierController
{
    public static function index(): void
    {
        require_role(['admin', 'manager']);
        view('suppliers/index', [
            'title' => 'Suppliers & Purchase Orders',
            'suppliers' => Supplier::all(),
            'orders' => PurchaseOrder::all(),
            'items' => Inventory::all(),
        ]);
    }

    public static function storeSupplier(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            Supplier::create([
                'name' => trim($_POST['name'] ?? ''),
                'contact_info' => trim($_POST['contact_info'] ?? ''),
                'email' => trim($_POST['email'] ?? ''),
            ]);
            flash('success', 'Supplier added.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('suppliers');
    }

    public static function storePO(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        $user = auth_user();
        try {
            PurchaseOrder::create([
                'item_id' => (int) $_POST['item_id'],
                'sup_id' => (int) $_POST['sup_id'],
                'ordered_qty' => (float) $_POST['ordered_qty'],
                'unit_cost' => (float) ($_POST['unit_cost'] ?? 0),
                'expected_delivery' => $_POST['expected_delivery'] ?? null,
            ], (int) $user['user_id']);
            flash('success', 'Purchase order created.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('suppliers');
    }

    public static function receivePO(): void
    {
        require_role(['admin', 'manager']);
        verify_csrf();
        try {
            PurchaseOrder::markReceived((int) $_POST['po_id']);
            flash('success', 'Purchase order marked received. Inventory updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('suppliers');
    }
}
