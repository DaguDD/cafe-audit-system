(function () {
  const cart = {};
  const cartChip = document.getElementById('cart-chip');
  const cartChipLabel = document.getElementById('cart-chip-label');
  const cartChipSub = document.getElementById('cart-chip-sub');
  const cartItems = document.getElementById('cart-items');
  const cartTotal = document.getElementById('cart-total');
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  const submitBtn = document.getElementById('submit-order');
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toast = toastEl ? new bootstrap.Toast(toastEl, { delay: 2800 }) : null;

  function showToast(msg) {
    if (!toast) return;
    toastMsg.textContent = msg;
    toast.show();
  }

  function openCart() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function pulseCart() {
    if (!cartChip) return;
    cartChip.classList.remove('pulse');
    void cartChip.offsetWidth;
    cartChip.classList.add('pulse');
  }

  function renderCart() {
    let count = 0;
    let total = 0;
    cartItems.innerHTML = '';

    Object.values(cart).forEach(function (line) {
      count += line.qty;
      total += line.qty * line.price;
      const div = document.createElement('div');
      div.className = 'cart-line';
      div.innerHTML =
        '<div><div class="line-name">' + escapeHtml(line.name) + '</div>' +
        '<div class="line-price">' + line.price.toFixed(2) + ' ETB each</div></div>' +
        '<div class="qty-controls d-flex align-items-center gap-2">' +
        '<button type="button" data-action="dec" data-id="' + line.id + '">−</button>' +
        '<span class="fw-bold">' + line.qty + '</span>' +
        '<button type="button" data-action="inc" data-id="' + line.id + '">+</button>' +
        '</div>';
      cartItems.appendChild(div);
    });

    if (count === 0) {
      cartItems.innerHTML =
        '<div class="cart-empty"><div class="cart-empty-icon">🛒</div>Your cart is empty.<br>Browse the menu and tap <strong>Add</strong>.</div>';
      if (cartChip) cartChip.classList.remove('has-items');
      if (cartChipLabel) cartChipLabel.textContent = 'View cart';
      if (cartChipSub) cartChipSub.textContent = 'Add something delicious';
    } else {
      if (cartChip) cartChip.classList.add('has-items');
      if (cartChipLabel) cartChipLabel.textContent = count + ' item' + (count !== 1 ? 's' : '');
      if (cartChipSub) cartChipSub.textContent = total.toFixed(2) + ' ETB · Tap to review';
    }

    if (cartTotal) cartTotal.textContent = total.toFixed(2) + ' ETB';
    if (submitBtn) submitBtn.disabled = count === 0;

    document.querySelectorAll('.menu-card').forEach(function (card) {
      const id = card.dataset.productId;
      const qty = cart[id] ? cart[id].qty : 0;
      card.classList.toggle('in-cart', qty > 0);
      const num = card.querySelector('.qty-num');
      if (num) num.textContent = qty;
    });
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function addToCart(card, delta) {
    const id = card.dataset.productId;
    if (!cart[id]) {
      cart[id] = {
        id: id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        qty: 0,
      };
    }
    cart[id].qty = Math.max(0, cart[id].qty + delta);
    if (cart[id].qty === 0) delete cart[id];
    renderCart();
    if (delta > 0) pulseCart();
  }

  document.querySelectorAll('.menu-card').forEach(function (card) {
    const addBtn = card.querySelector('.btn-add');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addToCart(card, 1);
      });
    }
    card.querySelectorAll('.qty-inline button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addToCart(card, btn.dataset.action === 'inc' ? 1 : -1);
      });
    });
  });

  cartItems.addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (!cart[id]) return;
    if (btn.dataset.action === 'inc') cart[id].qty += 1;
    if (btn.dataset.action === 'dec') cart[id].qty = Math.max(0, cart[id].qty - 1);
    if (cart[id].qty === 0) delete cart[id];
    renderCart();
  });

  if (cartChip) {
    cartChip.addEventListener('click', function () {
      if (drawer.classList.contains('open')) closeCart();
      else openCart();
    });
  }

  document.getElementById('cart-close').addEventListener('click', closeCart);
  if (backdrop) backdrop.addEventListener('click', closeCart);

  document.getElementById('submit-order').addEventListener('click', async function () {
    const items = Object.values(cart).map(function (l) {
      return { product_id: parseInt(l.id, 10), qty: l.qty };
    });
    if (!items.length) {
      showToast('Add items to your cart first.');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    const notes = document.getElementById('order-notes').value.trim();
    try {
      const res = await fetch(MENU_BASE + '/menu.php?table=' + encodeURIComponent(TABLE_TOKEN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items, notes: notes }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Order sent!');
        Object.keys(cart).forEach(function (k) { delete cart[k]; });
        renderCart();
        closeCart();
        setTimeout(function () { location.reload(); }, 1400);
      } else {
        showToast(data.error || 'Order failed.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send to Kitchen';
      }
    } catch (err) {
      showToast('Network error. Try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send to Kitchen';
    }
  });

  async function requestWaiter() {
    const billBtn = document.getElementById('request-bill-bar');
    const waiterCart = document.getElementById('request-waiter-cart');
    [billBtn, waiterCart].forEach(function (b) {
      if (b) { b.disabled = true; }
    });
    try {
      const res = await fetch(MENU_BASE + '/menu.php?table=' + encodeURIComponent(TABLE_TOKEN) + '&action=waiter');
      const data = await res.json();
      showToast(data.ok ? data.message : (data.error || 'Could not reach a waiter.'));
      if (data.ok) {
        setTimeout(function () { location.reload(); }, 1800);
      }
    } catch (err) {
      showToast('Network error. Try again.');
    }
    [billBtn, waiterCart].forEach(function (b) {
      if (b) { b.disabled = false; }
    });
  }

  async function requestBill() {
    if (typeof BILL_TOTAL !== 'undefined' && BILL_TOTAL > 0) {
      openPayPanel();
      return;
    }
    await requestWaiter();
  }

  async function requestBillOnly() {
    const billBtn = document.getElementById('request-bill');
    if (billBtn) billBtn.disabled = true;
    try {
      const res = await fetch(MENU_BASE + '/menu.php?table=' + encodeURIComponent(TABLE_TOKEN) + '&action=bill');
      const data = await res.json();
      showToast(data.ok ? data.message : (data.error || 'Could not request bill.'));
    } catch (err) {
      showToast('Network error. Try again.');
    }
    if (billBtn) billBtn.disabled = false;
  }

  function openPayPanel() {
    const panel = document.getElementById('pay-panel');
    const backdrop = document.getElementById('pay-backdrop');
    if (!panel) return;
    panel.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePayPanel() {
    const panel = document.getElementById('pay-panel');
    const backdrop = document.getElementById('pay-backdrop');
    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  const payClose = document.getElementById('pay-close');
  const payBackdropEl = document.getElementById('pay-backdrop');
  if (payClose) payClose.addEventListener('click', closePayPanel);
  if (payBackdropEl) payBackdropEl.addEventListener('click', closePayPanel);

  document.querySelectorAll('.pay-method-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.pay-method-card').forEach(function (c) { c.classList.remove('active'); });
      card.classList.add('active');
      const methodInput = document.getElementById('payment_method');
      if (methodInput) methodInput.value = card.dataset.method || 'telebirr';
    });
  });

  const screenshotInput = document.getElementById('screenshot');
  const preview = document.getElementById('screenshot-preview');
  if (screenshotInput && preview) {
    screenshotInput.addEventListener('change', function () {
      preview.innerHTML = '';
      preview.classList.add('d-none');
      const file = screenshotInput.files && screenshotInput.files[0];
      if (!file) return;
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);
      preview.classList.remove('d-none');
    });
  }

  const payForm = document.getElementById('pay-form');
  if (payForm) {
    payForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = document.getElementById('pay-submit');
      if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
      const fd = new FormData(payForm);
      try {
        const res = await fetch(MENU_BASE + '/menu.php?table=' + encodeURIComponent(TABLE_TOKEN) + '&action=pay', {
          method: 'POST',
          body: fd,
        });
        const data = await res.json();
        if (data.ok) {
          showToast(data.message || 'Payment submitted!');
          setTimeout(function () { location.reload(); }, 1500);
        } else {
          showToast(data.error || 'Payment failed.');
          if (btn) { btn.disabled = false; btn.textContent = 'Submit payment proof'; }
        }
      } catch (err) {
        showToast('Network error. Try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Submit payment proof'; }
      }
    });
  }

  if (typeof BILL_TOTAL !== 'undefined' && BILL_TOTAL > 0) {
    const billBarBtn = document.getElementById('request-bill-bar');
    if (billBarBtn) billBarBtn.classList.add('has-bill');
  }

  if (typeof HAS_PENDING_PAYMENT !== 'undefined' && HAS_PENDING_PAYMENT) {
    openPayPanel();
  }

  const reqBillBtn = document.getElementById('request-bill');
  if (reqBillBtn) reqBillBtn.addEventListener('click', requestBillOnly);
  const waiterCartBtn = document.getElementById('request-waiter-cart');
  if (waiterCartBtn) waiterCartBtn.addEventListener('click', requestWaiter);
  const billBar = document.getElementById('request-bill-bar');
  if (billBar) billBar.addEventListener('click', requestBill);

  const receiptToggle = document.getElementById('receipt-toggle');
  const receiptBody = document.getElementById('receipt-body');
  if (receiptToggle && receiptBody) {
    receiptToggle.addEventListener('click', function () {
      const open = receiptBody.hidden;
      receiptBody.hidden = !open;
      receiptToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function updateTipTotal() {
    if (typeof RECEIPT_BASE === 'undefined') return;
    const tipInput = document.getElementById('tip_amount');
    const payAmount = document.getElementById('pay-amount');
    const tip = tipInput ? Math.max(0, parseFloat(tipInput.value) || 0) : 0;
    const grand = RECEIPT_BASE.baseTotal + tip;
    const grandText = grand.toFixed(2) + ' ETB';
    const tipText = tip.toFixed(2) + ' ETB';

    if (payAmount) payAmount.value = grand.toFixed(2);

    ['receipt-tip-display', 'pay-receipt-tip-display'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = tipText;
    });
    ['receipt-grand-display', 'pay-receipt-grand-display', 'pay-amount-display'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = grandText;
    });
  }

  document.querySelectorAll('.tip-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tip-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      const tipInput = document.getElementById('tip_amount');
      if (tipInput) tipInput.value = btn.dataset.tip || '0';
      updateTipTotal();
    });
  });

  const tipInput = document.getElementById('tip_amount');
  if (tipInput) {
    tipInput.addEventListener('input', updateTipTotal);
    updateTipTotal();
  }

  /* Sticky category nav — highlight active section on scroll */
  const pills = document.querySelectorAll('.cat-pill');
  const sections = document.querySelectorAll('.menu-section');
  if (pills.length && sections.length) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            pills.forEach(function (p) {
              p.classList.toggle('active', p.dataset.cat === id);
            });
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    sections.forEach(function (s) { observer.observe(s); });

    pills.forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.getElementById(pill.dataset.cat);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  renderCart();
})();
