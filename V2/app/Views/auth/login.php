<div class="auth-shell">
    <div class="auth-visual">
        <div class="auth-hero">
            <h1>Cafe Audit System</h1>
            <p>Inventory audit and reconciliation, sales tracking, table ordering, and operational reporting for your cafe — runs locally on your network.</p>
        </div>
    </div>
    <div class="auth-panel">
        <div class="auth-card">
            <h2>Sign in</h2>
            <p class="sub">Authorized personnel only</p>
            <form method="post" action="<?= url('login') ?>">
                <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                <div class="mb-2">
                    <label class="form-label">Username</label>
                    <input type="text" name="username" class="form-control" value="<?= old('username') ?>" required autofocus>
                </div>
                <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input type="password" name="password" class="form-control" required>
                </div>
                <button type="submit" class="cas-btn cas-btn-primary w-100">Login</button>
            </form>
        </div>
    </div>
</div>
