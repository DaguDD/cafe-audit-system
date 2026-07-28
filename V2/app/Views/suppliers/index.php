<div class="page-hero">
    <div><p class="page-eyebrow">Procurement</p><h1>Suppliers & POs</h1></div>
</div>

<div class="row g-4 mb-4">
    <div class="col-lg-6">
        <div class="glass-panel">
            <div class="panel-head"><h3>Vendor Registry</h3></div>
            <div class="panel-body">
                <form method="post" action="<?= url('suppliers/store') ?>" class="row g-2">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <div class="col-12"><input name="name" class="form-control" placeholder="Supplier name" required></div>
                    <div class="col-md-6"><input name="contact_info" class="form-control" placeholder="Phone"></div>
                    <div class="col-md-6"><input name="email" type="email" class="form-control" placeholder="Email"></div>
                    <div class="col-12"><button class="cas-btn cas-btn-primary cas-btn-sm">Add Vendor</button></div>
                </form>
            </div>
        </div>
    </div>
    <div class="col-lg-6">
        <div class="glass-panel">
            <div class="panel-head"><h3>Create Purchase Order</h3></div>
            <div class="panel-body">
                <form method="post" action="<?= url('suppliers/po') ?>" class="row g-2">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <div class="col-md-6">
                        <select name="item_id" class="form-select" required>
                            <option value="">Inventory item…</option>
                            <?php foreach ($items as $item): ?>
                                <option value="<?= e((string) $item['item_id']) ?>"><?= e($item['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <select name="sup_id" class="form-select" required>
                            <option value="">Supplier…</option>
                            <?php foreach ($suppliers as $s): ?>
                                <option value="<?= e((string) $s['sup_id']) ?>"><?= e($s['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-4"><input name="ordered_qty" type="number" step="0.01" min="0.01" class="form-control" placeholder="Qty" required></div>
                    <div class="col-md-4"><input name="unit_cost" type="number" step="0.01" min="0" class="form-control" placeholder="Unit cost (ETB)" value="0"></div>
                    <div class="col-md-4"><input name="expected_delivery" type="date" class="form-control"></div>
                    <div class="col-12"><button class="cas-btn cas-btn-primary">Submit PO</button></div>
                </form>
            </div>
        </div>
    </div>
</div>

<div class="glass-panel">
    <div class="panel-head"><h3>Order Pipeline</h3></div>
    <div class="table-responsive">
        <table class="table mb-0 align-middle">
            <thead><tr><th>Item</th><th>Supplier</th><th>Qty</th><th>Unit cost</th><th>Total</th><th>Status</th><th>Expected</th><th></th></tr></thead>
            <tbody>
            <?php foreach ($orders as $po): ?>
                <tr>
                    <td><?= e($po['item_name']) ?></td>
                    <td><?= e($po['supplier_name']) ?></td>
                    <td><?= e($po['ordered_qty']) ?></td>
                    <td><?= money((float) ($po['unit_cost'] ?? 0)) ?></td>
                    <td class="fw-semibold"><?= money((float) ($po['total_cost'] ?? 0)) ?></td>
                    <td><span class="cas-badge <?= $po['status']==='pending'?'cas-badge-warn':($po['status']==='received'?'cas-badge-ok':'cas-badge-muted') ?>"><?= e($po['status']) ?></span></td>
                    <td><?= e($po['expected_delivery'] ?? '—') ?></td>
                    <td>
                        <?php if ($po['status'] === 'pending'): ?>
                        <form method="post" action="<?= url('suppliers/receive') ?>" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="po_id" value="<?= e((string) $po['po_id']) ?>">
                            <button class="cas-btn cas-btn-success cas-btn-sm">Receive</button>
                        </form>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
