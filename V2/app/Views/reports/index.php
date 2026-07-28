<div class="page-hero">
    <div><p class="page-eyebrow">Reports</p><h1>Analytics</h1></div>
    <div class="d-flex flex-wrap gap-2">
        <a href="<?= url('reports/export/sales') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">Export sales (CSV)</a>
        <a href="<?= url('reports/print?type=sales') ?>" class="cas-btn cas-btn-ghost cas-btn-sm" target="_blank">Print / PDF</a>
    </div>
</div>

<ul class="nav cas-tabs" role="tablist">
    <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#sales-tab">Revenue</button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#audit-tab">Audits</button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#waste-tab">Waste</button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#staff-tab">Staff</button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#logins-tab">Login events</button></li>
</ul>

<div class="tab-content">
    <div class="tab-pane fade show active" id="sales-tab">
        <div class="glass-panel">
            <div class="panel-head">
                <h3>Last 30 days</h3>
                <a href="<?= url('reports/export/sales') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">CSV</a>
            </div>
            <div class="table-responsive">
                <table class="table mb-0">
                    <thead><tr><th>Date</th><th>Revenue</th><th>Units Sold</th></tr></thead>
                    <tbody>
                    <?php if (empty($salesSummary)): ?>
                        <tr><td colspan="3" class="text-muted">No sales in this period.</td></tr>
                    <?php endif; ?>
                    <?php foreach ($salesSummary as $row): ?>
                        <tr>
                            <td><?= e($row['day']) ?></td>
                            <td class="font-mono"><?= money((float) $row['revenue']) ?></td>
                            <td><?= e((string) $row['units']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="tab-pane fade" id="audit-tab">
        <div class="glass-panel">
            <div class="panel-head">
                <h3>Audit history</h3>
                <div class="d-flex gap-1">
                    <a href="<?= url('reports/export/audits') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">CSV</a>
                    <a href="<?= url('reports/print?type=audit') ?>" class="cas-btn cas-btn-ghost cas-btn-sm" target="_blank">PDF</a>
                </div>
            </div>
            <div class="table-responsive">
                <table class="table mb-0 table-sm">
                    <thead><tr><th>Date</th><th>Item</th><th>System</th><th>Physical</th><th>Disc.</th><th>Var %</th></tr></thead>
                    <tbody>
                    <?php foreach ($auditHistory as $a): ?>
                        <tr>
                            <td class="text-muted" style="font-size:0.8rem"><?= e($a['audited_at']) ?></td>
                            <td><?= e($a['item_name']) ?></td>
                            <td class="font-mono"><?= e($a['system_qty']) ?></td>
                            <td class="font-mono"><?= e($a['physical_qty']) ?></td>
                            <td class="font-mono"><?= e($a['discrepancy']) ?></td>
                            <td><?= e($a['variance_pct']) ?>%</td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="tab-pane fade" id="waste-tab">
        <div class="glass-panel">
            <div class="panel-head">
                <h3>Waste by reason</h3>
                <a href="<?= url('reports/export/waste') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">CSV</a>
            </div>
            <div class="table-responsive">
                <table class="table mb-0">
                    <thead><tr><th>Reason</th><th>Total Qty</th><th>Events</th></tr></thead>
                    <tbody>
                    <?php foreach ($wasteReport as $w): ?>
                        <tr>
                            <td><?= e($w['reason']) ?></td>
                            <td class="font-mono"><?= e($w['total_qty']) ?></td>
                            <td><?= e((string) $w['events']) ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="tab-pane fade" id="staff-tab">
        <div class="grid-2">
            <div class="glass-panel">
                <div class="panel-head">
                    <h3>Staff performance (30 days)</h3>
                    <a href="<?= url('reports/export/staff') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">CSV</a>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm mb-0">
                        <thead><tr><th>Staff</th><th>Sales</th><th>Revenue</th><th></th></tr></thead>
                        <tbody>
                        <?php foreach ($staffPerformance as $s): ?>
                            <tr>
                                <td>
                                    <?= e($s['full_name']) ?>
                                    <?php if ($s['status'] !== 'active'): ?>
                                        <span class="cas-badge cas-badge-muted">inactive</span>
                                    <?php endif; ?>
                                </td>
                                <td class="font-mono"><?= e((string) $s['transactions']) ?></td>
                                <td class="font-mono"><?= money((float) $s['revenue']) ?></td>
                                <td>
                                    <a href="<?= url('reports?staff=' . (int) $s['user_id'] . '#staff-tab') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">Detail</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="glass-panel">
                <div class="panel-head"><h3>Staff detail</h3></div>
                <div class="panel-body">
                <?php if ($staffDetail): ?>
                    <p class="mb-2"><strong><?= e($staffDetail['full_name']) ?></strong> · <span class="text-muted font-mono"><?= e($staffDetail['username']) ?></span></p>
                    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:0.75rem">
                        <div class="stat-card"><div class="stat-label">Transactions</div><div class="stat-value"><?= e((string) $staffDetail['transactions']) ?></div></div>
                        <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value text-success"><?= money((float) $staffDetail['revenue']) ?></div></div>
                        <div class="stat-card"><div class="stat-label">Units</div><div class="stat-value"><?= e((string) $staffDetail['units_sold']) ?></div></div>
                    </div>
                    <?php if (!empty($staffDetail['by_product'])): ?>
                    <p class="small text-muted mb-1">By product</p>
                    <table class="table table-sm mb-3">
                        <thead><tr><th>Product</th><th>Qty</th><th>Revenue</th></tr></thead>
                        <tbody>
                        <?php foreach ($staffDetail['by_product'] as $p): ?>
                            <tr>
                                <td><?= e($p['product_name']) ?></td>
                                <td class="font-mono"><?= e((string) $p['qty']) ?></td>
                                <td class="font-mono"><?= money((float) $p['revenue']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                    <?php endif; ?>
                    <?php if (!empty($staffDetail['recent_sales'])): ?>
                    <p class="small text-muted mb-1">Recent transactions</p>
                    <table class="table table-sm mb-0">
                        <thead><tr><th>Time</th><th>Product</th><th>Total</th></tr></thead>
                        <tbody>
                        <?php foreach ($staffDetail['recent_sales'] as $sale): ?>
                            <tr>
                                <td class="text-muted" style="font-size:0.75rem"><?= e($sale['sold_at']) ?></td>
                                <td><?= e($sale['product_name']) ?> ×<?= e((string) $sale['qty_sold']) ?></td>
                                <td class="font-mono"><?= money((float) $sale['total']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                    <?php else: ?>
                    <p class="text-muted small mb-0">No sales in the last 30 days.</p>
                    <?php endif; ?>
                <?php else: ?>
                    <p class="text-muted small mb-0">Select a staff member from the list to see transaction breakdown.</p>
                <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <div class="tab-pane fade" id="logins-tab">
        <div class="glass-panel">
            <div class="panel-head">
                <h3>Login & logout events</h3>
                <a href="<?= url('reports/export/logins') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">CSV</a>
            </div>
            <p class="small text-muted px-3 pt-2 mb-0">Tracks who signed in or out and from which IP — useful when reviewing auditor access.</p>
            <div class="table-responsive">
                <table class="table table-sm mb-0">
                    <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>IP</th></tr></thead>
                    <tbody>
                    <?php if (empty($loginLogs)): ?>
                        <tr><td colspan="5" class="text-muted">No login events recorded yet.</td></tr>
                    <?php endif; ?>
                    <?php foreach ($loginLogs as $log): ?>
                        <tr>
                            <td class="text-muted font-mono" style="font-size:0.75rem"><?= e($log['created_at']) ?></td>
                            <td><?= e($log['full_name']) ?> <span class="text-muted">(<?= e($log['username']) ?>)</span></td>
                            <td><span class="role-pill <?= role_badge_class($log['role']) ?>"><?= e($log['role']) ?></span></td>
                            <td><span class="cas-badge <?= $log['action'] === 'login' ? 'cas-badge-ok' : 'cas-badge-muted' ?>"><?= e($log['action']) ?></span></td>
                            <td class="font-mono text-muted"><?= e($log['ip_address'] ?? '—') ?></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<?php if ($selectedStaffId > 0): ?>
<script>
document.addEventListener('DOMContentLoaded', () => {
  const tab = document.querySelector('[data-bs-target="#staff-tab"]');
  if (tab && typeof bootstrap !== 'undefined') bootstrap.Tab.getOrCreateInstance(tab).show();
});
</script>
<?php endif; ?>
