<?php $tab = $tab ?? 'stock'; ?>
<div class="page-hero">
    <div>
        <p class="page-eyebrow">Audit</p>
        <h1><?= $tab === 'money' ? 'Money Audit' : 'Stock Reconciliation' ?></h1>
    </div>
    <p class="lead"><?= $tab === 'money'
        ? 'Track what inventory costs and purchase spend look like in ETB'
        : 'Physical count vs system · 10% variance flag' ?></p>
</div>

<ul class="nav nav-pills gap-2 mb-4">
    <li class="nav-item">
        <a class="nav-link<?= $tab === 'stock' ? ' active' : '' ?>" href="<?= url('audit?tab=stock') ?>">Stock audit</a>
    </li>
    <li class="nav-item">
        <a class="nav-link<?= $tab === 'money' ? ' active' : '' ?>" href="<?= url('audit?tab=money') ?>">Money audit</a>
    </li>
</ul>

<?php if ($tab === 'money'): ?>

<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="cas-card h-100">
            <div class="small text-muted text-uppercase">Stock on hand (value)</div>
            <div class="fs-3 fw-semibold text-accent"><?= money((float) $totalStockValue) ?></div>
            <div class="small text-muted">Sum of qty × unit cost</div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="cas-card h-100">
            <div class="small text-muted text-uppercase">Received purchase spend</div>
            <div class="fs-3 fw-semibold"><?= money((float) $purchaseSpend) ?></div>
            <div class="small text-muted">Total cost of received POs</div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="cas-card h-100">
            <div class="small text-muted text-uppercase">Active items tracked</div>
            <div class="fs-3 fw-semibold"><?= count($moneyRows) ?></div>
            <div class="small text-muted">Set unit costs under Inventory</div>
        </div>
    </div>
</div>

<div class="glass-panel mb-4">
    <div class="panel-head"><h3>Inventory value by item</h3></div>
    <div class="table-responsive">
        <table class="table align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th>Item</th>
                    <th>Unit</th>
                    <th>On hand</th>
                    <th>Unit cost (ETB)</th>
                    <th>Stock value</th>
                    <th>Supplier</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($moneyRows as $row): ?>
                <tr>
                    <td><?= e($row['name']) ?></td>
                    <td><?= e($row['unit']) ?></td>
                    <td><?= e($row['current_qty']) ?></td>
                    <td><?= money((float) $row['unit_cost']) ?></td>
                    <td class="fw-semibold"><?= money((float) $row['stock_value']) ?></td>
                    <td><?= e($row['supplier_name'] ?? '—') ?></td>
                </tr>
            <?php endforeach; ?>
            <?php if (empty($moneyRows)): ?>
                <tr><td colspan="6" class="text-muted text-center py-4">No active inventory items.</td></tr>
            <?php endif; ?>
            </tbody>
            <?php if (!empty($moneyRows)): ?>
            <tfoot>
                <tr class="table-light">
                    <th colspan="4" class="text-end">Total stock value</th>
                    <th><?= money((float) $totalStockValue) ?></th>
                    <th></th>
                </tr>
            </tfoot>
            <?php endif; ?>
        </table>
    </div>
</div>

<div class="glass-panel">
    <div class="panel-head d-flex justify-content-between align-items-center">
        <h3 class="mb-0">Purchase order money trail</h3>
        <?php if (can_manage()): ?>
        <a href="<?= url('suppliers') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">Manage POs</a>
        <?php endif; ?>
    </div>
    <div class="table-responsive">
        <table class="table align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Supplier</th>
                    <th>Qty</th>
                    <th>Unit cost</th>
                    <th>Total paid</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($purchaseHistory as $po): ?>
                <tr>
                    <td class="small text-muted"><?= e($po['created_at']) ?></td>
                    <td><?= e($po['item_name']) ?></td>
                    <td><?= e($po['supplier_name']) ?></td>
                    <td><?= e($po['ordered_qty']) ?> <?= e($po['unit'] ?? '') ?></td>
                    <td><?= money((float) ($po['unit_cost'] ?? 0)) ?></td>
                    <td class="fw-semibold"><?= money((float) ($po['total_cost'] ?? 0)) ?></td>
                    <td><span class="cas-badge <?= $po['status']==='pending'?'cas-badge-warn':($po['status']==='received'?'cas-badge-ok':'cas-badge-muted') ?>"><?= e($po['status']) ?></span></td>
                </tr>
            <?php endforeach; ?>
            <?php if (empty($purchaseHistory)): ?>
                <tr><td colspan="7" class="text-muted text-center py-4">No purchase orders yet. Create POs with prices under Suppliers.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php else: ?>

<form method="post" action="<?= url('audit/submit') ?>" id="audit-form">
    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
    <div class="glass-panel mb-3">
        <div class="table-responsive">
            <table class="table align-middle mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Item</th>
                        <th>Unit</th>
                        <th>Expected (system)</th>
                        <th>Unit cost</th>
                        <th>Physical count</th>
                        <th>Qty discrepancy</th>
                        <th>Money impact</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($items as $item): ?>
                    <?php $ucost = (float) ($item['unit_cost'] ?? 0); ?>
                    <tr>
                        <td><?= e($item['name']) ?></td>
                        <td><?= e($item['unit']) ?></td>
                        <td class="text-muted expected" data-id="<?= e((string) $item['item_id']) ?>"><?= e($item['expected_qty']) ?></td>
                        <td class="small"><?= money($ucost) ?></td>
                        <td style="width:140px">
                            <input type="number" step="0.01" min="0" name="physical[<?= e((string) $item['item_id']) ?>]"
                                   class="form-control form-control-sm physical-input"
                                   data-expected="<?= e((string) $item['expected_qty']) ?>"
                                   data-unit-cost="<?= e((string) $ucost) ?>">
                        </td>
                        <td class="disc-cell fw-semibold" data-id="<?= e((string) $item['item_id']) ?>">—</td>
                        <td class="money-cell text-muted">—</td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    <div class="mb-3">
        <label class="form-label">Comments (optional)</label>
        <textarea name="comments" class="form-control" rows="2"></textarea>
    </div>
    <button type="submit" class="cas-btn cas-btn-primary" onclick="return confirm('Submit audit and update inventory?')">Execute Reconciliation</button>
</form>

<script>
document.querySelectorAll('.physical-input').forEach(input => {
    input.addEventListener('input', () => {
        const expected = parseFloat(input.dataset.expected) || 0;
        const unitCost = parseFloat(input.dataset.unitCost) || 0;
        const physical = parseFloat(input.value);
        const row = input.closest('tr');
        const cell = row.querySelector('.disc-cell');
        const moneyCell = row.querySelector('.money-cell');
        if (isNaN(physical)) {
            cell.textContent = '—';
            cell.className = 'disc-cell fw-semibold';
            moneyCell.textContent = '—';
            moneyCell.className = 'money-cell text-muted';
            return;
        }
        const disc = physical - expected;
        const pct = expected !== 0 ? Math.abs(disc / expected) * 100 : (disc !== 0 ? 100 : 0);
        const moneyImpact = disc * unitCost;
        cell.textContent = disc.toFixed(2) + (pct > 10 ? ' ⚠' : '');
        cell.className = 'disc-cell fw-semibold ' + (disc < 0 ? 'text-danger' : (disc > 0 ? 'text-warning' : 'text-success'));
        moneyCell.textContent = (moneyImpact >= 0 ? '+' : '') + moneyImpact.toFixed(2) + ' ETB';
        moneyCell.className = 'money-cell fw-semibold ' + (moneyImpact < 0 ? 'text-danger' : (moneyImpact > 0 ? 'text-warning' : 'text-success'));
    });
});
</script>

<?php endif; ?>
