(function () {
  const SIDEBAR_URL = 'sidebar.html';
  const PLACEHOLDER_ID = 'main-sidebar';
  const HIGHLIGHT_CLASSES = ['active-link'];
  const HIGHLIGHT_CLASSES = ['bg-indigo-50', 'text-indigo-700', 'font-semibold'];

  const state = {
    loaded: false,
  };

  function getNavKey() {
    const placeholder = document.getElementById(PLACEHOLDER_ID);
    if (placeholder && placeholder.dataset.activeNav) {
      return placeholder.dataset.activeNav;
    }
    if (document.body && document.body.dataset && document.body.dataset.activeNav) {
      return document.body.dataset.activeNav;
    }
    const fileName = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (!fileName || fileName === 'index.html') {
      return 'dashboard';
    }
    return fileName.replace(/\.html?$/, '') || 'dashboard';
  }

  function handleLogout(event) {
    if (event) {
      event.preventDefault();
    }
    if (confirm('Are you sure you want to log out?')) {
      alert('Logging out...');
      window.location.href = 'login.html';
    }
  }

  function attachLogoutHandlers(root) {
    const buttons = new Set([
      ...root.querySelectorAll('.logout-button'),
      ...document.querySelectorAll('.logout-button'),
    ]);

    buttons.forEach((button) => {
      if (!button.dataset.logoutBound) {
        button.addEventListener('click', handleLogout);
        button.dataset.logoutBound = 'true';
      }
    });
  }

  function highlightActiveLink(root, navKey) {
    const links = root.querySelectorAll('[data-nav]');
    links.forEach((link) => {
      HIGHLIGHT_CLASSES.forEach((cls) => link.classList.remove(cls));
      link.removeAttribute('aria-current');
    });

    const activeLink = root.querySelector(`[data-nav="${navKey}"]`) || root.querySelector(`a[href$="${navKey}.html"]`);
    if (!activeLink) {
      return;
    }

    HIGHLIGHT_CLASSES.forEach((cls) => activeLink.classList.add(cls));
    activeLink.setAttribute('aria-current', 'page');
    activeLink.classList.remove('hover:bg-gray-100');
  }

  function buildFallbackMarkup() {
    return `
      <div data-sidebar-root class="sidebar-shell hidden md:flex w-full max-w-[19.5rem] flex-col min-h-screen text-slate-100">
        <div class="sidebar-brand">
          <a href="dashboard.html" class="flex items-center gap-4">
            <span class="sidebar-brand-badge">
              <svg aria-hidden="true" viewBox="0 0 56 56" class="h-10 w-10 text-slate-950">
                <defs>
                  <linearGradient id="invoicepro-logo" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="rgba(15,23,42,0.65)" />
                    <stop offset="100%" stop-color="rgba(15,23,42,0.9)" />
                  </linearGradient>
                </defs>
                <path fill="url(#invoicepro-logo)" d="M16 12h14c6.5 0 11 4.1 11 10.2 0 5.8-4.3 9.8-10.7 9.8H22v11h-6V12Zm6 6v7h6.1c2.4 0 4-1.5 4-3.6s-1.6-3.4-4-3.4H22Zm19-6h6v28h-6V12Z" />
              </svg>
              <span class="sr-only">InvoicePro</span>
            </span>
            <span class="flex flex-col leading-tight">
              <span class="text-[1.45rem] font-semibold tracking-tight text-white">InvoicePro</span>
              <span class="text-xs uppercase tracking-[0.55em] text-sky-300/80">Command Center</span>
            </span>
          </a>
        </div>
        <nav class="flex-1" aria-label="Primary navigation">
          <a href="dashboard.html" data-nav="dashboard">
            <span class="icon">🏠</span>
            <span>Dashboard</span>
          </a>
          <a href="create-invoice.html" data-nav="create-invoice">
            <span class="icon">🧾</span>
            <span>Create Invoice</span>
          </a>
          <a href="invoices.html" data-nav="invoices">
            <span class="icon">💼</span>
            <span>Invoices</span>
          </a>
          <a href="clients.html" data-nav="clients">
            <span class="icon">👤</span>
            <span>Clients</span>
          </a>
          <a href="reports.html" data-nav="reports">
            <span class="icon">📊</span>
            <span>Reports</span>
          </a>
          <a href="settings.html" data-nav="settings">
            <span class="icon">⚙️</span>
            <span>Settings</span>
          </a>
        </nav>
        <div class="sidebar-footer">
          <button type="button" id="logout-button" class="logout-button">
            <span class="text-lg">↪</span>
            <span>Logout</span>
          </button>
      <div data-sidebar-root class="w-64 bg-white shadow-md hidden md:flex flex-col">
        <div class="px-6 py-4 border-b">
          <a href="dashboard.html">
            <h1 class="text-xl font-bold text-indigo-600">Invoice<span class="text-gray-900">Pro</span></h1>
          </a>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-2">
          <a href="dashboard.html" data-nav="dashboard" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">🏠 Dashboard</a>
          <a href="create-invoice.html" data-nav="create-invoice" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">🧾 Create Invoice</a>
          <a href="invoices.html" data-nav="invoices" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">💼 Invoices</a>
          <a href="clients.html" data-nav="clients" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">👤 Clients</a>
          <a href="reports.html" data-nav="reports" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">📊 Reports</a>
          <a href="settings.html" data-nav="settings" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100">⚙️ Settings</a>
        </nav>
        <div class="p-4 border-t">
          <button id="logout-button" class="logout-button w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition">Logout</button>
        </div>
      </div>
    `;
  }

  function finalizeSidebar(root, navKey) {
    highlightActiveLink(root, navKey);
    attachLogoutHandlers(root);
    state.loaded = true;

    const event = new CustomEvent('sidebar:loaded', {
      detail: {
        root,
        activeNav: navKey,
      },
    });
    document.dispatchEvent(event);
  }

  function injectSidebar(placeholder, html, navKey) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();

    const sidebarContent = template.content.querySelector('[data-sidebar-root]') || template.content.firstElementChild;

    placeholder.innerHTML = '';
    if (sidebarContent) {
      placeholder.appendChild(sidebarContent.cloneNode(true));
    } else {
      placeholder.innerHTML = html;
    }

    finalizeSidebar(placeholder, navKey);
  }

  function loadSidebar() {
    const placeholder = document.getElementById(PLACEHOLDER_ID);
    if (!placeholder) {
      return Promise.resolve(null);
    }

    const navKey = getNavKey();

    return fetch(SIDEBAR_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch sidebar: ${response.status}`);
        }
        return response.text();
      })
      .then((html) => {
        injectSidebar(placeholder, html, navKey);
        return placeholder;
      })
      .catch((error) => {
        console.error('Sidebar load failed:', error);
        placeholder.innerHTML = buildFallbackMarkup();
        finalizeSidebar(placeholder, navKey);
        return placeholder;
      });
  }

  if (document.getElementById(PLACEHOLDER_ID)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadSidebar, { once: true });
    } else {
      loadSidebar();
    }
  }

  window.Sidebar = Object.freeze({
    loadSidebar,
    isLoaded: () => state.loaded,
  });
})();

