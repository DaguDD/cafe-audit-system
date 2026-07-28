<?php
$counts = $statusCounts ?? ['pending' => 0, 'approved' => 0, 'rejected' => 0];
$filter = $filter ?? 'all';
$canEdit = !empty($canEditStatus);
$totalAll = (int) $counts['pending'] + (int) $counts['approved'] + (int) $counts['rejected'];
?>
<div class="page-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div>
        <h1 class="page-title">Payment Verification</h1>
        <p class="page-subtitle">Full payment history with screenshots. Approve pending proofs; managers can reopen decisions for double-checks.</p>
    </div>
    <?php if ($pendingCount > 0): ?>
    <span class="cas-badge cas-badge-warn"><?= (int) $pendingCount ?> awaiting review</span>
    <?php endif; ?>
</div>

<ul class="nav nav-pills flex-wrap gap-2 mb-4">
    <?php
    $tabs = [
        'all' => 'All (' . $totalAll . ')',
        'pending' => 'Pending (' . (int) $counts['pending'] . ')',
        'approved' => 'Approved (' . (int) $counts['approved'] . ')',
        'rejected' => 'Rejected (' . (int) $counts['rejected'] . ')',
    ];
    foreach ($tabs as $key => $label):
    ?>
    <li class="nav-item">
        <a class="nav-link<?= $filter === $key ? ' active' : '' ?>" href="<?= url('payments?status=' . $key) ?>"><?= e($label) ?></a>
    </li>
    <?php endforeach; ?>
</ul>

<?php if (empty($history)): ?>
<div class="glass-panel">
    <div class="panel-body text-center py-5">
        <div style="font-size:2.5rem;margin-bottom:0.75rem">✓</div>
        <h2 class="h5">No payments in this view</h2>
        <p class="text-muted mb-0">When customers submit Telebirr or bank transfer proof, history appears here with screenshots.</p>
    </div>
</div>
<?php else: ?>
<div class="row g-3">
    <?php foreach ($history as $p): ?>
    <?php
        $badge = match ($p['status']) {
            'approved' => 'cas-badge-ok',
            'rejected' => 'cas-badge-danger',
            default => 'cas-badge-warn',
        };
    ?>
    <div class="col-lg-6">
        <div class="cas-card payment-review-card h-100">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h2 class="h5 mb-1">Table <?= e($p['table_number']) ?></h2>
                    <div class="small text-muted"><?= e($p['created_at']) ?> · <?= e(strtoupper($p['payment_method'])) ?></div>
                </div>
                <div class="text-end">
                    <span class="cas-badge <?= $badge ?>"><?= e($p['status']) ?></span>
                    <div class="fs-5 fw-semibold mt-1 <?= $p['status'] === 'pending' ? 'text-accent' : '' ?>"><?= money((float) $p['amount_claimed']) ?></div>
                </div>
            </div>

            <div class="payment-proof-wrap mb-3">
                <a href="<?= url('payment-proof.php?id=' . (int) $p['submission_id']) ?>" target="_blank" rel="noopener">
                    <img src="<?= url('payment-proof.php?id=' . (int) $p['submission_id']) ?>" alt="Payment screenshot" class="payment-proof-img">
                </a>
            </div>

            <?php require __DIR__ . '/_meta.php'; ?>

            <?php if (!empty($p['reviewer_name']) || !empty($p['review_notes'])): ?>
            <div class="small border-top pt-2 mb-2">
                <?php if (!empty($p['reviewer_name'])): ?>
                <div><span class="text-muted">Reviewed by</span> <?= e($p['reviewer_name']) ?>
                    <?php if (!empty($p['reviewed_at'])): ?> · <?= e($p['reviewed_at']) ?><?php endif; ?>
                </div>
                <?php endif; ?>
                <?php if (!empty($p['review_notes'])): ?>
                <div class="mt-1"><span class="text-muted">Notes:</span> <?= e($p['review_notes']) ?></div>
                <?php endif; ?>
            </div>
            <?php endif; ?>

            <?php if ($p['status'] === 'pending'): ?>
            <div class="d-flex gap-2 flex-wrap">
                <form method="post" action="<?= url('payments/approve') ?>" class="flex-grow-1">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="submission_id" value="<?= (int) $p['submission_id'] ?>">
                    <input type="hidden" name="status_filter" value="<?= e($filter) ?>">
                    <button type="submit" class="cas-btn cas-btn-success w-100">Approve &amp; Close Table</button>
                </form>
                <button type="button" class="cas-btn cas-btn-danger" data-bs-toggle="collapse" data-bs-target="#rej-<?= (int) $p['submission_id'] ?>">Reject</button>
            </div>
            <div class="collapse mt-2" id="rej-<?= (int) $p['submission_id'] ?>">
                <form method="post" action="<?= url('payments/reject') ?>">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="submission_id" value="<?= (int) $p['submission_id'] ?>">
                    <input type="hidden" name="status_filter" value="<?= e($filter) ?>">
                    <textarea name="notes" class="form-control form-control-sm mb-2" rows="2" placeholder="Reason (required) — e.g. amount mismatch, blurry screenshot" required></textarea>
                    <button type="submit" class="cas-btn cas-btn-danger cas-btn-sm">Confirm reject</button>
                </form>
            </div>
            <?php elseif ($canEdit): ?>
            <button type="button" class="cas-btn cas-btn-ghost cas-btn-sm" data-bs-toggle="collapse" data-bs-target="#reopen-<?= (int) $p['submission_id'] ?>">
                Reopen for re-check
            </button>
            <div class="collapse mt-2" id="reopen-<?= (int) $p['submission_id'] ?>">
                <form method="post" action="<?= url('payments/reopen') ?>">
                    <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
                    <input type="hidden" name="submission_id" value="<?= (int) $p['submission_id'] ?>">
                    <textarea name="notes" class="form-control form-control-sm mb-2" rows="2" placeholder="Why reopen? (required)" required></textarea>
                    <button type="submit" class="cas-btn cas-btn-primary cas-btn-sm" onclick="return confirm('Set this payment back to pending?')">Confirm reopen</button>
                </form>
                <p class="small text-muted mt-2 mb-0">Reopen does not undo inventory/sales already recorded for an approved payment — use only after double-checking the screenshot.</p>
            </div>
            <?php endif; ?>
        </div>
    </div>
    <?php endforeach; ?>
</div>

<?php if (($pages ?? 1) > 1): ?>
<nav class="mt-4 d-flex justify-content-center gap-2 flex-wrap">
    <?php for ($i = 1; $i <= $pages; $i++): ?>
    <a class="cas-btn cas-btn-sm <?= $i === (int) $page ? 'cas-btn-primary' : 'cas-btn-ghost' ?>"
       href="<?= url('payments?status=' . urlencode($filter) . '&page=' . $i) ?>"><?= $i ?></a>
    <?php endfor; ?>
</nav>
<?php endif; ?>
<?php endif; ?>
