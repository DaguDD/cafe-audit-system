<?php $selectedTable = (int) ($_GET['table'] ?? ($tables[0]['table_id'] ?? 0)); ?>
<div class="page-header mb-3">
    <h1 class="page-title">Waiter Tablet</h1>
    <p class="page-subtitle">Table calls appear below. Accept and go to the table when a customer requests a waiter.</p>
</div>

<div id="waiter-alert-panel" class="waiter-alert-panel" aria-live="polite"></div>

<div class="row g-4">
    <div class="col-lg-3">
        <div class="cas-card">
            <h2 class="h6 mb-3">Select Table</h2>
            <div class="list-group">
                <?php foreach ($tables as $t): ?>
                <a href="<?= url('server?table=' . (int) $t['table_id']) ?>"
                   class="list-group-item list-group-item-action <?= (int) $t['table_id'] === $selectedTable ? 'active' : '' ?> <?= $t['status'] === 'waiter_requested' ? 'table-needs-waiter' : '' ?>">
                    <?= e($t['table_number']) ?>
                    <span class="badge bg-<?= table_status_badge($t['status']) ?> float-end"><?= e(str_replace('_', ' ', $t['status'])) ?></span>
                </a>
                <?php endforeach; ?>
            </div>
        </div>
    </div>
    <div class="col-lg-9">
        <form method="post" action="<?= url('server/order') ?>" id="server-order-form">
            <input type="hidden" name="csrf_token" value="<?= csrf_token() ?>">
            <input type="hidden" name="table_id" value="<?= $selectedTable ?>">
            <input type="hidden" name="items_json" id="items-json" value="[]">

            <div class="cas-card mb-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="h6 mb-0">Menu</h2>
                    <div>Cart: <strong id="server-cart-total">0.00 ETB</strong></div>
                </div>
                <?php foreach ($categories as $cat): ?>
                <h3 class="h6 text-uppercase text-muted mt-3"><?= e($cat['name']) ?></h3>
                <div class="row g-2">
                    <?php foreach ($cat['products'] as $p): ?>
                    <div class="col-md-6">
                        <div class="border rounded p-2 d-flex justify-content-between align-items-center server-product"
                             data-id="<?= (int) $p['product_id'] ?>"
                             data-name="<?= e($p['name']) ?>"
                             data-price="<?= (float) $p['price'] ?>">
                            <div>
                                <strong><?= e($p['name']) ?></strong><br>
                                <small><?= money((float) $p['price']) ?></small>
                            </div>
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-outline-secondary qty-dec">−</button>
                                <span class="btn btn-light qty-display">0</span>
                                <button type="button" class="btn btn-outline-primary qty-inc">+</button>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                </div>
                <?php endforeach; ?>
            </div>
            <button type="submit" class="cas-btn cas-btn-primary btn-lg w-100" id="submit-server-order">Submit to Kitchen</button>
        </form>
    </div>
</div>

<script>
window.SERVER_TABLET = {
  alertsUrl: <?= json_encode(url('server/alerts')) ?>,
  acceptUrl: <?= json_encode(url('server/accept-waiter')) ?>,
  completeUrl: <?= json_encode(url('server/complete-waiter')) ?>,
  serverUrl: <?= json_encode(url('server')) ?>,
  csrfToken: <?= json_encode(csrf_token()) ?>
};
</script>
<script src="<?= asset('js/server-tablet.js') ?>"></script>
<script>
(function () {
  const cart = {};
  const totalEl = document.getElementById('server-cart-total');
  const itemsJson = document.getElementById('items-json');

  function sync() {
    let total = 0;
    const items = [];
    Object.values(cart).forEach(function (l) {
      if (l.qty > 0) {
        total += l.qty * l.price;
        items.push({ product_id: l.id, qty: l.qty });
      }
    });
    totalEl.textContent = total.toFixed(2) + ' ETB';
    itemsJson.value = JSON.stringify(items);
  }

  document.querySelectorAll('.server-product').forEach(function (row) {
    const id = parseInt(row.dataset.id, 10);
    const display = row.querySelector('.qty-display');
    cart[id] = { id: id, qty: 0, price: parseFloat(row.dataset.price) };

    row.querySelector('.qty-inc').addEventListener('click', function () {
      cart[id].qty += 1;
      display.textContent = cart[id].qty;
      sync();
    });
    row.querySelector('.qty-dec').addEventListener('click', function () {
      cart[id].qty = Math.max(0, cart[id].qty - 1);
      display.textContent = cart[id].qty;
      sync();
    });
  });

  document.getElementById('server-order-form').addEventListener('submit', function (e) {
    if (JSON.parse(itemsJson.value).length === 0) {
      e.preventDefault();
      alert('Add at least one item.');
    }
  });
})();
</script>
