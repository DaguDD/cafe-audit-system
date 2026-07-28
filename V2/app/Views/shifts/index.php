<?php
$config = require CONFIG_PATH . '/app.php';
$open = $cafeHours['open'] ?? '08:00';
$close = $cafeHours['close'] ?? '22:00';
?>
<div class="page-hero">
    <div>
        <p class="page-eyebrow">Workforce</p>
        <h1>Staff Shifts</h1>
    </div>
    <p class="lead">Waiters & kitchen staff are <strong>auto clocked-in on login</strong> and clocked-out on logout. Cafe hours: <?= e($open) ?> – <?= e($close) ?>.</p>
</div>

<div class="cas-alert cas-alert-info mb-4">
    Manual shift open is optional for managers. Operational staff (waiters, cashiers, kitchen) no longer need a manager to open a shift before taking payments — login starts the shift automatically.
</div>

<div class="row g-4">
    <div class="col-lg-7">
        <div class="glass-panel">
            <div class="panel-head d-flex justify-content-between align-items-center">
                <h3>Live on floor</h3>
                <span class="cas-badge cas-badge-info"><?= count($openShifts) ?> active</span>
            </div>
            <div class="table-responsive">
                <table class="table mb-0 shift-table">
                    <thead><tr><th>Staff</th><th>Role</th><th>Clock in</th><th>Duration</th><th>Type</th><th></th></tr></thead>
                    <tbody>
                    <?php if (empty($openShifts)): ?>
                        <tr><td colspan="6" class="text-muted">Nobody clocked in right now.</td></tr>
                    <?php endif; ?>
                    <?php foreach ($openShifts as $sh): ?>
                        <tr>
                            <td><strong><?= e($sh['staff_name']) ?></strong></td>
                            <td><span class="role-pill <?= role_badge_class($sh['staff_role'] ?? 'staff') ?>"><?= e(role_label($sh['staff_role'] ?? 'staff')) ?></span></td>
                            <td class="font-mono small"><?= e($sh['opened_at']) ?></td>
                            <td><strong class="text-accent"><?= e($sh['duration_label']) ?></strong></td>
                            <td><?= !empty($sh['auto_managed']) ? 'Auto' : 'Manual' ?></td>
                            <td>
                                <form method="post" action="<?= url('shifts/close') ?>" class="d-inline">
                                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                                    <input type="hidden" name="shift_id" value="<?= (int) $sh['shift_id'] ?>">
                                    <button class="cas-btn cas-btn-danger cas-btn-sm">Clock out</button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="glass-panel mt-3">
            <div class="panel-head"><h3>Today's completed shifts</h3></div>
            <div class="table-responsive">
                <table class="table mb-0 shift-table">
                    <thead><tr><th>Staff</th><th>Clock in</th><th>Clock out</th><th>Hours worked</th></tr></thead>
                    <tbody>
                    <?php if (empty($todayClosed)): ?>
                        <tr><td colspan="4" class="text-muted">No completed shifts yet today.</td></tr>
                    <?php endif; ?>
                    <?php foreach ($todayClosed as $sh): ?>
                        <tr>
                            <td><?= e($sh['staff_name']) ?> <span class="text-muted small">(<?= e($sh['staff_role']) ?>)</span></td>
                            <td class="font-mono small"><?= e($sh['opened_at']) ?></td>
                            <td class="font-mono small"><?= e($sh['closed_at']) ?></td>
                            <td><strong><?= e($sh['duration_label']) ?></strong> <span class="text-muted">(<?= e((string) $sh['hours']) ?> h)</span></td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <div class="col-lg-5">
        <div class="glass-panel">
            <div class="panel-head"><h3>Manual shift (override)</h3></div>
            <div class="panel-body">
                <p class="text-muted small">Use only if you need to open a shift for someone who is not logged in.</p>
                <form method="post" action="<?= url('shifts/open') ?>">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <div class="mb-3">
                        <label class="form-label">Staff member</label>
                        <select name="user_id" class="form-select" required>
                            <option value="">Select…</option>
                            <?php foreach ($staff as $s): ?>
                                <option value="<?= (int) $s['user_id'] ?>"><?= e($s['full_name']) ?> (<?= e($s['role']) ?>)</option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <button class="cas-btn cas-btn-primary w-100">Open shift manually</button>
                </form>
            </div>
        </div>
    </div>
</div>
