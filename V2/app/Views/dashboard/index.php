<?php
$chartLabels = json_encode(array_column($revenueChart, 'label'));
$chartValues = json_encode(array_column($revenueChart, 'total'));
$weekTotal = array_sum(array_column($revenueChart, 'total'));
?>

<div class="page-hero">
    <div>
        <p class="page-eyebrow">Cafe Audit System</p>
        <h1>Dashboard</h1>
    </div>
    <p class="lead">Welcome, <?= e($user['full_name']) ?> · <?= e(role_label($user['role'])) ?></p>
</div>

<?php if ($myShift): ?>
<div class="cas-alert cas-alert-info">
    Shift active (auto) since <strong class="font-mono"><?= e($myShift['opened_at']) ?></strong>
    · <?= e(Shift::formatDuration($myShift)) ?> on clock
</div>
<?php elseif (in_array($user['role'], ['staff', 'server', 'kitchen'], true)): ?>
<div class="cas-alert cas-alert-warning">Not clocked in — log out and back in to start your shift automatically.</div>
<?php endif; ?>

<div class="kpi-grid">
    <div class="stat-card">
        <div class="stat-label">Today's Revenue</div>
        <div class="stat-value text-success"><?= money($todaySales) ?></div>
        <div class="stat-delta">7d: <?= money($weekTotal) ?></div>
    </div>
    <div class="stat-card">
        <div class="stat-label">Active Shifts</div>
        <div class="stat-value"><?= count($openShifts) ?></div>
    </div>
    <?php if (in_array($user['role'], ['admin', 'manager', 'server'], true)): ?>
    <div class="stat-card">
        <div class="stat-label">Tables Ordering</div>
        <div class="stat-value"><?= count(array_filter($activeTables ?? [], fn($t) => in_array($t['status'], ['ordering', 'bill_requested', 'occupied'], true))) ?></div>
    </div>
    <?php endif; ?>
    <?php if (in_array($user['role'], ['admin', 'manager', 'server', 'staff'], true)): ?>
    <div class="stat-card <?= PaymentSubmission::pendingCount() ? 'stat-alert' : '' ?>">
        <div class="stat-label">Pending Payments</div>
        <div class="stat-value"><?= PaymentSubmission::pendingCount() ?></div>
    </div>
    <?php endif; ?>
    <?php if (in_array($user['role'], ['admin', 'manager', 'kitchen'], true)): ?>
    <div class="stat-card <?= ($kitchenQueue ?? 0) ? 'stat-alert' : '' ?>">
        <div class="stat-label">Kitchen Queue</div>
        <div class="stat-value"><?= (int) ($kitchenQueue ?? 0) ?></div>
    </div>
    <?php endif; ?>
    <div class="stat-card <?= count($lowStock) ? 'stat-alert' : '' ?>">
        <div class="stat-label">Low Stock</div>
        <div class="stat-value <?= count($lowStock) ? 'text-danger' : '' ?>"><?= count($lowStock) ?></div>
    </div>
    <?php if (in_array($user['role'], ['admin', 'manager', 'auditor'], true)): ?>
    <div class="stat-card">
        <div class="stat-label">Pending POs</div>
        <div class="stat-value"><?= $pendingPOs ?></div>
    </div>
    <?php endif; ?>
</div>

<div class="grid-2">
    <div class="glass-panel">
        <div class="panel-head">
            <h3>Revenue (7 days)</h3>
        </div>
        <div class="panel-body chart-panel">
            <canvas id="revenueChart"
                    data-labels="<?= htmlspecialchars($chartLabels, ENT_QUOTES, 'UTF-8') ?>"
                    data-values="<?= htmlspecialchars($chartValues, ENT_QUOTES, 'UTF-8') ?>"></canvas>
        </div>
    </div>

    <div class="glass-panel">
        <div class="panel-head">
            <h3>Recent Sales</h3>
            <a href="<?= url('sales') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">All</a>
        </div>
        <div class="table-responsive">
            <table class="table table-sm">
                <thead><tr><th>Product</th><th>Qty</th><th>Total</th><th>Time</th></tr></thead>
                <tbody>
                <?php if (empty($recentSales)): ?>
                    <tr><td colspan="4" class="text-muted">No sales yet.</td></tr>
                <?php endif; ?>
                <?php foreach ($recentSales as $s): ?>
                    <tr>
                        <td><?= e($s['product_name']) ?></td>
                        <td><?= e((string) $s['qty_sold']) ?></td>
                        <td class="font-mono"><?= money((float) $s['total']) ?></td>
                        <td class="text-muted font-mono" style="font-size:0.75rem"><?= e(date('H:i', strtotime($s['sold_at']))) ?></td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php if (!empty($recentAudits)): ?>
<div class="glass-panel">
    <div class="panel-head">
        <h3>Recent Audits</h3>
        <a href="<?= url('audit') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">New audit</a>
    </div>
    <div class="table-responsive">
        <table class="table table-sm">
            <thead><tr><th>Item</th><th>Variance</th><th>By</th><th>When</th></tr></thead>
            <tbody>
            <?php foreach ($recentAudits as $a): ?>
                <?php
                $badge = abs((float)$a['discrepancy']) < 0.001 ? 'cas-badge-ok'
                    : ((float)$a['discrepancy'] < 0 ? 'cas-badge-danger' : 'cas-badge-warn');
                ?>
                <tr>
                    <td><?= e($a['item_name']) ?></td>
                    <td><span class="cas-badge <?= $badge ?>"><?= e($a['discrepancy']) ?></span></td>
                    <td><?= e($a['auditor_name']) ?></td>
                    <td class="text-muted font-mono" style="font-size:0.75rem"><?= e(date('M j, H:i', strtotime($a['audited_at']))) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>

<?php if (!empty($lowStock)): ?>
<div class="glass-panel">
    <div class="panel-head">
        <h3>Low Stock Alerts</h3>
        <span class="cas-badge cas-badge-danger"><?= count($lowStock) ?></span>
    </div>
    <div class="table-responsive">
        <table class="table table-sm">
            <thead><tr><th>Item</th><th>Qty</th><th>Min</th></tr></thead>
            <tbody>
            <?php foreach ($lowStock as $item): ?>
                <tr class="row-low-stock">
                    <td><?= e($item['name']) ?></td>
                    <td class="font-mono"><?= e($item['current_qty']) ?> <?= e($item['unit']) ?></td>
                    <td class="font-mono text-muted"><?= e($item['min_threshold']) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php endif; ?>
