<div class="page-hero">
    <div>
        <p class="page-eyebrow">Stock</p>
        <h1>Inventory</h1>
    </div>
</div>

<?php if (can_manage()): ?>
<div class="glass-panel mb-4">
    <div class="panel-head"><h3>Register New Item</h3></div>
    <div class="panel-body">
        <form method="post" action="<?= url('inventory/store') ?>" class="row g-3">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <div class="col-md-2"><input name="name" class="form-control" placeholder="Item name" required></div>
            <div class="col-md-1"><input name="unit" class="form-control" placeholder="Unit" value="kg" required></div>
            <div class="col-md-2"><input name="current_qty" type="number" step="0.01" min="0" class="form-control" placeholder="Qty" required></div>
            <div class="col-md-2"><input name="min_threshold" type="number" step="0.01" min="0.01" class="form-control" placeholder="Min" required></div>
            <div class="col-md-2"><input name="unit_cost" type="number" step="0.01" min="0" class="form-control" placeholder="Unit cost ETB" value="0"></div>
            <div class="col-md-2">
                <select name="sup_id" class="form-select">
                    <option value="">Supplier</option>
                    <?php foreach ($suppliers as $s): ?>
                        <option value="<?= e((string) $s['sup_id']) ?>"><?= e($s['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-1"><button class="cas-btn cas-btn-primary w-100">Add</button></div>
        </form>
    </div>
</div>
<?php endif; ?>

<div class="glass-panel">
    <div class="table-responsive">
        <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
                <tr>
                    <th>Name</th><th>Unit</th><th>Current Qty</th><th>Min</th><th>Unit cost</th><th>Stock value</th><th>Supplier</th><th>Status</th>
                    <?php if (can_manage()): ?><th></th><?php endif; ?>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($items as $item): ?>
                <?php $low = (float) $item['current_qty'] <= (float) $item['min_threshold']; ?>
                <tr class="<?= $low ? 'row-low-stock' : '' ?>">
                    <td><?= e($item['name']) ?></td>
                    <td><?= e($item['unit']) ?></td>
                    <td><?= e($item['current_qty']) ?></td>
                    <td><?= e($item['min_threshold']) ?></td>
                    <td><?= money((float) ($item['unit_cost'] ?? 0)) ?></td>
                    <td class="fw-semibold"><?= money((float) ($item['current_qty'] ?? 0) * (float) ($item['unit_cost'] ?? 0)) ?></td>
                    <td><?= e($item['supplier_name'] ?? '—') ?></td>
                    <td><span class="cas-badge <?= $item['status'] === 'active' ? 'cas-badge-ok' : 'cas-badge-muted' ?>"><?= e($item['status']) ?></span></td>
                    <?php if (can_manage()): ?>
                    <td>
                        <button class="cas-btn cas-btn-ghost cas-btn-sm" data-bs-toggle="collapse" data-bs-target="#edit-<?= e((string) $item['item_id']) ?>">Edit</button>
                    </td>
                    <?php endif; ?>
                </tr>
                <?php if (can_manage()): ?>
                <tr class="collapse" id="edit-<?= e((string) $item['item_id']) ?>">
                    <td colspan="9">
                        <form method="post" action="<?= url('inventory/update') ?>" class="row g-2">
                            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="item_id" value="<?= e((string) $item['item_id']) ?>">
                            <div class="col-md-2"><input name="name" class="form-control form-control-sm" value="<?= e($item['name']) ?>"></div>
                            <div class="col-md-1"><input name="unit" class="form-control form-control-sm" value="<?= e($item['unit']) ?>"></div>
                            <div class="col-md-1"><input name="current_qty" type="number" step="0.01" class="form-control form-control-sm" value="<?= e($item['current_qty']) ?>"></div>
                            <div class="col-md-1"><input name="min_threshold" type="number" step="0.01" class="form-control form-control-sm" value="<?= e($item['min_threshold']) ?>"></div>
                            <div class="col-md-2"><input name="unit_cost" type="number" step="0.01" min="0" class="form-control form-control-sm" value="<?= e((string) ($item['unit_cost'] ?? 0)) ?>" placeholder="Unit cost"></div>
                            <div class="col-md-2">
                                <select name="sup_id" class="form-select form-select-sm">
                                    <option value="">—</option>
                                    <?php foreach ($suppliers as $s): ?>
                                        <option value="<?= e((string) $s['sup_id']) ?>" <?= (int)$item['sup_id'] === (int)$s['sup_id'] ? 'selected' : '' ?>><?= e($s['name']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-1">
                                <select name="status" class="form-select form-select-sm">
                                    <option value="active" <?= $item['status']==='active'?'selected':'' ?>>active</option>
                                    <option value="inactive" <?= $item['status']==='inactive'?'selected':'' ?>>inactive</option>
                                </select>
                            </div>
                            <div class="col-md-1"><button class="cas-btn cas-btn-success cas-btn-sm">Save</button></div>
                        </form>
                    </td>
                </tr>
                <?php endif; ?>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
