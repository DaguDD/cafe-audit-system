<?php
/** Shared meta block for payment cards. Expects $p. */
?>
<dl class="payment-meta small mb-3">
    <div class="row g-2">
        <dt class="col-5 text-muted">Reference</dt>
        <dd class="col-7 font-mono"><?= e($p['reference_number']) ?></dd>
        <?php if (!empty($p['sender_phone'])): ?>
        <dt class="col-5 text-muted">Sender phone</dt>
        <dd class="col-7"><?= e($p['sender_phone']) ?></dd>
        <?php endif; ?>
        <dt class="col-5 text-muted">Expected</dt>
        <dd class="col-7"><?= money((float) $p['amount_expected']) ?></dd>
        <?php if ((float) ($p['tip_amount'] ?? 0) > 0): ?>
        <dt class="col-5 text-muted">Tip</dt>
        <dd class="col-7"><?= money((float) $p['tip_amount']) ?></dd>
        <?php endif; ?>
        <dt class="col-5 text-muted">IP</dt>
        <dd class="col-7 font-mono"><?= e($p['ip_address'] ?? '—') ?></dd>
    </div>
</dl>
