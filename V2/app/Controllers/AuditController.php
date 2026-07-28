<?php

declare(strict_types=1);

final class AuditController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $tab = trim($_GET['tab'] ?? 'stock');
        if (!in_array($tab, ['stock', 'money'], true)) {
            $tab = 'stock';
        }

        $items = Inventory::all();
        foreach ($items as &$item) {
            $item['expected_qty'] = Inventory::expectedQty((int) $item['item_id']);
        }
        unset($item);

        $moneyRows = [];
        $totalStockValue = 0.0;
        $purchaseSpend = 0.0;
        $purchaseHistory = [];
        if ($tab === 'money') {
            $moneyRows = Inventory::moneyAudit();
            $totalStockValue = Inventory::totalStockValue();
            $purchaseSpend = PurchaseOrder::totalSpend('received');
            $purchaseHistory = PurchaseOrder::spendSummary(40);
        }

        view('audit/index', [
            'title' => $tab === 'money' ? 'Money Audit' : 'Stock Audit',
            'tab' => $tab,
            'items' => $items,
            'moneyRows' => $moneyRows,
            'totalStockValue' => $totalStockValue,
            'purchaseSpend' => $purchaseSpend,
            'purchaseHistory' => $purchaseHistory,
        ]);
    }

    public static function submit(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        verify_csrf();
        $user = auth_user();
        $shift = Shift::resolveForTransaction((int) $user['user_id'], $user['role']);

        $physical = $_POST['physical'] ?? [];
        $entries = [];
        foreach ($physical as $itemId => $qty) {
            if ($qty === '' || $qty === null) {
                continue;
            }
            $entries[] = [
                'item_id' => (int) $itemId,
                'physical_qty' => (float) $qty,
            ];
        }

        if (empty($entries)) {
            flash('danger', 'Enter at least one physical count.');
            redirect('audit');
        }

        try {
            AuditLog::submitBatch(
                $entries,
                (int) $user['user_id'],
                $shift ? (int) $shift['shift_id'] : null,
                trim($_POST['comments'] ?? '') ?: null
            );
            flash('success', 'Audit submitted. Discrepancies calculated and inventory updated.');
        } catch (Throwable $e) {
            flash('danger', $e->getMessage());
        }
        redirect('audit?tab=stock');
    }
}
