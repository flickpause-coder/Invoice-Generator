(function () {
  const SIDEBAR_URL = 'sidebar.html';
  const PLACEHOLDER_ID = 'main-sidebar';
  const HIGHLIGHT_CLASSES = [
    'bg-indigo-50',
    'text-indigo-600',
    'shadow-sm',
    'ring-1',
    'ring-indigo-100',
  ];

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
  }

  function buildFallbackMarkup() {
    return `
      <div data-sidebar-root class="hidden md:flex w-full max-w-[18.5rem] flex-col min-h-screen bg-white text-slate-700 border-r border-slate-200 shadow-sm">
        <div class="px-6 pt-10 pb-8 border-b border-slate-100">
          <a href="dashboard.html" class="flex items-center gap-3">
            <span class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-sky-500 text-white text-xl font-black tracking-tight shadow-lg shadow-indigo-300/50">
              IP
            </span>
            <span class="flex flex-col leading-tight">
              <span class="text-lg font-semibold text-slate-900">InvoicePro</span>
              <span class="text-xs uppercase tracking-[0.3em] text-slate-400">Workspace</span>
            </span>
          </a>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-1">
          <a href="dashboard.html" data-nav="dashboard" class="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-xl leading-none">🏠</span>
            <span class="transition-transform duration-200 group-hover:translate-x-0.5">Dashboard</span>
          </a>
          <a href="create-invoice.html" data-nav="create-invoice" class="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-xl leading-none">🧾</span>
            <span class="transition-transform duration-200 group-hover:translate-x-0.5">Create Invoice</span>
          </a>
          <a href="invoices.html" data-nav="invoices" class="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-xl leading-none">💼</span>
            <span class="transition-transform duration-200 group-hover:translate-x-0.5">Invoices</span>
          </a>
          <a href="clients.html" data-nav="clients" class="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-xl leading-none">👤</span>
            <span class="transition-transform duration-200 group-hover:translate-x-0.5">Clients</span>
          </a>
          <a href="reports.html" data-nav="reports" class="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-xl leading-none">📊</span>
            <span class="transition-transform duration-200 group-hover:translate-x-0.5">Reports</span>
          </a>
          <a href="settings.html" data-nav="settings" class="group flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-xl leading-none">⚙️</span>
            <span class="transition-transform duration-200 group-hover:translate-x-0.5">Settings</span>
          </a>
        </nav>
        <div class="mt-auto px-6 pt-6 pb-8 border-t border-slate-100">
          <button id="logout-button" class="logout-button inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
            <span class="text-base">↪</span>
            <span>Logout</span>
          </button>
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
