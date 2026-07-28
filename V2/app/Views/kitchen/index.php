<div class="page-header d-flex justify-content-between align-items-center mb-4">
    <div>
        <h1 class="page-title">Kitchen Display</h1>
        <p class="page-subtitle">Pending orders grouped by table — auto-refreshes every 15 seconds.</p>
    </div>
    <button type="button" class="cas-btn cas-btn-ghost" onclick="location.reload()">Refresh</button>
</div>

<?php if (empty($queue)): ?>
<div class="cas-card text-center py-5">
    <h2 class="h5 text-muted">No orders in queue</h2>
    <p class="text-muted mb-0">New orders appear here when customers or waiters submit them.</p>
</div>
<?php else: ?>
<div class="row g-3">
    <?php foreach ($queue as $order): ?>
    <div class="col-md-6 col-xl-4">
        <div class="cas-card kitchen-ticket h-100 border-start border-4 border-<?= order_status_badge($order['status']) ?>">
            <div class="d-flex justify-content-between mb-2">
                <div>
                    <div class="h4 mb-0"><?= e($order['table_number']) ?></div>
                    <small class="text-muted">Order #<?= (int) $order['order_id'] ?> · <?= e($order['order_source']) ?></small>
                </div>
                <span class="badge bg-<?= order_status_badge($order['status']) ?>"><?= e($order['status']) ?></span>
            </div>
            <ul class="list-unstyled mb-3">
                <?php foreach ($order['items'] as $item): ?>
                <li class="py-1 border-bottom">
                    <strong><?= (int) $item['qty'] ?>×</strong> <?= e($item['product_name']) ?>
                </li>
                <?php endforeach; ?>
            </ul>
            <?php if ($order['notes']): ?>
            <p class="small text-warning">Note: <?= e($order['notes']) ?></p>
            <?php endif; ?>
            <div class="d-flex gap-2">
                <?php if ($order['status'] === 'committed'): ?>
                <form method="post" action="<?= url('kitchen/update') ?>" class="flex-fill">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="order_id" value="<?= (int) $order['order_id'] ?>">
                    <input type="hidden" name="action" value="preparing">
                    <button type="submit" class="btn btn-warning w-100">Start Preparing</button>
                </form>
                <?php endif; ?>
                <?php if (in_array($order['status'], ['committed', 'preparing'], true)): ?>
                <form method="post" action="<?= url('kitchen/update') ?>" class="flex-fill">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="order_id" value="<?= (int) $order['order_id'] ?>">
                    <input type="hidden" name="action" value="served">
                    <button type="submit" class="btn btn-success w-100">Mark Served</button>
                </form>
                <?php endif; ?>
            </div>
            <div class="small text-muted mt-2"><?= e($order['created_at']) ?></div>
        </div>
    </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<script>setTimeout(function(){ location.reload(); }, 15000);</script>
