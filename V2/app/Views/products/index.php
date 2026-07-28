<div class="page-hero">
    <div>
        <p class="page-eyebrow">Menu</p>
        <h1>Products</h1>
    </div>
    <p class="lead"><?= can_manage() ? 'Items sold at the register — each links to inventory via recipes' : 'View menu products and recipe ingredients (read-only)' ?></p>
</div>

<?php if (can_manage()): ?>
<div class="glass-panel mb-3">
    <div class="panel-head"><h3>Add product</h3></div>
    <div class="panel-body">
        <form method="post" action="<?= url('products/store') ?>" class="row g-2 align-items-end">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <div class="col-md-4"><input name="name" class="form-control" placeholder="Product name" required></div>
            <div class="col-md-2"><input name="price" type="number" step="0.01" min="0" class="form-control" placeholder="Price (ETB)" required></div>
            <div class="col-md-3">
                <select name="cat_id" class="form-select">
                    <option value="">Category</option>
                    <?php foreach ($categories as $c): ?>
                        <option value="<?= e((string) $c['cat_id']) ?>"><?= e($c['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2"><button class="cas-btn cas-btn-primary w-100">Add</button></div>
        </form>
    </div>
</div>
<?php endif; ?>

<?php foreach ($products as $p): ?>
<?php $pid = (int) $p['product_id']; $recipes = $recipesByProduct[$pid] ?? []; ?>
<div class="glass-panel mb-3">
    <div class="panel-head">
        <h3><?= e($p['name']) ?> <span class="text-muted font-mono" style="font-size:0.8rem"><?= money((float) $p['price']) ?></span></h3>
        <span class="cas-badge <?= $p['status'] === 'active' ? 'cas-badge-ok' : 'cas-badge-muted' ?>"><?= e($p['status']) ?></span>
    </div>
    <div class="panel-body">
        <?php if (can_manage()): ?>
        <form method="post" action="<?= url('products/update') ?>" class="row g-2 align-items-end mb-3">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="product_id" value="<?= e((string) $pid) ?>">
            <div class="col-md-3"><input name="name" class="form-control form-control-sm" value="<?= e($p['name']) ?>"></div>
            <div class="col-md-2"><input name="price" type="number" step="0.01" class="form-control form-control-sm" value="<?= e($p['price']) ?>"></div>
            <div class="col-md-2">
                <select name="cat_id" class="form-select form-select-sm">
                    <option value="">—</option>
                    <?php foreach ($categories as $c): ?>
                        <option value="<?= e((string) $c['cat_id']) ?>" <?= (int)$p['cat_id'] === (int)$c['cat_id'] ? 'selected' : '' ?>><?= e($c['name']) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <select name="status" class="form-select form-select-sm">
                    <option value="active" <?= $p['status']==='active'?'selected':'' ?>>active</option>
                    <option value="inactive" <?= $p['status']==='inactive'?'selected':'' ?>>inactive</option>
                </select>
            </div>
            <div class="col-md-2"><button class="cas-btn cas-btn-success cas-btn-sm w-100">Save</button></div>
        </form>
        <?php else: ?>
        <p class="mb-3"><strong><?= e($p['name']) ?></strong> · <?= money((float) $p['price']) ?> · <span class="text-muted"><?= e($p['status']) ?></span></p>
        <?php endif; ?>

        <p class="small text-muted mb-2">Recipe (ingredients used per 1 sale):</p>
        <?php if ($recipes): ?>
        <table class="table table-sm mb-2">
            <thead><tr><th>Ingredient</th><th>Qty per sale</th><?php if (can_manage()): ?><th></th><?php endif; ?></tr></thead>
            <tbody>
            <?php foreach ($recipes as $r): ?>
                <tr>
                    <td><?= e($r['item_name']) ?></td>
                    <td class="font-mono"><?= e($r['qty_needed']) ?> <?= e($r['unit']) ?></td>
                    <?php if (can_manage()): ?>
                    <td>
                        <form method="post" action="<?= url('products/recipe/remove') ?>" class="d-inline">
                            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="recipe_id" value="<?= e((string) $r['recipe_id']) ?>">
                            <button class="cas-btn cas-btn-danger cas-btn-sm">Remove</button>
                        </form>
                    </td>
                    <?php endif; ?>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
        <?php else: ?>
        <p class="small text-muted mb-2">No recipe yet — sales won't deduct stock.</p>
        <?php endif; ?>

        <?php if (can_manage()): ?>
        <form method="post" action="<?= url('products/recipe/store') ?>" class="row g-2 align-items-end">
            <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="product_id" value="<?= e((string) $pid) ?>">
            <div class="col-md-5">
                <select name="item_id" class="form-select form-select-sm" required>
                    <option value="">Select ingredient…</option>
                    <?php foreach ($inventory as $item): ?>
                        <option value="<?= e((string) $item['item_id']) ?>"><?= e($item['name']) ?> (<?= e($item['unit']) ?>)</option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-3"><input name="qty_needed" type="number" step="0.001" min="0.001" class="form-control form-control-sm" placeholder="Qty per sale" required></div>
            <div class="col-md-2"><button class="cas-btn cas-btn-ghost cas-btn-sm w-100">Add ingredient</button></div>
        </form>
        <?php endif; ?>
    </div>
</div>
<?php endforeach; ?>
