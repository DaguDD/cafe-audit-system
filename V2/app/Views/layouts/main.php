<?php

$contentTemplate = APP_PATH . '/Views/' . $template . '.php';
if (!is_file($contentTemplate)) {
    http_response_code(500);
    exit('View not found: ' . e($template));
}

$flashTypeMap = [
    'success' => 'cas-alert-success',
    'danger' => 'cas-alert-danger',
    'warning' => 'cas-alert-warning',
    'info' => 'cas-alert-info',
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e($title ?? $config['name']) ?></title>
    <script>
    (function () {
      var t = localStorage.getItem('cas_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', t);
      if (localStorage.getItem('cas_sidebar_collapsed') === '1') {
        document.documentElement.classList.add('sidebar-collapsed-init');
      }
    })();
    </script>
    <link href="<?= asset('vendor/bootstrap/bootstrap.min.css') ?>" rel="stylesheet">
    <link href="<?= asset('css/app.css') ?>" rel="stylesheet">
</head>
<body>

<?php if ($user): ?>
<div class="app-shell" id="app-shell">
    <div class="sidebar-overlay"></div>
    <aside class="app-sidebar" id="app-sidebar">
        <div class="sidebar-brand">
            <a href="<?= url('dashboard') ?>">
                <span class="mark">CAS</span>
                <span class="brand-text">
                    <span class="name"><?= e($config['name']) ?></span><br>
                    <span class="tag"><?= e($config['cafe_name']) ?></span>
                </span>
            </a>
            <button type="button" class="sidebar-collapse-btn" id="sidebar-collapse-btn" aria-label="Toggle sidebar" title="Toggle menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
        </div>
        <nav class="sidebar-nav">
            <div class="nav-section">Overview</div>
            <a href="<?= url('dashboard') ?>" class="<?= nav_active('dashboard') ?>" title="Dashboard">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                <span class="nav-label">Dashboard</span>
            </a>

            <div class="nav-section">Operations</div>
            <?php if (in_array($user['role'], ['admin', 'manager', 'server'], true)): ?>
            <a href="<?= url('server') ?>" class="<?= nav_active('server') ?>" title="Waiter Tablet">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>
                <span class="nav-label">Waiter Tablet</span>
                <?php $wc = WaiterRequest::pendingCount(); if ($wc > 0): ?>
                <span class="nav-badge"><?= $wc ?></span>
                <?php endif; ?>
            </a>
            <a href="<?= url('orders') ?>" class="<?= nav_active('orders') ?>" title="Active Tables">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                <span class="nav-label">Active Tables</span>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'server', 'staff'], true)): ?>
            <a href="<?= url('payments') ?>" class="<?= nav_active('payments') ?>" title="Payments">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                <span class="nav-label">Payments</span>
                <?php $pc = PaymentSubmission::pendingCount(); if ($pc > 0): ?>
                <span class="nav-badge"><?= $pc ?></span>
                <?php endif; ?>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'kitchen'], true)): ?>
            <a href="<?= url('kitchen') ?>" class="<?= nav_active('kitchen') ?>" title="Kitchen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
                <span class="nav-label">Kitchen</span>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'auditor', 'kitchen'], true)): ?>
            <a href="<?= url('inventory') ?>" class="<?= nav_active('inventory') ?>" title="Inventory">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span class="nav-label">Inventory</span>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'kitchen'], true)): ?>
            <a href="<?= url('products') ?>" class="<?= nav_active('products') ?>" title="Products">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span class="nav-label">Products</span>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'auditor'], true)): ?>
            <a href="<?= url('audit') ?>" class="<?= nav_active('audit') ?>" title="Reconciliation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span class="nav-label">Reconciliation</span>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'server', 'staff'], true)): ?>
            <a href="<?= url('sales') ?>" class="<?= nav_active('sales') ?>" title="Sales">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <span class="nav-label">Sales</span>
            </a>
            <?php endif; ?>
            <?php if (in_array($user['role'], ['admin', 'manager', 'server', 'staff', 'kitchen'], true)): ?>
            <a href="<?= url('waste') ?>" class="<?= nav_active('waste') ?>" title="Waste">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span class="nav-label">Waste</span>
            </a>
            <?php endif; ?>

            <?php if (in_array($user['role'], ['admin', 'manager'], true)): ?>
            <div class="nav-section">Management</div>
            <a href="<?= url('tables') ?>" class="<?= nav_active('tables') ?>" title="Tables & QR">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                <span class="nav-label">Tables & QR</span>
            </a>
            <a href="<?= url('shifts') ?>" class="<?= nav_active('shifts') ?>" title="Shifts">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span class="nav-label">Shifts</span>
            </a>
            <a href="<?= url('suppliers') ?>" class="<?= nav_active('suppliers') ?>" title="Suppliers">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <span class="nav-label">Suppliers</span>
            </a>
            <?php endif; ?>

            <?php if (in_array($user['role'], ['admin', 'manager', 'auditor'], true)): ?>
            <div class="nav-section">Intelligence</div>
            <a href="<?= url('reports') ?>" class="<?= nav_active('reports') ?>" title="Analytics">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                <span class="nav-label">Analytics</span>
            </a>
            <?php endif; ?>
        </nav>
        <div class="sidebar-footer">
            <button type="button" class="sidebar-user-btn" id="user-menu-toggle" aria-expanded="false">
                <div class="user-avatar"><?= e(strtoupper(substr($user['full_name'], 0, 1))) ?></div>
                <div class="user-meta">
                    <strong><?= e($user['full_name']) ?></strong>
                    <span class="role-pill <?= role_badge_class($user['role']) ?>"><?= e(role_label($user['role'])) ?></span>
                </div>
                <svg class="user-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="user-menu" id="user-menu" hidden>
                <div class="user-menu-section">Appearance</div>
                <label class="user-menu-row">
                    <span>Theme</span>
                    <select id="theme-select" class="form-select form-select-sm">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                    </select>
                </label>
                <div class="user-menu-divider"></div>
                <a href="<?= url('settings') ?>" class="user-menu-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                    Settings & account
                </a>
                <a href="<?= url('logout') ?>" class="user-menu-link user-menu-link-danger">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign out
                </a>
            </div>
        </div>
    </aside>

    <div class="app-main-wrap">
        <header class="app-topbar">
            <div class="topbar-left">
                <button type="button" class="menu-toggle" id="mobile-menu-toggle" aria-label="Open menu">☰</button>
                <div class="live-clock" id="live-clock"></div>
            </div>
            <div class="d-flex align-items-center gap-3">
                <div class="system-status">
                    <span class="status-dot"></span>
                    System Online
                </div>
                <a href="<?= url('logout') ?>" class="cas-btn cas-btn-ghost cas-btn-sm">Sign out</a>
            </div>
        </header>
        <main class="app-main">
            <div class="app-content">
            <?php if ($flash): ?>
                <div class="cas-alert <?= e($flashTypeMap[$flash['type']] ?? 'cas-alert-info') ?>">
                    <?= e($flash['message']) ?>
                </div>
            <?php endif; ?>
            <?php require $contentTemplate; ?>
            </div>
        </main>
    </div>
</div>

<?php else: ?>
<main>
    <?php if ($flash): ?>
        <div class="container pt-3">
            <div class="cas-alert <?= e($flashTypeMap[$flash['type']] ?? 'cas-alert-info') ?>">
                <?= e($flash['message']) ?>
            </div>
        </div>
    <?php endif; ?>
    <?php require $contentTemplate; ?>
</main>
<?php endif; ?>

<script src="<?= asset('vendor/bootstrap/bootstrap.bundle.min.js') ?>"></script>
<script src="<?= asset('vendor/chartjs/chart.umd.min.js') ?>"></script>
<script src="<?= asset('js/app.js') ?>"></script>
<?php if (isset($extraScripts)): ?>
    <?= $extraScripts ?>
<?php endif; ?>
</body>
</html>
