<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/app/bootstrap.php';
require BASE_PATH . '/lib/QrGenerator.php';

$token = trim($_GET['table'] ?? '');
$table = $token !== '' ? RestaurantTable::findByToken($token) : null;
$config = require CONFIG_PATH . '/app.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'pay') {
    header('Content-Type: application/json');
    if (!$table) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Invalid table.']);
        exit;
    }
    try {
        $amount = round((float) ($_POST['amount'] ?? 0), 2);
        $tip = round((float) ($_POST['tip_amount'] ?? 0), 2);
        $id = PaymentSubmission::createFromUpload(
            (int) $table['table_id'],
            $token,
            $_POST['payment_method'] ?? '',
            $_POST['reference_number'] ?? '',
            trim($_POST['sender_phone'] ?? '') ?: null,
            $amount,
            $tip,
            $_FILES['screenshot'] ?? []
        );
        echo json_encode([
            'ok' => true,
            'submission_id' => $id,
            'message' => 'Payment submitted! Staff will verify your receipt shortly.',
        ]);
    } catch (Throwable $e) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && (!isset($_GET['action']) || $_GET['action'] === 'order')) {
    header('Content-Type: application/json');
    if (!$table) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Invalid table.']);
        exit;
    }
    $payload = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid request.']);
        exit;
    }
    $items = $payload['items'] ?? [];
    $notes = trim($payload['notes'] ?? '');
    try {
        $orderId = Order::create((int) $table['table_id'], $items, 'qr', null, $notes ?: null);
        echo json_encode(['ok' => true, 'order_id' => $orderId, 'message' => 'Order sent to the kitchen!']);
    } catch (Throwable $e) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'bill' && $table) {
    header('Content-Type: application/json');
    try {
        Order::requestBill((int) $table['table_id']);
        echo json_encode(['ok' => true, 'message' => 'Bill requested — your waiter will bring the total shortly.']);
    } catch (Throwable $e) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'waiter' && $table) {
    header('Content-Type: application/json');
    try {
        $waiters = WaiterRequest::availableWaiters();
        if (empty($waiters)) {
            http_response_code(422);
            echo json_encode(['ok' => false, 'error' => 'No waiters are on duty right now. Please ask staff at the counter.']);
            exit;
        }
        WaiterRequest::create((int) $table['table_id']);
        $names = array_column($waiters, 'full_name');
        $count = count($names);
        $msg = $count === 1
            ? 'Waiter notified (' . $names[0] . '). They will come to Table ' . $table['table_number'] . ' shortly.'
            : $count . ' waiters on duty have been notified. Someone will come to Table ' . $table['table_number'] . ' shortly.';
        echo json_encode(['ok' => true, 'message' => $msg, 'waiters_notified' => $count]);
    } catch (Throwable $e) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

$categories = $table ? Product::categoriesWithProducts() : [];
$session = $table ? RestaurantTable::activeSession((int) $table['table_id']) : [];
$hasActiveOrders = !empty($session);
$bill = $table ? Order::tableBill((int) $table['table_id']) : ['orders' => [], 'total' => 0];
$receipt = $table ? BillReceipt::forTable((int) $table['table_id'], 0) : ['has_orders' => false, 'grand_total' => 0];
$paymentConfig = payment_config();
$pendingPayment = $table ? PaymentSubmission::pendingForTable((int) $table['table_id']) : null;
$latestPayment = $table ? PaymentSubmission::latestForTable((int) $table['table_id']) : null;
$billTotal = round((float) $receipt['grand_total'], 2);
$pendingWaiter = $table ? WaiterRequest::activeForTable((int) $table['table_id']) : null;
$configFull = require CONFIG_PATH . '/app.php';
$cafeHours = $configFull['cafe_hours'] ?? ['open' => '08:00', 'close' => '22:00'];

function customer_status_class(string $status): string
{
    return match ($status) {
        'preparing' => 'preparing',
        'served' => 'served',
        'paid' => 'paid',
        default => 'kitchen',
    };
}

function product_icon(string $name, string $categoryName): string
{
    $n = strtolower($name);
    return match (true) {
        str_contains($n, 'espresso') => '☕',
        str_contains($n, 'latte') => '🥛',
        str_contains($n, 'cappuccino') => '☕',
        str_contains($n, 'mocha') || str_contains($n, 'chocolate') => '🍫',
        str_contains($n, 'croissant') => '🥐',
        str_contains($n, 'iced') => '🧊',
        default => category_icon($categoryName),
    };
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0c0b09">
    <title><?= e($config['cafe_name']) ?> · <?= e($config['name']) ?></title>
    <link href="<?= asset('vendor/bootstrap/bootstrap.min.css') ?>" rel="stylesheet">
    <link href="<?= asset('css/customer.css') ?>?v=5" rel="stylesheet">
</head>
<body class="customer-body">
<?php if (!$table): ?>
<div class="not-found-wrap">
    <div>
        <div style="font-size:3rem;margin-bottom:1rem">📋</div>
        <h1 class="h3">Table not found</h1>
        <p class="text-muted">Scan the QR code at your table to open the menu.</p>
    </div>
</div>
<?php else: ?>

<section class="menu-hero">
    <p class="hero-eyebrow"><?= e($config['name']) ?></p>
    <h1 class="hero-title"><?= e($config['cafe_name']) ?></h1>
    <span class="hero-table">Table <?= e($table['table_number']) ?></span>
    <p class="hero-tagline">Tap a category, add to cart, and we'll bring it right over.</p>
    <?php if ($pendingWaiter): ?>
    <div class="waiter-status-banner">
        <?php if ($pendingWaiter['status'] === 'accepted' && !empty($pendingWaiter['assigned_name'])): ?>
        <?= e($pendingWaiter['assigned_name']) ?> is on the way to your table.
        <?php else: ?>
        A waiter has been notified and will be with you shortly.
        <?php endif; ?>
    </div>
    <?php endif; ?>
</section>

<?php if (count($categories) > 1): ?>
<nav class="cat-nav-wrap" aria-label="Menu categories">
    <div class="cat-nav" id="cat-nav">
        <?php foreach ($categories as $i => $cat): ?>
        <?php $slug = 'cat-' . (int) $cat['cat_id']; ?>
        <a href="#<?= e($slug) ?>" class="cat-pill<?= $i === 0 ? ' active' : '' ?>" data-cat="<?= e($slug) ?>">
            <span class="pill-icon"><?= category_icon($cat['name']) ?></span>
            <?= e($cat['name']) ?>
        </a>
        <?php endforeach; ?>
    </div>
</nav>
<?php endif; ?>

<main class="menu-main">
    <?php if ($hasActiveOrders): ?>
    <section class="orders-panel">
        <h2 class="orders-panel-title">Your orders</h2>
        <?php foreach ($session as $order): ?>
        <?php $statusClass = customer_status_class($order['status']); ?>
        <div class="order-status-card">
            <div class="d-flex justify-content-between align-items-start gap-2">
                <strong style="font-size:0.85rem">#<?= (int) $order['order_id'] ?></strong>
                <span class="status-pill <?= e($statusClass) ?>"><?= e(order_status_label($order['status'])) ?></span>
            </div>
            <ul class="order-items-list">
                <?php foreach ($order['items'] as $item): ?>
                <li><?= (int) $item['qty'] ?>× <?= e($item['product_name']) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endforeach; ?>
    </section>
    <?php endif; ?>

    <?php if ($receipt['has_orders']): ?>
    <section class="receipt-accordion" id="receipt-section">
        <button type="button" class="receipt-toggle" id="receipt-toggle" aria-expanded="false">
            <span class="receipt-toggle-label">🧾 View itemized bill</span>
            <span class="receipt-toggle-total"><?= money((float) $receipt['grand_total']) ?></span>
        </button>
        <div class="receipt-body" id="receipt-body" hidden>
            <div class="receipt-paper">
                <div class="receipt-head">
                    <strong><?= e($config['cafe_name']) ?></strong>
                    <div class="small">Table <?= e($table['table_number']) ?> · <?= date('M j, g:i A') ?></div>
                </div>
                <div class="receipt-server">
                    <span>Served by</span>
                    <strong><?= e($receipt['server_label']) ?></strong>
                </div>
                <table class="receipt-lines">
                    <tbody>
                    <?php foreach ($receipt['lines'] as $line): ?>
                    <tr>
                        <td><?= (int) $line['qty'] ?>× <?= e($line['name']) ?></td>
                        <td><?= money((float) $line['line_total']) ?></td>
                    </tr>
                    <?php endforeach; ?>
                    </tbody>
                </table>
                <div class="receipt-math">
                    <div class="receipt-line-row"><span>Subtotal</span><span><?= money((float) $receipt['subtotal']) ?></span></div>
                    <div class="receipt-line-row"><span>VAT (<?= e((string) $receipt['vat_rate']) ?>%)</span><span><?= money((float) $receipt['vat_amount']) ?></span></div>
                    <div class="receipt-line-row"><span>Service charge (<?= e((string) $receipt['service_rate']) ?>%)</span><span><?= money((float) $receipt['service_amount']) ?></span></div>
                    <div class="receipt-line-row receipt-tip-row"><span>Tip (optional)</span><span id="receipt-tip-display">0.00 ETB</span></div>
                    <div class="receipt-line-row receipt-grand"><span>Total due</span><span id="receipt-grand-display"><?= money((float) $receipt['grand_total']) ?></span></div>
                </div>
                <p class="receipt-foot">Thank you for dining with us. Transparency builds trust.</p>
            </div>
        </div>
    </section>
    <?php endif; ?>

    <?php foreach ($categories as $cat): ?>
    <?php $slug = 'cat-' . (int) $cat['cat_id']; ?>
    <section class="menu-section" id="<?= e($slug) ?>">
        <div class="section-head">
            <span class="section-icon"><?= category_icon($cat['name']) ?></span>
            <h2 class="section-title"><?= e($cat['name']) ?></h2>
            <span class="section-count"><?= count($cat['products']) ?> items</span>
        </div>
        <div class="menu-grid">
            <?php foreach ($cat['products'] as $product): ?>
            <article class="menu-card" data-product-id="<?= (int) $product['product_id'] ?>"
                     data-name="<?= e($product['name']) ?>"
                     data-price="<?= (float) $product['price'] ?>">
                <div class="menu-card-inner">
                    <div class="item-visual" aria-hidden="true"><?= product_icon($product['name'], $cat['name']) ?></div>
                    <div class="item-body">
                        <h3 class="item-name"><?= e($product['name']) ?></h3>
                        <?php if (!empty($product['description'])): ?>
                        <p class="item-desc"><?= e($product['description']) ?></p>
                        <?php endif; ?>
                        <div class="item-footer">
                            <span class="item-price"><?= money((float) $product['price']) ?></span>
                            <div class="item-actions">
                                <button type="button" class="btn-add">Add</button>
                                <div class="qty-inline">
                                    <button type="button" data-action="dec" aria-label="Less">−</button>
                                    <span class="qty-num">0</span>
                                    <button type="button" data-action="inc" aria-label="More">+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
            <?php endforeach; ?>
        </div>
    </section>
    <?php endforeach; ?>
</main>

<nav class="bottom-bar" aria-label="Order actions">
    <button type="button" class="cart-chip" id="cart-chip">
        <span class="cart-icon-wrap" aria-hidden="true">🛒</span>
        <span class="cart-meta">
            <strong id="cart-chip-label">View cart</strong>
            <small id="cart-chip-sub">Add something delicious</small>
        </span>
    </button>
    <button type="button" class="btn-bill" id="request-bill-bar"><?= $billTotal > 0 ? 'Pay Bill' : 'Request Waiter' ?></button>
</nav>

<?php if ($billTotal > 0 || $pendingPayment): ?>
<div class="pay-panel" id="pay-panel" aria-hidden="true">
    <div class="pay-panel-inner">
        <div class="pay-header">
            <h2>Pay your bill</h2>
            <button type="button" class="btn-close btn-close-white" id="pay-close"></button>
        </div>

        <?php if ($receipt['has_orders']): ?>
        <div class="pay-receipt" id="pay-receipt">
            <div class="pay-receipt-head">
                <strong><?= e($config['cafe_name']) ?></strong>
                <span>Table <?= e($table['table_number']) ?> · <?= date('M j, g:i A') ?></span>
            </div>
            <div class="pay-receipt-server">
                <span>Served by</span>
                <strong><?= e($receipt['server_label']) ?></strong>
            </div>
            <table class="pay-receipt-lines">
                <tbody>
                <?php foreach ($receipt['lines'] as $line): ?>
                <tr>
                    <td><?= (int) $line['qty'] ?>× <?= e($line['name']) ?></td>
                    <td><?= money((float) $line['line_total']) ?></td>
                </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
            <div class="pay-receipt-math">
                <div class="pay-receipt-row"><span>Subtotal</span><span><?= money((float) $receipt['subtotal']) ?></span></div>
                <div class="pay-receipt-row"><span>VAT (<?= e((string) $receipt['vat_rate']) ?>%)</span><span><?= money((float) $receipt['vat_amount']) ?></span></div>
                <div class="pay-receipt-row"><span>Service charge (<?= e((string) $receipt['service_rate']) ?>%)</span><span><?= money((float) $receipt['service_amount']) ?></span></div>
                <div class="pay-receipt-row pay-receipt-tip-row"><span>Tip</span><span id="pay-receipt-tip-display">0.00 ETB</span></div>
                <div class="pay-receipt-row pay-receipt-grand">
                    <span>Total due</span>
                    <span id="pay-receipt-grand-display"><?= money((float) $receipt['grand_total']) ?></span>
                </div>
            </div>
        </div>
        <?php else: ?>
        <div class="pay-amount-box">
            <span class="pay-amount-label">Amount due</span>
            <span class="pay-amount-value" id="pay-amount-display"><?= money($billTotal) ?></span>
        </div>
        <?php endif; ?>

        <?php if ($pendingPayment): ?>
        <div class="pay-status pay-status-pending">
            <strong>Payment under review</strong>
            <p>We received your <?= e($pendingPayment['payment_method']) ?> payment (ref <?= e($pendingPayment['reference_number']) ?>). A staff member will confirm shortly.</p>
        </div>
        <?php elseif ($latestPayment && $latestPayment['status'] === 'rejected'): ?>
        <div class="pay-status pay-status-rejected">
            <strong>Previous payment rejected</strong>
            <p><?= e($latestPayment['review_notes'] ?? 'Please submit again with a clear receipt.') ?></p>
        </div>
        <?php endif; ?>

        <?php if (!$pendingPayment && $billTotal > 0): ?>
        <form id="pay-form" class="pay-form" enctype="multipart/form-data">
            <input type="hidden" name="payment_method" id="payment_method" value="telebirr">
            <input type="hidden" name="amount" id="pay-amount" value="<?= e((string) $billTotal) ?>">
            <div class="mb-3">
                <label class="form-label-sm">Tip your waiter (optional)</label>
                <div class="tip-presets">
                    <button type="button" class="tip-btn" data-tip="0">None</button>
                    <button type="button" class="tip-btn" data-tip="10">10 ETB</button>
                    <button type="button" class="tip-btn" data-tip="20">20 ETB</button>
                    <button type="button" class="tip-btn" data-tip="50">50 ETB</button>
                </div>
                <input type="number" name="tip_amount" id="tip_amount" class="form-control form-control-sm mt-1" min="0" step="1" value="0" placeholder="Custom tip amount">
            </div>

            <p class="pay-instructions"><?= e($paymentConfig['instructions'] ?? '') ?></p>

            <div class="pay-methods">
                <div class="pay-method-card active" data-method="telebirr">
                    <div class="pay-method-icon">📱</div>
                    <div>
                        <strong>Telebirr</strong>
                        <div class="pay-method-detail"><?= e($paymentConfig['telebirr_number'] ?? '') ?></div>
                        <div class="pay-method-name"><?= e($paymentConfig['telebirr_name'] ?? '') ?></div>
                    </div>
                </div>
                <div class="pay-method-card" data-method="bank">
                    <div class="pay-method-icon">🏦</div>
                    <div>
                        <strong><?= e($paymentConfig['bank_name'] ?? 'Bank') ?></strong>
                        <div class="pay-method-detail font-mono"><?= e($paymentConfig['bank_account'] ?? '') ?></div>
                        <div class="pay-method-name"><?= e($paymentConfig['bank_account_name'] ?? '') ?></div>
                    </div>
                </div>
            </div>

            <div class="mb-2">
                <label class="form-label-sm">Transaction reference *</label>
                <input type="text" name="reference_number" id="reference_number" class="form-control form-control-sm" placeholder="From Telebirr / bank SMS" required minlength="4" maxlength="64" pattern="[A-Za-z0-9\-]+" title="Letters, numbers, and dashes only">
            </div>
            <div class="mb-2">
                <label class="form-label-sm">Your phone (optional)</label>
                <input type="tel" name="sender_phone" class="form-control form-control-sm" placeholder="09xxxxxxxx" maxlength="20">
            </div>
            <div class="mb-2">
                <label class="form-label-sm">Payment screenshot *</label>
                <input type="file" name="screenshot" id="screenshot" class="form-control form-control-sm" accept="image/jpeg,image/png,image/webp" capture="environment" required>
                <div class="form-hint">Upload the receipt from your Telebirr or banking app. Max 5 MB.</div>
            </div>
            <div id="screenshot-preview" class="screenshot-preview d-none"></div>
            <button type="submit" class="btn-pay-submit" id="pay-submit">Submit payment proof</button>
            <p class="pay-anti-cheat">Payments are verified manually. Duplicate references or reused screenshots are blocked.</p>
        </form>
        <?php endif; ?>
    </div>
</div>
<div class="pay-backdrop" id="pay-backdrop"></div>
<?php endif; ?>

<div class="cart-backdrop" id="cart-backdrop"></div>

<div class="cart-drawer" id="cart-drawer" role="dialog" aria-label="Your cart">
    <div class="cart-handle"></div>
    <div class="cart-header">
        <h2>Your order</h2>
        <button type="button" class="btn-close" id="cart-close" aria-label="Close"></button>
    </div>
    <div class="cart-items" id="cart-items"></div>
    <div class="cart-footer">
        <div class="total-row">
            <span>Subtotal</span>
            <strong id="cart-total">0.00 ETB</strong>
        </div>
        <textarea class="form-control mb-2" id="order-notes" rows="2" placeholder="Allergies or special requests…"></textarea>
        <button type="button" class="btn btn-primary w-100" id="submit-order" disabled>Send to Kitchen</button>
        <?php if ($billTotal > 0): ?>
        <button type="button" class="btn-link-bill" id="request-bill">Request bill instead</button>
        <?php else: ?>
        <button type="button" class="btn-link-bill" id="request-waiter-cart">Request waiter instead</button>
        <?php endif; ?>
    </div>
</div>

<div class="toast-container position-fixed top-0 start-50 translate-middle-x p-3" style="z-index:2000">
    <div id="toast" class="toast align-items-center border-0 shadow-lg" role="alert"
         style="background:var(--bg-elevated);color:var(--text);border:1px solid var(--border)!important">
        <div class="d-flex"><div class="toast-body" id="toast-msg"></div></div>
    </div>
</div>

<script>
const TABLE_TOKEN = <?= json_encode($token) ?>;
const MENU_BASE = <?= json_encode(dirname($_SERVER['SCRIPT_NAME'])) ?>;
const BILL_TOTAL = <?= json_encode($billTotal) ?>;
const HAS_PENDING_PAYMENT = <?= json_encode($pendingPayment !== null) ?>;
const RECEIPT_BASE = <?= json_encode([
    'subtotal' => $receipt['subtotal'] ?? 0,
    'vat' => $receipt['vat_amount'] ?? 0,
    'service' => $receipt['service_amount'] ?? 0,
    'baseTotal' => ($receipt['subtotal'] ?? 0) + ($receipt['vat_amount'] ?? 0) + ($receipt['service_amount'] ?? 0),
]) ?>;
</script>
<script src="<?= htmlspecialchars(asset('vendor/bootstrap/bootstrap.bundle.min.js'), ENT_QUOTES, 'UTF-8') ?>"></script>
<script src="<?= asset('js/customer.js') ?>?v=6"></script>
<?php endif; ?>
</body>
</html>
