<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= e($title) ?> · <?= e($config['name']) ?></title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #555; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; }
        @media print { body { margin: 12px; } .no-print { display: none; } }
    </style>
</head>
<body>
    <p class="no-print"><button onclick="window.print()">Print / Save as PDF</button></p>
    <h1><?= e($title) ?></h1>
    <p class="meta"><?= e($config['name']) ?> · Generated <?= e(date('Y-m-d H:i')) ?></p>

    <?php if ($type === 'sales'): ?>
    <table>
        <thead><tr><th>Date</th><th>Revenue (ETB)</th><th>Units Sold</th></tr></thead>
        <tbody>
        <?php foreach ($salesSummary as $row): ?>
            <tr>
                <td><?= e($row['day']) ?></td>
                <td><?= e(number_format((float) $row['revenue'], 2)) ?></td>
                <td><?= e((string) $row['units']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php elseif ($type === 'audit'): ?>
    <table>
        <thead><tr><th>Date</th><th>Item</th><th>Auditor</th><th>System</th><th>Physical</th><th>Disc.</th><th>Var %</th></tr></thead>
        <tbody>
        <?php foreach ($auditHistory as $a): ?>
            <tr>
                <td><?= e($a['audited_at']) ?></td>
                <td><?= e($a['item_name']) ?></td>
                <td><?= e($a['auditor_name'] ?? '') ?></td>
                <td><?= e($a['system_qty']) ?></td>
                <td><?= e($a['physical_qty']) ?></td>
                <td><?= e($a['discrepancy']) ?></td>
                <td><?= e($a['variance_pct']) ?>%</td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php elseif ($type === 'waste'): ?>
    <table>
        <thead><tr><th>Reason</th><th>Total Qty</th><th>Events</th></tr></thead>
        <tbody>
        <?php foreach ($wasteReport as $w): ?>
            <tr><td><?= e($w['reason']) ?></td><td><?= e($w['total_qty']) ?></td><td><?= e((string) $w['events']) ?></td></tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php elseif ($type === 'staff'): ?>
    <table>
        <thead><tr><th>Staff</th><th>Username</th><th>Transactions</th><th>Revenue (ETB)</th><th>Units</th></tr></thead>
        <tbody>
        <?php foreach ($staffPerformance as $s): ?>
            <tr>
                <td><?= e($s['full_name']) ?></td>
                <td><?= e($s['username']) ?></td>
                <td><?= e((string) $s['transactions']) ?></td>
                <td><?= e(number_format((float) $s['revenue'], 2)) ?></td>
                <td><?= e((string) $s['units_sold']) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php elseif ($type === 'logins'): ?>
    <table>
        <thead><tr><th>Time</th><th>Name</th><th>Role</th><th>Action</th><th>IP</th></tr></thead>
        <tbody>
        <?php foreach ($loginLogs as $log): ?>
            <tr>
                <td><?= e($log['created_at']) ?></td>
                <td><?= e($log['full_name']) ?> (<?= e($log['username']) ?>)</td>
                <td><?= e($log['role']) ?></td>
                <td><?= e($log['action']) ?></td>
                <td><?= e($log['ip_address'] ?? '—') ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</body>
</html>
