<div class="page-header mb-4">
    <h1 class="page-title">Active Tables</h1>
    <p class="page-subtitle">Monitor table sessions, bills, and order status.</p>
</div>

<div class="row g-3">
    <?php foreach ($tables as $t): ?>
    <div class="col-md-6 col-lg-4 col-xl-3">
        <a href="<?= url('orders/detail?id=' . (int) $t['table_id']) ?>" class="text-decoration-none">
            <div class="cas-card table-tile h-100">
                <div class="d-flex justify-content-between align-items-start">
                    <h2 class="h4 mb-0"><?= e($t['table_number']) ?></h2>
                    <span class="badge bg-<?= table_status_badge($t['status']) ?>"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                </div>
                <p class="text-muted small mb-2">Capacity: <?= (int) $t['capacity'] ?></p>
                <?php if ((int) $t['active_orders'] > 0): ?>
                <div class="small">
                    <strong><?= (int) $t['active_orders'] ?></strong> active order(s)<br>
                    Open total: <strong><?= money((float) $t['open_total']) ?></strong>
                </div>
                <?php else: ?>
                <div class="text-muted small">No active orders</div>
                <?php endif; ?>
            </div>
        </a>
    </div>
    <?php endforeach; ?>
</div>
