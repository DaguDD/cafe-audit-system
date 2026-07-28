(function () {
  const panel = document.getElementById('waiter-alert-panel');
  const cfg = window.SERVER_TABLET || {};
  if (!panel || !cfg.alertsUrl) return;

  let lastCount = -1;

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function buildAlertsHtml(alerts) {
    if (!alerts.length) {
      panel.innerHTML = '';
      panel.classList.add('d-none');
      return;
    }
    panel.classList.remove('d-none');
    let html = '';
    alerts.forEach(function (a) {
      const pending = a.status === 'pending';
      html += '<div class="waiter-alert-card ' + (pending ? 'pending pulse' : 'accepted') + '">';
      html += '<div class="waiter-alert-body"><strong>Table ' + escapeHtml(a.table_number) + '</strong>';
      if (pending) {
        html += '<span>Customer requested a waiter — go to this table</span>';
      } else if (a.is_mine) {
        html += '<span>You accepted — please visit this table</span>';
      } else {
        html += '<span>Accepted by ' + escapeHtml(a.assigned_name || 'staff') + '</span>';
      }
      html += '</div><div class="waiter-alert-actions">';
      if (pending) {
        html += '<form method="post" action="' + escapeHtml(cfg.acceptUrl) + '" class="d-inline">';
        html += '<input type="hidden" name="csrf_token" value="' + escapeHtml(cfg.csrfToken) + '">';
        html += '<input type="hidden" name="request_id" value="' + a.request_id + '">';
        html += '<button type="submit" class="cas-btn cas-btn-primary cas-btn-sm">I\'ll go</button></form>';
      } else if (a.is_mine) {
        html += '<a href="' + escapeHtml(cfg.serverUrl + '?table=' + a.table_id) + '" class="cas-btn cas-btn-ghost cas-btn-sm">Open table</a>';
        html += '<form method="post" action="' + escapeHtml(cfg.completeUrl) + '" class="d-inline ms-1">';
        html += '<input type="hidden" name="csrf_token" value="' + escapeHtml(cfg.csrfToken) + '">';
        html += '<input type="hidden" name="request_id" value="' + a.request_id + '">';
        html += '<button type="submit" class="cas-btn cas-btn-success cas-btn-sm">Done</button></form>';
      }
      html += '</div></div>';
    });
    panel.innerHTML = html;
  }

  function poll() {
    fetch(cfg.alertsUrl, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.ok) return;
        buildAlertsHtml(data.alerts || []);
        const pending = data.pending_count || 0;
        if (pending > lastCount && lastCount >= 0) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 880;
            g.gain.value = 0.08;
            o.start();
            setTimeout(function () { o.stop(); ctx.close(); }, 120);
          } catch (e) { /* ignore */ }
        }
        lastCount = pending;
        document.title = pending > 0 ? '(' + pending + ') Waiter Tablet' : 'Waiter Tablet';
      })
      .catch(function () { /* ignore */ });
  }

  poll();
  setInterval(poll, 8000);
})();
