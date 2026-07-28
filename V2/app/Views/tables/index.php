<?php require BASE_PATH . '/lib/QrGenerator.php'; ?>
<div class="page-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div>
        <h1 class="page-title">Tables & QR Codes</h1>
        <p class="page-subtitle">Each table has a unique QR code linking customers to the Cafe Audit System menu.</p>
    </div>
    <a href="<?= url('tables/print') ?>" class="cas-btn cas-btn-primary" target="_blank">Print All QR Codes</a>
</div>

<div class="row g-4">
    <div class="col-lg-4">
        <div class="cas-card">
            <h2 class="h6 mb-3">Add Table</h2>
            <form method="post" action="<?= url('tables/store') ?>">
                <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                <div class="mb-3">
                    <label class="form-label">Table Number</label>
                    <input type="text" name="table_number" class="form-control" placeholder="T09" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">Capacity</label>
                    <input type="number" name="capacity" class="form-control" value="4" min="1" max="20">
                </div>
                <button type="submit" class="cas-btn cas-btn-primary w-100">Create Table</button>
            </form>
        </div>
    </div>
    <div class="col-lg-8">
        <div class="cas-card">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>Table</th>
                            <th>Status</th>
                            <th>QR</th>
                            <th>Menu URL</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($tables as $t): ?>
                        <?php $menuUrl = RestaurantTable::customerMenuUrl($t); ?>
                        <tr>
                            <td><strong><?= e($t['table_number']) ?></strong><br><small class="text-muted">Seats <?= (int) $t['capacity'] ?></small></td>
                            <td><span class="badge bg-<?= table_status_badge($t['status']) ?>"><?= e($t['status']) ?></span></td>
                            <td>
                                <img src="<?= e(QrGenerator::dataUri($menuUrl, 120)) ?>" alt="QR" width="72" height="72" class="rounded border bg-white">
                            </td>
                            <td><code class="small"><?= e($menuUrl) ?></code></td>
                            <td>
                                <form method="post" action="<?= url('tables/regenerate') ?>" class="d-inline">
                                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                                    <input type="hidden" name="table_id" value="<?= (int) $t['table_id'] ?>">
                                    <button type="submit" class="btn btn-sm btn-outline-warning" onclick="return confirm('Regenerate QR token? Old codes will stop working.')">Regenerate</button>
                                </form>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
