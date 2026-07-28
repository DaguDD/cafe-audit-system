<?php

declare(strict_types=1);

final class ReportController
{
    public static function index(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $staffId = (int) ($_GET['staff'] ?? 0);
        $staffDetail = $staffId > 0 ? Report::staffDetail($staffId) : null;

        view('reports/index', [
            'title' => 'Reports',
            'salesSummary' => Report::salesSummary30Days(),
            'auditHistory' => Report::auditHistory(50),
            'wasteReport' => Report::wasteByReason(),
            'staffPerformance' => Report::staffPerformance(30),
            'loginLogs' => Report::loginLogs(100),
            'staffDetail' => $staffDetail,
            'selectedStaffId' => $staffId,
        ]);
    }

    public static function exportSales(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $rows = [];
        foreach (Report::salesSummary30Days() as $row) {
            $rows[] = [$row['day'], number_format((float) $row['revenue'], 2, '.', ''), $row['units']];
        }
        csv_download('cas-sales-30d.csv', ['Date', 'Revenue (ETB)', 'Units Sold'], $rows);
    }

    public static function exportAudits(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $rows = [];
        foreach (Report::auditHistory(500) as $a) {
            $rows[] = [
                $a['audited_at'],
                $a['item_name'],
                $a['auditor_name'] ?? '',
                $a['system_qty'],
                $a['physical_qty'],
                $a['discrepancy'],
                $a['variance_pct'],
            ];
        }
        csv_download(
            'cas-audits.csv',
            ['Date', 'Item', 'Auditor', 'System Qty', 'Physical Qty', 'Discrepancy', 'Variance %'],
            $rows
        );
    }

    public static function exportWaste(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $rows = [];
        foreach (Report::wasteByReason() as $w) {
            $rows[] = [$w['reason'], $w['total_qty'], $w['events']];
        }
        csv_download('cas-waste.csv', ['Reason', 'Total Qty', 'Events'], $rows);
    }

    public static function exportStaff(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $rows = [];
        foreach (Report::staffPerformance(30) as $s) {
            $rows[] = [
                $s['full_name'],
                $s['username'],
                $s['status'],
                $s['transactions'],
                number_format((float) $s['revenue'], 2, '.', ''),
                $s['units_sold'],
            ];
        }
        csv_download(
            'cas-staff-performance-30d.csv',
            ['Staff', 'Username', 'Status', 'Transactions', 'Revenue (ETB)', 'Units Sold'],
            $rows
        );
    }

    public static function exportLogins(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $rows = [];
        foreach (Report::loginLogs(500) as $log) {
            $rows[] = [
                $log['created_at'],
                $log['full_name'],
                $log['username'],
                $log['role'],
                $log['action'],
                $log['ip_address'] ?? '',
            ];
        }
        csv_download(
            'cas-login-events.csv',
            ['Time', 'Name', 'Username', 'Role', 'Action', 'IP Address'],
            $rows
        );
    }

    public static function printView(): void
    {
        require_role(['admin', 'manager', 'auditor']);
        $type = $_GET['type'] ?? 'sales';
        $data = match ($type) {
            'audit' => ['title' => 'Audit History', 'auditHistory' => Report::auditHistory(100)],
            'waste' => ['title' => 'Waste Summary', 'wasteReport' => Report::wasteByReason()],
            'staff' => ['title' => 'Staff Performance (30 days)', 'staffPerformance' => Report::staffPerformance(30)],
            'logins' => ['title' => 'Login Events', 'loginLogs' => Report::loginLogs(200)],
            default => ['title' => 'Sales Summary (30 days)', 'salesSummary' => Report::salesSummary30Days()],
        };
        $data['type'] = $type;
        $data['config'] = require CONFIG_PATH . '/app.php';
        require APP_PATH . '/Views/reports/print.php';
        exit;
    }
}
