<div class="page-hero">
    <div><p class="page-eyebrow">Loss</p><h1>Waste Log</h1></div>
</div>

<div class="glass-panel mb-4">
    <div class="panel-head"><h3>Log Event</h3></div>
    <div class="panel-body">
        <form method="post" action="<?= url('waste/store') ?>" class="row g-3 align-items-end">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <div class="col-md-4">
                <label class="form-label">Item</label>
                <select name="item_id" class="form-select" required>
                    <option value="">Select item…</option>
                    <?php foreach ($items as $item): ?>
                        <option value="<?= e((string) $item['item_id']) ?>"><?= e($item['name']) ?> (<?= e($item['current_qty']) ?> <?= e($item['unit']) ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label">Quantity</label>
                <input type="number" name="waste_qty" step="0.01" min="0.01" class="form-control" required>
            </div>
            <div class="col-md-3">
                <label class="form-label">Reason</label>
                <select name="reason" class="form-select" required>
                    <option value="expired">Expired</option>
                    <option value="damaged">Damaged</option>
                    <option value="spilled">Spilled</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="col-md-2"><button class="cas-btn cas-btn-primary w-100">Log</button></div>
        </form>
    </div>
</div>

<div class="glass-panel">
    <div class="panel-head"><h3>Event Log</h3></div>
    <div class="table-responsive">
        <table class="table mb-0">
            <thead><tr><th>Time</th><th>Item</th><th>Qty</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>
            <?php foreach ($recent as $w): ?>
                <tr>
                    <td class="small"><?= e($w['logged_at']) ?></td>
                    <td><?= e($w['item_name']) ?></td>
                    <td><?= e($w['waste_qty']) ?></td>
                    <td><?= e($w['reason']) ?></td>
                    <td><?= e($w['staff_name']) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
