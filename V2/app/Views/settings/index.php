<?php $isManager = in_array($user['role'], ['admin', 'manager'], true); ?>

<div class="page-hero">
    <div>
        <p class="page-eyebrow">Account</p>
        <h1>Settings</h1>
    </div>
</div>

<ul class="nav cas-tabs" role="tablist">
    <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-profile">My account</button></li>
    <?php if ($isManager): ?>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-users">Users & roles</button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-system">System</button></li>
    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-payment">Payment details</button></li>
    <?php endif; ?>
</ul>

<div class="tab-content">
    <div class="tab-pane fade show active" id="tab-profile">
        <div class="glass-panel">
            <div class="panel-head"><h3>Change password</h3></div>
            <div class="panel-body">
                <form method="post" action="<?= url('settings/password') ?>" class="row g-2" style="max-width:420px">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <div class="col-12">
                        <label class="form-label">Current password</label>
                        <input type="password" name="current_password" class="form-control" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">New password</label>
                        <input type="password" name="new_password" class="form-control" minlength="6" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Confirm new password</label>
                        <input type="password" name="confirm_password" class="form-control" minlength="6" required>
                    </div>
                    <div class="col-12">
                        <button class="cas-btn cas-btn-primary">Update password</button>
                    </div>
                </form>
            </div>
        </div>

        <div class="glass-panel">
            <div class="panel-head"><h3>Your profile</h3></div>
            <div class="panel-body">
                <table class="table table-sm" style="max-width:420px">
                    <tr><td class="text-muted">Name</td><td><?= e($user['full_name']) ?></td></tr>
                    <tr><td class="text-muted">Username</td><td class="font-mono"><?= e($user['username']) ?></td></tr>
                    <tr><td class="text-muted">Role</td><td><span class="role-pill <?= role_badge_class($user['role']) ?>"><?= e(role_label($user['role'])) ?></span></td></tr>
                </table>
            </div>
        </div>
    </div>

    <?php if ($isManager): ?>
    <div class="tab-pane fade" id="tab-users">
        <div class="glass-panel mb-3">
            <div class="panel-head"><h3>Add user</h3></div>
            <div class="panel-body">
                <p class="text-muted small mb-2">Create auditor, cashier, or manager accounts. To replace an auditor, add the new account and deactivate the old one.</p>
                <form method="post" action="<?= url('settings/users/store') ?>" class="row g-2 align-items-end">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <div class="col-md-2"><input name="username" class="form-control" placeholder="Username" required></div>
                    <div class="col-md-3"><input name="full_name" class="form-control" placeholder="Full name" required></div>
                    <div class="col-md-2">
                        <select name="role" class="form-select" required>
                            <option value="server">Waiter</option>
                            <option value="kitchen">Kitchen</option>
                            <option value="staff">Cashier</option>
                            <option value="auditor">Auditor</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="col-md-2"><input name="password" type="password" class="form-control" placeholder="Password" minlength="6" required></div>
                    <div class="col-md-2"><button class="cas-btn cas-btn-primary w-100">Add user</button></div>
                </form>
            </div>
        </div>

        <div class="glass-panel">
            <div class="panel-head"><h3>All users</h3></div>
            <div class="table-responsive">
                <table class="table table-sm mb-0">
                    <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
                    <tbody>
                    <?php foreach ($users as $u): ?>
                        <tr>
                            <td><?= e($u['full_name']) ?></td>
                            <td class="font-mono"><?= e($u['username']) ?></td>
                            <td><span class="role-pill <?= role_badge_class($u['role']) ?>"><?= e(role_label($u['role'])) ?></span></td>
                            <td><span class="cas-badge <?= $u['status'] === 'active' ? 'cas-badge-ok' : 'cas-badge-muted' ?>"><?= e($u['status']) ?></span></td>
                            <td>
                                <button class="cas-btn cas-btn-ghost cas-btn-sm" data-bs-toggle="collapse" data-bs-target="#user-<?= e((string) $u['user_id']) ?>">Edit</button>
                            </td>
                        </tr>
                        <tr class="collapse" id="user-<?= e((string) $u['user_id']) ?>">
                            <td colspan="5">
                                <form method="post" action="<?= url('settings/users/update') ?>" class="row g-2 align-items-end">
                                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                                    <input type="hidden" name="user_id" value="<?= e((string) $u['user_id']) ?>">
                                    <div class="col-md-3"><input name="full_name" class="form-control form-control-sm" value="<?= e($u['full_name']) ?>"></div>
                                    <div class="col-md-2">
                                        <select name="role" class="form-select form-select-sm">
                                            <option value="server" <?= $u['role']==='server'?'selected':'' ?>>Waiter</option>
                                            <option value="kitchen" <?= $u['role']==='kitchen'?'selected':'' ?>>Kitchen</option>
                                            <option value="staff" <?= $u['role']==='staff'?'selected':'' ?>>Cashier</option>
                                            <option value="auditor" <?= $u['role']==='auditor'?'selected':'' ?>>Auditor</option>
                                            <option value="manager" <?= $u['role']==='manager'?'selected':'' ?>>Manager</option>
                                            <option value="admin" <?= $u['role']==='admin'?'selected':'' ?>>Admin</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <select name="status" class="form-select form-select-sm">
                                            <option value="active" <?= $u['status']==='active'?'selected':'' ?>>active</option>
                                            <option value="inactive" <?= $u['status']==='inactive'?'selected':'' ?>>inactive</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2"><input name="new_password" type="password" class="form-control form-control-sm" placeholder="New password (optional)"></div>
                                    <div class="col-md-2"><button class="cas-btn cas-btn-success cas-btn-sm w-100">Save</button></div>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="tab-pane fade" id="tab-system">
        <div class="glass-panel">
            <div class="panel-head"><h3>System configuration</h3></div>
            <div class="panel-body">
                <p class="text-muted small">These values are set in <code>config/app.php</code> on the server. Contact your administrator to change them.</p>
                <table class="table table-sm" style="max-width:480px">
                    <tr><td class="text-muted">System name</td><td><?= e($config['name']) ?></td></tr>
                    <tr><td class="text-muted">Cafe name (customer menu)</td><td><?= e($config['cafe_name']) ?></td></tr>
                    <tr><td class="text-muted">Timezone</td><td><?= e($config['timezone']) ?></td></tr>
                    <tr><td class="text-muted">Audit variance threshold</td><td><?= e((string) $config['variance_threshold_pct']) ?>%</td></tr>
                    <tr><td class="text-muted">Session timeout</td><td><?= e((string) ((int) $config['session_timeout'] / 60)) ?> minutes</td></tr>
                </table>
                <hr class="border-secondary">
                <p class="small text-muted mb-1"><strong>Where to add data:</strong></p>
                <ul class="small text-muted mb-0">
                    <li><strong>Ingredients / stock</strong> — Inventory page</li>
                    <li><strong>Menu items (espresso, latte…)</strong> — Products page</li>
                    <li><strong>Suppliers & purchase orders</strong> — Suppliers page</li>
                    <li><strong>Staff accounts</strong> — Settings → Users & roles (this page)</li>
                </ul>
            </div>
        </div>
    </div>

    <div class="tab-pane fade" id="tab-payment">
        <div class="glass-panel">
            <div class="panel-head"><h3>Customer payment details</h3></div>
            <div class="panel-body">
                <p class="text-muted small">Shown on the customer menu when they pay via Telebirr or bank transfer.</p>
                <form method="post" action="<?= url('settings/payment') ?>" class="row g-3" style="max-width:560px">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <div class="col-12"><h4 class="h6 text-muted">Telebirr</h4></div>
                    <div class="col-md-6">
                        <label class="form-label">Telebirr number</label>
                        <input name="telebirr_number" class="form-control" value="<?= e($payment['telebirr_number'] ?? '') ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Account name</label>
                        <input name="telebirr_name" class="form-control" value="<?= e($payment['telebirr_name'] ?? '') ?>" required>
                    </div>
                    <div class="col-12"><h4 class="h6 text-muted mt-2">Bank transfer</h4></div>
                    <div class="col-md-6">
                        <label class="form-label">Bank name</label>
                        <input name="bank_name" class="form-control" value="<?= e($payment['bank_name'] ?? '') ?>" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Account number</label>
                        <input name="bank_account" class="form-control" value="<?= e($payment['bank_account'] ?? '') ?>" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label">Account holder name</label>
                        <input name="bank_account_name" class="form-control" value="<?= e($payment['bank_account_name'] ?? '') ?>" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label">Instructions for customers</label>
                        <textarea name="instructions" class="form-control" rows="3"><?= e($payment['instructions'] ?? '') ?></textarea>
                    </div>
                    <div class="col-12">
                        <button class="cas-btn cas-btn-primary">Save payment details</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <?php endif; ?>
</div>
