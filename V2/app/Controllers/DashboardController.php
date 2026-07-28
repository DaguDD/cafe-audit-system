<?php

declare(strict_types=1);

final class DashboardController
{
    public static function index(): void
    {
        require_auth();
        $user = auth_user();

        $data = [
            'title' => 'Dashboard',
            'todaySales' => Sale::todayTotal(),
            'lowStock' => Inventory::lowStock(),
            'openShifts' => Shift::openShifts(),
            'pendingPOs' => in_array($user['role'], ['admin', 'manager', 'auditor'], true)
                ? PurchaseOrder::pendingCount() : 0,
            'recentAudits' => in_array($user['role'], ['admin', 'manager', 'auditor'], true)
                ? AuditLog::recent(5) : [],
            'recentSales' => Sale::recent(8),
            'revenueChart' => Sale::revenueLast7Days(),
            'myShift' => Shift::resolveForTransaction((int) $user['user_id'], $user['role']),
            'activeTables' => RestaurantTable::all(),
            'kitchenQueue' => in_array($user['role'], ['admin', 'manager', 'kitchen'], true)
                ? count(Order::kitchenQueue()) : 0,
        ];

        view('dashboard/index', $data);
    }
}
