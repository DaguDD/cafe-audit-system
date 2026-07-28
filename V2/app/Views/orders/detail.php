<div class="page-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div>
        <h1 class="page-title">Table <?= e($table['table_number']) ?></h1>
        <p class="page-subtitle">
            Status: <span class="badge bg-<?= table_status_badge($table['status']) ?>"><?= e(str_replace('_', ' ', $table['status'])) ?></span>
        </p>
    </div>
    <div class="d-flex gap-2 flex-wrap">
        <a href="<?= url('server?table=' . (int) $table['table_id']) ?>" class="cas-btn cas-btn-primary">Add Order</a>
        <a href="<?= url('payments') ?>" class="cas-btn cas-btn-ghost">Payments</a>
        <a href="<?= url('orders') ?>" class="cas-btn cas-btn-ghost">Back</a>
    </div>
</div>

<?php if (!empty($pendingPayment)): ?>
<div class="cas-alert cas-alert-warning mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
    <span><strong>Payment pending review</strong> — <?= money((float) $pendingPayment['amount_claimed']) ?> via <?= e($pendingPayment['payment_method']) ?> · ref <?= e($pendingPayment['reference_number']) ?></span>
    <a href="<?= url('payment-proof.php?id=' . (int) $pendingPayment['submission_id']) ?>" target="_blank" class="cas-btn cas-btn-sm cas-btn-ghost">View screenshot</a>
</div>
<?php endif; ?>

<div class="row g-4">
    <div class="col-lg-8">
        <div class="cas-card mb-4">
            <h2 class="h6 mb-3">Active Orders</h2>
            <?php if (empty($session)): ?>
            <p class="text-muted mb-0">No active orders for this table.</p>
            <?php else: ?>
            <?php foreach ($session as $order): ?>
            <div class="border rounded p-3 mb-3 order-row-card">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong>Order #<?= (int) $order['order_id'] ?></strong>
                        <span class="badge bg-<?= order_status_badge($order['status']) ?> ms-2"><?= e(order_status_label($order['status'])) ?></span>
                        <div class="small text-muted">via <?= e($order['order_source']) ?> · <?= e($order['created_at']) ?></div>
                    </div>
                    <strong class="text-accent"><?= money((float) $order['subtotal']) ?></strong>
                </div>
                <ul class="mb-3 small">
                    <?php foreach ($order['items'] as $item): ?>
                    <li><?= (int) $item['qty'] ?>× <?= e($item['product_name']) ?> — <?= money((float) $item['line_total']) ?></li>
                    <?php endforeach; ?>
                </ul>
                <div class="d-flex gap-2 flex-wrap">
                    <?php if ($order['status'] !== 'paid' && $order['status'] !== 'cancelled'): ?>
                    <?php if (empty($pendingPayment)): ?>
                    <form method="post" action="<?= url('orders/pay') ?>">
                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                        <input type="hidden" name="order_id" value="<?= (int) $order['order_id'] ?>">
                        <button type="submit" class="cas-btn cas-btn-success cas-btn-sm">Mark Paid (Cash)</button>
                    </form>
                    <?php else: ?>
                    <span class="small text-muted">Awaiting mobile payment approval</span>
                    <?php endif; ?>
                    <form method="post" action="<?= url('orders/cancel') ?>" onsubmit="return confirm('Cancel this order?')">
                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                        <input type="hidden" name="order_id" value="<?= (int) $order['order_id'] ?>">
                        <button type="submit" class="cas-btn cas-btn-danger cas-btn-sm">Cancel</button>
                    </form>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
            <?php endif; ?>
        </div>

        <?php if (!empty($pendingPayment)): ?>
        <div class="cas-card payment-review-card">
            <h2 class="h6 mb-3">Customer payment proof</h2>
            <div class="row g-3">
                <div class="col-md-5">
                    <a href="<?= url('payment-proof.php?id=' . (int) $pendingPayment['submission_id']) ?>" target="_blank">
                        <img src="<?= url('payment-proof.php?id=' . (int) $pendingPayment['submission_id']) ?>" alt="Proof" class="payment-proof-img">
                    </a>
                </div>
                <div class="col-md-7">
                    <p class="mb-1"><strong>Amount:</strong> <?= money((float) $pendingPayment['amount_claimed']) ?></p>
                    <p class="mb-1"><strong>Method:</strong> <?= e(ucfirst($pendingPayment['payment_method'])) ?></p>
                    <p class="mb-1"><strong>Reference:</strong> <span class="font-mono"><?= e($pendingPayment['reference_number']) ?></span></p>
                    <?php if (!empty($pendingPayment['sender_phone'])): ?>
                    <p class="mb-3"><strong>Phone:</strong> <?= e($pendingPayment['sender_phone']) ?></p>
                    <?php endif; ?>
                    <form method="post" action="<?= url('payments/approve') ?>" class="mb-2">
                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                        <input type="hidden" name="submission_id" value="<?= (int) $pendingPayment['submission_id'] ?>">
                        <input type="hidden" name="redirect" value="orders">
                        <input type="hidden" name="table_id" value="<?= (int) $table['table_id'] ?>">
                        <button type="submit" class="cas-btn cas-btn-success w-100">Approve & Close Table</button>
                    </form>
                    <form method="post" action="<?= url('payments/reject') ?>">
                        <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                        <input type="hidden" name="submission_id" value="<?= (int) $pendingPayment['submission_id'] ?>">
                        <input type="hidden" name="redirect" value="orders">
                        <input type="hidden" name="table_id" value="<?= (int) $table['table_id'] ?>">
                        <textarea name="notes" class="form-control form-control-sm mb-2" rows="2" placeholder="Rejection reason (required)" required></textarea>
                        <button type="submit" class="cas-btn cas-btn-danger cas-btn-sm">Reject payment</button>
                    </form>
                </div>
            </div>
        </div>
        <?php endif; ?>
    </div>
    <div class="col-lg-4">
        <div class="cas-card mb-3">
            <h2 class="h6 mb-3">Bill Summary</h2>
            <div class="display-6 mb-3 text-accent"><?= money((float) $bill['total']) ?></div>
            <?php if ($bill['total'] > 0 && empty($pendingPayment)): ?>
            <form method="post" action="<?= url('orders/pay-all') ?>" class="mb-2">
                <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                <input type="hidden" name="table_id" value="<?= (int) $table['table_id'] ?>">
                <button type="submit" class="cas-btn cas-btn-primary w-100">Pay All (Cash)</button>
            </form>
            <p class="text-muted small mb-0">For mobile payments, customer submits proof from their menu — approve above.</p>
            <?php elseif (!empty($pendingPayment)): ?>
            <p class="text-muted small mb-0">Customer payment submitted — verify screenshot before approving.</p>
            <?php else: ?>
            <p class="text-muted small mb-0">Nothing to pay.</p>
            <?php endif; ?>
        </div>
        <?php if (!empty($latestPayment) && $latestPayment['status'] === 'rejected'): ?>
        <div class="cas-alert cas-alert-danger small">
            Last payment rejected: <?= e($latestPayment['review_notes'] ?? 'No reason given') ?>
        </div>
        <?php endif; ?>
    </div>
</div>
