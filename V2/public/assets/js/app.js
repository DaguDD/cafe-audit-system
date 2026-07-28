document.addEventListener('DOMContentLoaded', () => {
  const shell = document.getElementById('app-shell');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userMenu = document.getElementById('user-menu');
  const themeSelect = document.getElementById('theme-select');

  const isMobile = () => window.matchMedia('(max-width: 992px)').matches;

  const setCollapsed = (collapsed, persist = true) => {
    if (!shell || isMobile()) return;
    shell.classList.toggle('sidebar-collapsed', collapsed);
    document.documentElement.classList.toggle('sidebar-collapsed-init', collapsed);
    if (persist) {
      localStorage.setItem('cas_sidebar_collapsed', collapsed ? '1' : '0');
    }
  };

  if (shell && localStorage.getItem('cas_sidebar_collapsed') === '1' && !isMobile()) {
    shell.classList.add('sidebar-collapsed');
  }
  document.documentElement.classList.remove('sidebar-collapsed-init');

  collapseBtn?.addEventListener('click', () => {
    setCollapsed(!shell?.classList.contains('sidebar-collapsed'));
  });

  mobileToggle?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('show');
  });

  const closeUserMenu = () => {
    if (!userMenu || !userMenuToggle) return;
    userMenu.hidden = true;
    userMenuToggle.setAttribute('aria-expanded', 'false');
  };

  userMenuToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = userMenuToggle.getAttribute('aria-expanded') === 'true';
    if (open) {
      closeUserMenu();
    } else {
      userMenu.hidden = false;
      userMenuToggle.setAttribute('aria-expanded', 'true');
    }
  });

  document.addEventListener('click', (e) => {
    if (userMenu && !userMenu.hidden && userMenuToggle && !userMenuToggle.contains(e.target)) {
      closeUserMenu();
    }
  });

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cas_theme', theme);
    if (themeSelect) themeSelect.value = theme;
  };

  if (themeSelect) {
    themeSelect.value = localStorage.getItem('cas_theme') || 'dark';
    themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));
  }

  window.addEventListener('resize', () => {
    if (isMobile()) {
      sidebar?.classList.remove('open');
      overlay?.classList.remove('show');
    }
  });

  const clock = document.getElementById('live-clock');
  if (clock) {
    const tick = () => {
      const now = new Date();
      clock.innerHTML = `<span>${now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</span> · ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  const chartEl = document.getElementById('revenueChart');
  if (chartEl && typeof Chart !== 'undefined') {
    const labels = JSON.parse(chartEl.dataset.labels || '[]');
    const values = JSON.parse(chartEl.dataset.values || '[]');
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3b9eff';
    new Chart(chartEl, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (ETB)',
          data: values,
          borderColor: accent,
          backgroundColor: 'rgba(59, 158, 255, 0.08)',
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointBackgroundColor: accent,
          pointBorderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#fff' : '#0c0f14',
          pointBorderWidth: 1,
          pointRadius: 3,
          pointHoverRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(24, 29, 39, 0.95)',
            borderColor: 'rgba(59, 158, 255, 0.25)',
            borderWidth: 1,
            titleFont: { family: 'Inter', size: 12 },
            bodyFont: { family: 'JetBrains Mono', size: 11 },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(120, 170, 255, 0.06)' },
            ticks: { color: '#8b95a8', font: { family: 'Inter', size: 10 } },
          },
          y: {
            grid: { color: 'rgba(120, 170, 255, 0.06)' },
            ticks: { color: '#8b95a8', font: { family: 'JetBrains Mono', size: 10 } },
            beginAtZero: true,
          },
        },
      },
    });
  }
});
