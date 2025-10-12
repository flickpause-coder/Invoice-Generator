/* assets/js/invoice.js
   Basic client-side invoice helpers compatible with the new create-invoice.html UI.
   Safe, dependency-free, and designed so you can later expand functions (send to server, real PDF, email, etc).
*/

(function () {
  // -------------------------
  // Utilities
  // -------------------------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function formatMoney(n) { return '$' + Number(n || 0).toFixed(2); }

  // -------------------------
  // DOM refs (IDs used by the HTML)
  // -------------------------
  const clientSelect = $('#clientSelect');
  const clientSearch = $('#clientSearch');
  const addClientBtn = $('#addClientBtn');
  const itemRows = $('#itemRows');
  const addItemBtn = $('#addItemBtn');
  const subtotalEl = $('#subtotal');
  const taxEl = $('#tax');
  const discountEl = $('#discount');
  const grandTotalEl = $('#grandTotal');
  const preview = { client: $('#pvClient'), number: $('#pvNumber'), date: $('#pvDate'), due: $('#pvDue'),
                    notes: $('#pvNotes'), pvItems: $('#pvItems'), pvSubtotal: $('#pvSubtotal'),
                    pvTax: $('#pvTax'), pvTotal: $('#pvTotal') };
  const invoiceNumberEl = $('#invoiceNumber');
  const invoiceDateEl = $('#invoiceDate');
  const dueDateEl = $('#dueDate');
  const notesEl = $('#notes');

  // Local storage key for drafts
  const DRAFT_KEY = 'invoicepro:draft';

  // -------------------------
  // loadClients(selectEl)
  // Populate client dropdown. Replace this with a server call later.
  // -------------------------
  function loadClients(selectEl) {
    // If your app already has clients data, replace this with fetch(...) to the server.
    const clients = [
      { id: 'acme', name: 'Acme Corp', addr: '1 Acme Way, City' },
      { id: 'blue', name: 'Blue Ocean LLC', addr: '42 Blue St, City' },
      { id: 'sky', name: 'Skyline Builders', addr: '88 Sky Rd, City' }
    ];
    if (!selectEl) return clients;
    selectEl.innerHTML = '<option value="">— Select client —</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name; // keep it simple: value is name
      opt.textContent = c.name;
      selectEl.appendChild(opt);
    });
  }

  // -------------------------
  // addItem(data) — appends a new item row (data optional)
  // -------------------------
  function addItem(data = {}) {
    const tr = document.createElement('tr');
    tr.className = 'item-row';
    tr.innerHTML = `
      <td class="px-3 py-2"><input class="desc w-full border rounded px-2 py-1" placeholder="Item description" value="${escapeHtml(data.desc||'')}" /></td>
      <td class="px-3 py-2"><input type="number" class="qty w-full border rounded px-2 py-1" value="${(data.qty!=null?data.qty:1)}" min="0" /></td>
      <td class="px-3 py-2"><input class="unit w-full border rounded px-2 py-1" placeholder="unit" value="${escapeHtml(data.unit||'')}" /></td>
      <td class="px-3 py-2"><input type="number" step="0.01" class="price w-full border rounded px-2 py-1" value="${(data.price!=null?data.price:0)}" min="0" /></td>
      <td class="px-3 py-2 text-gray-700 total">$0.00</td>
      <td class="px-3 py-2 text-center"><button class="removeRow text-red-500 hover:text-red-700">✖</button></td>
    `;
    itemRows.appendChild(tr);
    attachRowListeners(tr);
    calculateTotals();
    refreshPreview();
    return tr;
  }

  // -------------------------
  // attachRowListeners(row)
  // -------------------------
  function attachRowListeners(row) {
    $all('.qty, .price, .desc, .unit', row).forEach(el => {
      el.addEventListener('input', () => {
        calculateTotals();
        // small debounce for preview (not required but nicer)
        refreshPreview();
      });
    });
    const removeBtn = row.querySelector('.removeRow');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        row.remove();
        calculateTotals();
        refreshPreview();
      });
    }
  }

  // -------------------------
  // calculateTotals()
  // Recomputes line totals, subtotal, tax and grand total.
  // -------------------------
  function calculateTotals() {
    // compute subtotal digit-by-digit: iterate rows and sum line totals
    let subtotal = 0;
    $all('#itemRows tr').forEach(row => {
      const qty = Number(row.querySelector('.qty')?.value || 0);
      const price = Number(row.querySelector('.price')?.value || 0);
      const line = qty * price;
      const totalCell = row.querySelector('.total');
      if (totalCell) totalCell.textContent = formatMoney(line);
      // accumulate
      subtotal = subtotal + line;
    });

    // tax default 10% (you can adapt or expose UI)
    const tax = subtotal * 0.10;
    const discount = 0; // placeholder; you can expand
    const grand = subtotal + tax - discount;

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (taxEl) taxEl.textContent = formatMoney(tax);
    if (discountEl) discountEl.textContent = formatMoney(discount);
    if (grandTotalEl) grandTotalEl.textContent = formatMoney(grand);
  }

  // -------------------------
  // refreshPreview()
  // Copies form data into the preview panel
  // -------------------------
  function refreshPreview() {
    if (preview.client) preview.client.textContent = clientSelect?.value || clientSearch?.value || '—';
    if (preview.number) preview.number.textContent = invoiceNumberEl?.value || '—';
    if (preview.date) preview.date.textContent = invoiceDateEl?.value || '—';
    if (preview.due) preview.due.textContent = dueDateEl?.value || '—';
    if (preview.notes) preview.notes.textContent = notesEl?.value || '—';

    // build preview items
    if (preview.pvItems) {
      preview.pvItems.innerHTML = '';
      let subtotal = 0;
      $all('#itemRows tr').forEach(row => {
        const desc = row.querySelector('.desc')?.value || '';
        const qty = Number(row.querySelector('.qty')?.value || 0);
        const unit = row.querySelector('.unit')?.value || '';
        const price = Number(row.querySelector('.price')?.value || 0);
        const line = qty * price;
        subtotal = subtotal + line;
        const r = document.createElement('tr');
        r.innerHTML = `<td class="px-2 py-1">${escapeHtml(desc)}</td><td class="px-2 py-1 text-center">${qty}</td><td class="px-2 py-1 text-center">${escapeHtml(unit)}</td><td class="px-2 py-1 text-right">${formatMoney(price)}</td><td class="px-2 py-1 text-right">${formatMoney(line)}</td>`;
        preview.pvItems.appendChild(r);
      });
      if (preview.pvSubtotal) preview.pvSubtotal.textContent = formatMoney(subtotal);
      const tax = subtotal * 0.10;
      if (preview.pvTax) preview.pvTax.textContent = formatMoney(tax);
      if (preview.pvTotal) preview.pvTotal.textContent = formatMoney(subtotal + tax);
    }
  }

  // -------------------------
  // saveDraft()
  // Saves current invoice form to localStorage
  // -------------------------
  function saveDraft() {
    const rows = $all('#itemRows tr').map(row => ({
      desc: row.querySelector('.desc')?.value || '',
      qty: row.querySelector('.qty')?.value || '1',
      unit: row.querySelector('.unit')?.value || '',
      price: row.querySelector('.price')?.value || '0'
    }));
    const draft = {
      client: clientSelect?.value || clientSearch?.value || '',
      invoiceNumber: invoiceNumberEl?.value || '',
      invoiceDate: invoiceDateEl?.value || '',
      dueDate: dueDateEl?.value || '',
      notes: notesEl?.value || '',
      rows,
      savedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      alert('Draft saved locally.');
    } catch (e) {
      console.error('saveDraft error', e);
      alert('Could not save draft (browser storage error).');
    }
  }

  // -------------------------
  // loadDraft()
  // -------------------------
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft) return;
      // populate form
      if (clientSelect) clientSelect.value = draft.client || '';
      if (invoiceNumberEl) invoiceNumberEl.value = draft.invoiceNumber || '';
      if (invoiceDateEl) invoiceDateEl.value = draft.invoiceDate || '';
      if (dueDateEl) dueDateEl.value = draft.dueDate || '';
      if (notesEl) notesEl.value = draft.notes || '';
      // clear items and add back
      itemRows.innerHTML = '';
      (draft.rows || []).forEach(r => addItem({desc: r.desc, qty: r.qty, unit: r.unit, price: r.price}));
      calculateTotals();
      refreshPreview();
    } catch (e) {
      console.error('loadDraft error', e);
    }
  }

  // -------------------------
  // sendInvoice()
  // Placeholder - replace with real API call
  // -------------------------
  function sendInvoice() {
    // Collect payload
    const payload = collectInvoicePayload();
    // TODO: Replace with fetch('/api/invoices', { method: 'POST', body: JSON.stringify(payload) })
    console.log('Sending invoice (placeholder):', payload);
    alert('Pretend sending invoice to server (see console). Replace sendInvoice() with a real API call.');
  }

  // -------------------------
  // downloadInvoice()
  // Simple printable HTML popup; user can print/save as PDF from browser
  // -------------------------
  function downloadInvoice() {
    // create printable HTML
    const win = window.open('', '_blank');
    const html = printableHtml();
    win.document.open();
    win.document.write(html);
    win.document.close();
    // small delay to ensure content loads, then call print
    setTimeout(() => win.print(), 400);
  }

  // -------------------------
  // previewPDF()
  // same as download but opens print dialog
  // -------------------------
  function previewPDF() {
    downloadInvoice();
  }

  // -------------------------
  // sendInvoiceEmail()
  // Placeholder to simulate sending invoice via email
  // -------------------------
  function sendInvoiceEmail() {
    // Ideally you'd call your backend to send the email with invoice PDF attached
    const payload = collectInvoicePayload();
    console.log('Request to send invoice email (placeholder):', payload);
    alert('Pretend sending invoice by email (see console). Implement server endpoint to actually email.');
  }

  // -------------------------
  // markInvoicePaid() & duplicateInvoice()
  // -------------------------
  function markInvoicePaid() {
    alert('Marking invoice paid (placeholder). Implement server call to change status.');
  }
  function duplicateInvoice() {
    // simple duplication: copy current fields and create new invoice with same data + new invoice number
    const currentNumber = invoiceNumberEl?.value || '';
    const newNumber = currentNumber ? (currentNumber + '-COPY') : 'COPY-1';
    invoiceNumberEl.value = newNumber;
    saveDraft();
    alert('Invoice duplicated. New invoice number: ' + newNumber);
  }

  // -------------------------
  // collectInvoicePayload()
  // -------------------------
  function collectInvoicePayload() {
    const rows = $all('#itemRows tr').map(row => ({
      desc: row.querySelector('.desc')?.value || '',
      qty: Number(row.querySelector('.qty')?.value || 0),
      unit: row.querySelector('.unit')?.value || '',
      price: Number(row.querySelector('.price')?.value || 0),
      lineTotal: Number((Number(row.querySelector('.qty')?.value||0) * Number(row.querySelector('.price')?.value||0)).toFixed(2))
    }));
    // totals
    let subtotal = 0;
    rows.forEach(r => subtotal += r.lineTotal);
    const tax = Number((subtotal * 0.10).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    return {
      client: clientSelect?.value || clientSearch?.value || '',
      invoiceNumber: invoiceNumberEl?.value || '',
      invoiceDate: invoiceDateEl?.value || '',
      dueDate: dueDateEl?.value || '',
      notes: notesEl?.value || '',
      rows, subtotal, tax, total
    };
  }

  // -------------------------
  // printableHtml() - creates a simple print-friendly invoice
  // -------------------------
  function printableHtml() {
    const data = collectInvoicePayload();
    const rowsHtml = data.rows.map(r => `<tr><td style="padding:6px;border:1px solid #ddd">${escapeHtml(r.desc)}</td><td style="padding:6px;border:1px solid #ddd;text-align:center">${r.qty}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${formatMoney(r.price)}</td><td style="padding:6px;border:1px solid #ddd;text-align:right">${formatMoney(r.lineTotal)}</td></tr>`).join('');
    const html = `
      <html><head><title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#222}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}</style>
      </head><body>
      <h2>Invoice ${escapeHtml(data.invoiceNumber||'—')}</h2>
      <div><strong>Client:</strong> ${escapeHtml(data.client)}</div>
      <div><strong>Date:</strong> ${escapeHtml(data.invoiceDate)} &nbsp; <strong>Due:</strong> ${escapeHtml(data.dueDate)}</div>
      <br/>
      <table><thead><tr><th>Description</th><th style="width:60px">Qty</th><th style="width:120px">Price</th><th style="width:120px">Total</th></tr></thead><tbody>
      ${rowsHtml}
      </tbody></table>
      <div style="margin-top:12px;text-align:right">
        <div>Subtotal: ${formatMoney(data.subtotal)}</div>
        <div>Tax: ${formatMoney(data.tax)}</div>
        <div style="font-weight:700">Total: ${formatMoney(data.total)}</div>
      </div>
      <div style="margin-top:20px"><strong>Notes:</strong><br/>${escapeHtml(data.notes)}</div>
      </body></html>
    `;
    return html;
  }

  // -------------------------
  // attachSearch(inputEl)
  // optional: attaches a simple search handler
  // -------------------------
  function attachSearch(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) { if (clientSelect) clientSelect.selectedIndex = 0; return; }
      // try to match client by name
      const opt = Array.from(clientSelect.options).find(o => o.textContent.toLowerCase().includes(q));
      if (opt) clientSelect.value = opt.value;
    });
  }

  // -------------------------
  // initInvoicePage() — wire up event listeners on page load
  // -------------------------
  function initInvoicePage() {
    // load clients
    loadClients(clientSelect);

    // restore draft if exists
    loadDraft();

    // bind add item
    if (addItemBtn) addItemBtn.addEventListener('click', () => addItem());

    // bind save, send, download, preview
    $('#saveDraftBtn')?.addEventListener('click', saveDraft);
    $('#sendBtn')?.addEventListener('click', sendInvoice);
    $('#downloadBtn')?.addEventListener('click', downloadInvoice);
    $('#previewPdfBtn')?.addEventListener('click', previewPDF);
    $('#btnSendEmail')?.addEventListener('click', sendInvoiceEmail);
    $('#btnMarkPaid')?.addEventListener('click', markInvoicePaid);
    $('#btnDuplicate')?.addEventListener('click', duplicateInvoice);

    // client add button (simple prompt for now)
    if (addClientBtn) addClientBtn.addEventListener('click', () => {
      const name = prompt('New client name');
      if (!name) return;
      const opt = document.createElement('option'); opt.value = name; opt.textContent = name;
      clientSelect.appendChild(opt);
      clientSelect.value = name;
    });

    // enable search binding
    attachSearch($('#globalSearch'));
    attachSearch(clientSearch);

    // attach listeners to initial rows
    $all('#itemRows tr').forEach(attachRowListeners);

    // initial compute & preview
    calculateTotals();
    refreshPreview();
  }

  // -------------------------
  // small helpers
  // -------------------------
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // -------------------------
  // Expose functions for page / other scripts
  // -------------------------
  window.loadClients = loadClients;
  window.addItem = addItem;
  window.calculateTotals = calculateTotals;
  window.refreshPreview = refreshPreview;
  window.saveDraft = saveDraft;
  window.sendInvoice = sendInvoice;
  window.downloadInvoice = downloadInvoice;
  window.previewPDF = previewPDF;
  window.sendInvoiceEmail = sendInvoiceEmail;
  window.markInvoicePaid = markInvoicePaid;
  window.duplicateInvoice = duplicateInvoice;
  window.collectInvoicePayload = collectInvoicePayload;
  window.attachSearch = attachSearch;
  window.initInvoicePage = initInvoicePage;

  // Auto init on DOM ready if script is loaded at end of body
  document.addEventListener('DOMContentLoaded', initInvoicePage);

})();
