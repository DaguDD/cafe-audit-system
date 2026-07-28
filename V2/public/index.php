<?php

declare(strict_types=1);

require __DIR__ . '/../app/bootstrap.php';

$router = new Router();

$router->get('/', fn () => auth_user() ? redirect('dashboard') : redirect('login'));
$router->get('/login', [AuthController::class, 'showLogin']);
$router->post('/login', [AuthController::class, 'login']);
$router->get('/logout', [AuthController::class, 'logout']);

$router->get('/dashboard', [DashboardController::class, 'index']);

$router->get('/inventory', [InventoryController::class, 'index']);
$router->post('/inventory/store', [InventoryController::class, 'store']);
$router->post('/inventory/update', [InventoryController::class, 'update']);

$router->get('/sales', [SalesController::class, 'index']);
$router->post('/sales/store', [SalesController::class, 'store']);

$router->get('/audit', [AuditController::class, 'index']);
$router->post('/audit/submit', [AuditController::class, 'submit']);

$router->get('/waste', [WasteController::class, 'index']);
$router->post('/waste/store', [WasteController::class, 'store']);

$router->get('/shifts', [ShiftController::class, 'index']);
$router->post('/shifts/open', [ShiftController::class, 'open']);
$router->post('/shifts/close', [ShiftController::class, 'close']);

$router->get('/suppliers', [SupplierController::class, 'index']);
$router->post('/suppliers/store', [SupplierController::class, 'storeSupplier']);
$router->post('/suppliers/po', [SupplierController::class, 'storePO']);
$router->post('/suppliers/receive', [SupplierController::class, 'receivePO']);

$router->get('/reports', [ReportController::class, 'index']);
$router->get('/reports/export/sales', [ReportController::class, 'exportSales']);
$router->get('/reports/export/audits', [ReportController::class, 'exportAudits']);
$router->get('/reports/export/waste', [ReportController::class, 'exportWaste']);
$router->get('/reports/export/staff', [ReportController::class, 'exportStaff']);
$router->get('/reports/export/logins', [ReportController::class, 'exportLogins']);
$router->get('/reports/print', [ReportController::class, 'printView']);

$router->get('/settings', [SettingsController::class, 'index']);
$router->post('/settings/password', [SettingsController::class, 'updatePassword']);
$router->post('/settings/users/store', [SettingsController::class, 'storeUser']);
$router->post('/settings/users/update', [SettingsController::class, 'updateUser']);
$router->post('/settings/payment', [SettingsController::class, 'updatePayment']);

$router->get('/products', [ProductController::class, 'index']);
$router->post('/products/store', [ProductController::class, 'store']);
$router->post('/products/update', [ProductController::class, 'update']);
$router->post('/products/recipe/store', [ProductController::class, 'storeRecipe']);
$router->post('/products/recipe/remove', [ProductController::class, 'removeRecipe']);

// Cafe Audit System — table ordering routes
$router->get('/tables', [TableController::class, 'index']);
$router->post('/tables/store', [TableController::class, 'store']);
$router->post('/tables/regenerate', [TableController::class, 'regenerate']);
$router->get('/tables/print', [TableController::class, 'printQr']);

$router->get('/orders', [OrderController::class, 'index']);
$router->get('/orders/detail', [OrderController::class, 'tableDetail']);
$router->post('/orders/pay', [OrderController::class, 'pay']);
$router->post('/orders/pay-all', [OrderController::class, 'payAll']);
$router->post('/orders/cancel', [OrderController::class, 'cancel']);

$router->get('/payments', [PaymentController::class, 'index']);
$router->post('/payments/approve', [PaymentController::class, 'approve']);
$router->post('/payments/reject', [PaymentController::class, 'reject']);
$router->post('/payments/reopen', [PaymentController::class, 'reopen']);

$router->get('/server', [ServerController::class, 'index']);
$router->get('/server/alerts', [ServerController::class, 'alerts']);
$router->post('/server/order', [ServerController::class, 'order']);
$router->post('/server/accept-waiter', [ServerController::class, 'acceptWaiter']);
$router->post('/server/complete-waiter', [ServerController::class, 'completeWaiter']);

$router->get('/kitchen', [KitchenController::class, 'index']);
$router->post('/kitchen/update', [KitchenController::class, 'update']);

$router->dispatch($_SERVER['REQUEST_URI'] ?? '/', $_SERVER['REQUEST_METHOD'] ?? 'GET');
