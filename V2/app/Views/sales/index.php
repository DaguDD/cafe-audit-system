<div class="page-hero">
    <div><p class="page-eyebrow">POS</p><h1>Sales</h1></div>
</div>

<?php if (!$shift): ?>
<div class="cas-alert cas-alert-warning">No active shift — sales channel locked until management opens a shift.</div>
<?php else: ?>
<div class="glass-panel mb-4">
    <div class="panel-head"><h3>New Transaction</h3></div>
    <div class="panel-body">
        <form method="post" action="<?= url('sales/store') ?>" class="row g-3 align-items-end">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <div class="col-md-5">
                <label class="form-label">Product</label>
                <select name="product_id" class="form-select" required>
                    <option value="">Select product…</option>
                    <?php foreach ($products as $p): ?>
                        <option value="<?= e((string) $p['product_id']) ?>"><?= e($p['name']) ?> — <?= money((float) $p['price']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label">Quantity</label>
                <input type="number" name="qty_sold" class="form-control" min="1" value="1" required>
            </div>
            <div class="col-md-2">
                <button class="cas-btn cas-btn-primary">Process Sale</button>
            </div>
        </form>
        <p class="small text-muted mt-2 mb-0">Ingredients deducted via recipe engine.</p>
    </div>
</div>
<?php endif; ?>

<div class="glass-panel">
    <div class="panel-head"><h3>Transaction History</h3></div>
    <div class="table-responsive">
        <table class="table mb-0">
            <thead><tr><th>Time</th><th>Product</th><th>Qty</th><th>Total</th><th>Staff</th></tr></thead>
            <tbody>
            <?php foreach ($recent as $s): ?>
                <tr>
                    <td class="small"><?= e($s['sold_at']) ?></td>
                    <td><?= e($s['product_name']) ?></td>
                    <td><?= e((string) $s['qty_sold']) ?></td>
                    <td><?= money((float) $s['total']) ?></td>
                    <td><?= e($s['staff_name']) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
