// invoice.js
/* (Updated for efficiency: Debounced calculations, better event delegation) */
(function () {
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function formatMoney(n) { return '$' + Number(n || 0).toFixed(2); }

  // Debounce utility
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  const DRAFT_KEY = 'invoicepro:draft';

  const clientsSeed = [
    { id: 'acme', name: 'Acme Corp', addr: '1 Acme Way, City' },
    { id: 'blue', name: 'Blue Ocean LLC', addr: '42 Blue St, City' },
    { id: 'sky', name: 'Skyline Builders', addr: '88 Sky Rd, City' }
  ];

  function loadClients(selectEl) {
    if (!selectEl) return clientsSeed.slice();

    const frag = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '— Select client —';
    frag.appendChild(placeholder);

    clientsSeed.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      opt.dataset.clientId = c.id;
      frag.appendChild(opt);
    });

    selectEl.textContent = '';
    selectEl.appendChild(frag);
    return clientsSeed.slice();
  }

  let itemRowsContainer;
  let clientSelectEl;
  let clientSearchInput;
  let suppressPersistence = false;

  function getItemRows() {
    return itemRowsContainer ? Array.from(itemRowsContainer.querySelectorAll('tr.item-row')) : [];
  }

  function parseAmount(value) {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) ? num : 0;
  }

  function ensureRowTotal(row) {
    if (!row) return 0;
    const qtyInput = row.querySelector('.qty');
    const priceInput = row.querySelector('.price');
    const qty = parseAmount(qtyInput?.value);
    const price = parseAmount(priceInput?.value);
    const totalCell = row.querySelector('.total');
    const lineTotal = qty * price;
    if (totalCell) totalCell.textContent = formatMoney(lineTotal);
    return lineTotal;
  }

  function addItem(data = {}) {
    if (!itemRowsContainer) return null;

    const tr = document.createElement('tr');
    tr.className = 'item-row';
    const qty = data.qty ?? 1;
    const price = data.price ?? 0;
    tr.innerHTML = `
      <td class="px-3 py-2"><input class="desc w-full border rounded px-2 py-1" placeholder="Item description" value="${escapeHtml(data.desc || '')}" /></td>
      <td class="px-3 py-2"><input type="number" class="qty w-full border rounded px-2 py-1" value="${qty}" min="0" /></td>
      <td class="px-3 py-2"><input class="unit w-full border rounded px-2 py-1" placeholder="unit" value="${escapeHtml(data.unit || '')}" /></td>
      <td class="px-3 py-2"><input type="number" step="0.01" class="price w-full border rounded px-2 py-1" value="${price}" min="0" /></td>
      <td class="px-3 py-2 text-gray-700 total">${formatMoney(qty * price)}</td>
      <td class="px-3 py-2 text-center"><button class="removeRow text-red-500 hover:text-red-700" type="button" aria-label="Remove item">✖</button></td>
    `;

    itemRowsContainer.appendChild(tr);
    ensureRowTotal(tr);
    calculateTotals();
    refreshPreview();
    saveDraft();
    return tr;
  }

  const debouncedCalc = debounce(() => {
    calculateTotals();
    refreshPreview();
    saveDraft();
  }, 300);

  function handleRowInput(event) {
    if (!event.target.matches('.qty, .price, .desc, .unit')) return;
    const row = event.target.closest('tr.item-row');
    if (row) {
      ensureRowTotal(row);
    }
    debouncedCalc();
  }

  function handleRowClick(event) {
    const trigger = event.target.closest('.removeRow');
    if (!trigger) return;
    const row = trigger.closest('tr.item-row');
    if (!row) return;
    row.remove();
    if (!getItemRows().length) {
      addItem({ qty: 1, price: 0, desc: '', unit: '' });
    } else {
      calculateTotals();
      refreshPreview();
      saveDraft();
    }
  }

  const totalsRefs = {
    subtotal: null,
    tax: null,
    discount: null,
    grandTotal: null
  };

  const previewRefs = {
    client: null,
    number: null,
    date: null,
    due: null,
    notes: null,
    items: null,
    subtotal: null,
    tax: null,
    total: null
  };

  function calculateTotals() {
    let subtotal = 0;
    getItemRows().forEach(row => {
      subtotal += ensureRowTotal(row);
    });
    const tax = subtotal * 0.10;
    const discount = 0;
    const grand = subtotal + tax - discount;
    if (totalsRefs.subtotal) totalsRefs.subtotal.textContent = formatMoney(subtotal);
    if (totalsRefs.tax) totalsRefs.tax.textContent = formatMoney(tax);
    if (totalsRefs.discount) totalsRefs.discount.textContent = formatMoney(discount);
    if (totalsRefs.grandTotal) totalsRefs.grandTotal.textContent = formatMoney(grand);
    updatePreviewSummary({ subtotal, tax, discount, grand });
  }

  function refreshPreview() {
    const selectedClient = clientSelectEl?.selectedOptions?.[0]?.textContent?.trim() || '';
    const typedClient = clientSearchInput?.value?.trim() || '';
    if (previewRefs.client) previewRefs.client.textContent = typedClient || selectedClient || '—';
    if (previewRefs.number) previewRefs.number.textContent = $('#invoiceNumber')?.value || '—';
    if (previewRefs.date) previewRefs.date.textContent = $('#invoiceDate')?.value || '—';
    if (previewRefs.due) previewRefs.due.textContent = $('#dueDate')?.value || '—';
    if (previewRefs.notes) previewRefs.notes.textContent = $('#notes')?.value || '';
    if (previewRefs.items) buildPreviewItems(previewRefs.items);
  }

  function saveDraft() {
    if (suppressPersistence) return;
    try {
      const payload = collectInvoicePayload();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to save draft', error);
    }
  }

  function filterClientOptions(term = '') {
    if (!clientSelectEl) return;
    const normalized = term.trim().toLowerCase();
    const options = Array.from(clientSelectEl.options);

    if (!normalized) {
      options.forEach(opt => {
        opt.hidden = false;
      });
      return;
    }

    let exactMatchValue = '';
    options.forEach(opt => {
      if (!opt.value) {
        opt.hidden = false;
        return;
      }
      const matches = opt.textContent.toLowerCase().includes(normalized);
      opt.hidden = !matches;
      if (matches && opt.textContent.toLowerCase() === normalized) {
        exactMatchValue = opt.value;
      }
    });

    if (exactMatchValue) {
      clientSelectEl.value = exactMatchValue;
    } else if (clientSelectEl.value && clientSelectEl.selectedOptions[0]?.hidden) {
      clientSelectEl.value = '';
    }
  }

  function loadDraft() {
    suppressPersistence = true;
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (!draft) return;
      const data = JSON.parse(draft);
      const invoiceNumber = $('#invoiceNumber');
      const invoiceDate = $('#invoiceDate');
      const dueDate = $('#dueDate');
      const notes = $('#notes');
      const storedClientName = data.client || '';
      const storedClientId = data.clientId || '';
      const storedClientSelect = data.clientSelectValue || '';
      const storedClientSearch = data.clientSearch ?? storedClientName;

      if (invoiceNumber) {
        invoiceNumber.value = data.invoiceNumber || '';
        invoiceNumber.setAttribute('value', invoiceNumber.value);
      }
      if (invoiceDate) invoiceDate.value = data.invoiceDate || '';
      if (dueDate) dueDate.value = data.dueDate || '';
      if (notes) notes.value = data.notes || '';
      if (clientSearchInput) {
        clientSearchInput.value = storedClientSearch || '';
      }
      if (clientSelectEl) {
        const options = Array.from(clientSelectEl.options);
        let matchedValue = '';
        if (storedClientId) {
          matchedValue = options.find(opt => opt.dataset.clientId === storedClientId)?.value || '';
        }
        if (!matchedValue && storedClientSelect) {
          matchedValue = options.find(opt => opt.value === storedClientSelect)?.value || '';
        }
        if (!matchedValue && storedClientName) {
          matchedValue = options.find(opt => opt.textContent === storedClientName)?.value || '';
        }
        clientSelectEl.value = matchedValue;
      }

      if (Array.isArray(data.rows)) {
        clearItemRows();
        data.rows.forEach(row => addItem(row));
      }

      if (!getItemRows().length) {
        addItem({ qty: 1, price: 0, desc: '', unit: '' });
      }

      filterClientOptions(clientSearchInput?.value || '');
      calculateTotals();
      refreshPreview();
    } catch (error) {
      console.warn('Unable to load draft', error);
    } finally {
      suppressPersistence = false;
    }
  }

  function collectInvoicePayload() {
    const rows = getItemRows().map(row => {
      const desc = row.querySelector('.desc')?.value || '';
      const qty = parseAmount(row.querySelector('.qty')?.value);
      const unit = row.querySelector('.unit')?.value || '';
      const price = parseAmount(row.querySelector('.price')?.value);
      return { desc, qty, unit, price };
    });

    const select = clientSelectEl || $('#clientSelect');
    const search = clientSearchInput || $('#clientSearch');
    const selectedOption = select?.selectedOptions?.[0];
    const typedClient = search?.value || '';
    const selectedName = selectedOption?.textContent || select?.value || '';

    return {
      client: (typedClient || selectedName || '').trim(),
      clientId: selectedOption?.dataset.clientId || '',
      clientSelectValue: select?.value || '',
      clientSearch: search?.value || '',
      invoiceNumber: $('#invoiceNumber')?.value || '',
      invoiceDate: $('#invoiceDate')?.value || '',
      dueDate: $('#dueDate')?.value || '',
      notes: $('#notes')?.value || '',
      rows
    };
  }

  function initInvoicePage() {
    itemRowsContainer = $('#itemRows');

    totalsRefs.subtotal = $('#subtotal');
    totalsRefs.tax = $('#tax');
    totalsRefs.discount = $('#discount');
    totalsRefs.grandTotal = $('#grandTotal');

    previewRefs.client = $('#pvClient');
    previewRefs.number = $('#pvNumber');
    previewRefs.date = $('#pvDate');
    previewRefs.due = $('#pvDue');
    previewRefs.notes = $('#pvNotes');
    previewRefs.items = $('#pvItems');
    previewRefs.subtotal = $('#pvSubtotal');
    previewRefs.tax = $('#pvTax');
    previewRefs.total = $('#pvTotal');

    clientSelectEl = $('#clientSelect');
    clientSearchInput = $('#clientSearch');
    loadClients(clientSelectEl);
    filterClientOptions(clientSearchInput?.value || '');

    if (itemRowsContainer && !getItemRows().length) {
      addItem({ qty: 1, price: 0, desc: '', unit: '' });
    }

    loadDraft();

    $('#addItemBtn')?.addEventListener('click', () => addItem({ qty: 1, price: 0, desc: '', unit: '' }));

    ['#invoiceNumber', '#invoiceDate', '#dueDate', '#notes'].forEach(sel => {
      const el = $(sel);
      if (!el) return;
      const eventName = el.tagName === 'SELECT' || el.type === 'date' ? 'change' : 'input';
      el.addEventListener(eventName, () => {
        refreshPreview();
        saveDraft();
      });
    });

    if (clientSelectEl) {
      clientSelectEl.addEventListener('change', () => {
        if (clientSearchInput) {
          clientSearchInput.value = clientSelectEl.selectedOptions[0]?.textContent || '';
        }
        filterClientOptions('');
        refreshPreview();
        saveDraft();
      });
    }

    if (clientSearchInput) {
      clientSearchInput.addEventListener('input', () => {
        filterClientOptions(clientSearchInput.value);
        if (!clientSearchInput.value.trim() && clientSelectEl) {
          clientSelectEl.value = '';
        }
        refreshPreview();
        saveDraft();
      });
    }

    if (itemRowsContainer) {
      itemRowsContainer.addEventListener('input', handleRowInput);
      itemRowsContainer.addEventListener('click', handleRowClick);
    }
    // Event bindings with debounced calc
    $all('#saveDraftBtn, #sendBtn, #downloadBtn, #previewPdfBtn').forEach(btn => btn?.addEventListener('click', e => {
      // Handlers
    }));
    // ... (rest)
    calculateTotals();
    refreshPreview();
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  function clearItemRows() {
    getItemRows().forEach(row => row.remove());
  }

  function buildPreviewItems(container) {
    if (!container) return;
    container.textContent = '';
    const frag = document.createDocumentFragment();
    getItemRows().forEach(row => {
      const desc = row.querySelector('.desc')?.value || '';
      const qty = parseAmount(row.querySelector('.qty')?.value);
      const unit = row.querySelector('.unit')?.value || '';
      const price = parseAmount(row.querySelector('.price')?.value);
      const total = qty * price;

      const li = document.createElement('tr');
      li.innerHTML = `
        <td class="px-2 py-1">${escapeHtml(desc)}</td>
        <td class="px-2 py-1 text-center">${qty}</td>
        <td class="px-2 py-1 text-center">${escapeHtml(unit)}</td>
        <td class="px-2 py-1 text-right">${formatMoney(price)}</td>
        <td class="px-2 py-1 text-right">${formatMoney(total)}</td>
      `;
      frag.appendChild(li);
    });
    container.appendChild(frag);
  }

  function updatePreviewSummary({ subtotal, tax, discount, grand }) {
    if (previewRefs.subtotal) previewRefs.subtotal.textContent = formatMoney(subtotal);
    if (previewRefs.tax) previewRefs.tax.textContent = formatMoney(tax);
    if (previewRefs.total) previewRefs.total.textContent = formatMoney(grand);
  }

  // Expose
  window.initInvoicePage = initInvoicePage;
  // ... other exposes

  document.addEventListener('DOMContentLoaded', initInvoicePage);
})();
