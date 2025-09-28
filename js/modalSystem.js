/**
 * InvoiceGen Modal System
 * Handles modal dialogs for viewing, editing, and creating invoices and clients
 */

class ModalSystem {
    constructor() {
        this.currentModal = null;
        this.init();
    }

    init() {
        this.createModalContainer();
        this.setupEventListeners();
    }

    createModalContainer() {
        // Create modal container if it doesn't exist
        if (!document.getElementById('modal-container')) {
            const modalContainer = document.createElement('div');
            modalContainer.id = 'modal-container';
            modalContainer.className = 'fixed inset-0 z-50 hidden';
            document.body.appendChild(modalContainer);
        }
    }

    setupEventListeners() {
        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal();
            }
        });
    }

    showModal(content) {
        const container = document.getElementById('modal-container');
        container.innerHTML = `
            <div class="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div class="modal-content bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
                    ${content}
                </div>
            </div>
        `;
        container.classList.remove('hidden');
        this.currentModal = container;
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const container = document.getElementById('modal-container');
        container.classList.add('hidden');
        container.innerHTML = '';
        this.currentModal = null;
        document.body.style.overflow = '';
    }

    // Invoice Modals
    showViewInvoiceModal(invoiceId) {
        const invoice = window.dataStore.getInvoice(invoiceId);
        const client = invoice.clientId ? window.dataStore.getClient(invoice.clientId) : null;

        if (!invoice) {
            alert('Invoice not found');
            return;
        }

        const content = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Invoice ${invoice.id}</h2>
                    <div class="flex space-x-2">
                        <button onclick="window.pdfGenerator.previewInvoice(${JSON.stringify(invoice).replace(/"/g, '&quot;')}, ${client ? JSON.stringify(client).replace(/"/g, '&quot;') : 'null'})" 
                                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-eye mr-2"></i>Preview
                        </button>
                        <button onclick="window.pdfGenerator.generateInvoicePDF(${JSON.stringify(invoice).replace(/"/g, '&quot;')}, ${client ? JSON.stringify(client).replace(/"/g, '&quot;') : 'null'})" 
                                class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                            <i class="fas fa-download mr-2"></i>Download PDF
                        </button>
                        <button onclick="window.modalSystem.showEditInvoiceModal('${invoice.id}')" 
                                class="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700">
                            <i class="fas fa-edit mr-2"></i>Edit
                        </button>
                        <button onclick="window.modalSystem.closeModal()" 
                                class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            <i class="fas fa-times mr-2"></i>Close
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-900 mb-3">Invoice Details</h3>
                        <div class="space-y-2">
                            <div><span class="font-medium">Invoice #:</span> ${invoice.id}</div>
                            <div><span class="font-medium">Date:</span> ${this.formatDate(invoice.date)}</div>
                            <div><span class="font-medium">Due Date:</span> ${this.formatDate(invoice.dueDate)}</div>
                            <div><span class="font-medium">Status:</span> 
                                <span class="status-badge status-${invoice.status}">${this.capitalizeFirst(invoice.status)}</span>
                            </div>
                            <div><span class="font-medium">Description:</span> ${invoice.description || 'N/A'}</div>
                        </div>
                    </div>

                    ${client ? `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-900 mb-3">Client Information</h3>
                        <div class="space-y-2">
                            <div><span class="font-medium">Name:</span> ${client.name}</div>
                            <div><span class="font-medium">Company:</span> ${client.company}</div>
                            <div><span class="font-medium">Email:</span> ${client.email}</div>
                            <div><span class="font-medium">Phone:</span> ${client.phone}</div>
                            <div><span class="font-medium">Address:</span> ${client.address}</div>
                        </div>
                    </div>
                    ` : `
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-900 mb-3">Client Information</h3>
                        <div class="text-gray-500">No client linked to this invoice</div>
                    </div>
                    `}
                </div>

                <div class="mb-6">
                    <h3 class="font-semibold text-gray-900 mb-3">Items</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${invoice.items.map(item => `
                                    <tr>
                                        <td class="px-6 py-4 text-sm text-gray-900">${item.description}</td>
                                        <td class="px-6 py-4 text-sm text-gray-900">${item.quantity}</td>
                                        <td class="px-6 py-4 text-sm text-gray-900">$${item.rate.toFixed(2)}</td>
                                        <td class="px-6 py-4 text-sm text-gray-900">$${item.amount.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="flex justify-end">
                    <div class="w-64">
                        <div class="flex justify-between py-2">
                            <span class="font-medium">Subtotal:</span>
                            <span>$${invoice.subtotal.toFixed(2)}</span>
                        </div>
                        ${invoice.tax > 0 ? `
                        <div class="flex justify-between py-2">
                            <span class="font-medium">Tax:</span>
                            <span>$${invoice.tax.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        <div class="flex justify-between py-2 border-t border-gray-200 font-bold text-lg">
                            <span>Total:</span>
                            <span>$${invoice.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.showModal(content);
    }

    showEditInvoiceModal(invoiceId = null) {
        const invoice = invoiceId ? window.dataStore.getInvoice(invoiceId) : null;
        const clients = window.dataStore.getClients();
        const isEdit = !!invoice;

        const content = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">${isEdit ? 'Edit' : 'Create'} Invoice</h2>
                    <button onclick="window.modalSystem.closeModal()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <form id="invoice-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Client</label>
                            <select id="client-select" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Select a client</option>
                                ${clients.map(client => `
                                    <option value="${client.id}" ${invoice && invoice.clientId === client.id ? 'selected' : ''}>
                                        ${client.name} - ${client.company}
                                    </option>
                                `).join('')}
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="status-select" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="draft" ${invoice && invoice.status === 'draft' ? 'selected' : ''}>Draft</option>
                                <option value="sent" ${invoice && invoice.status === 'sent' ? 'selected' : ''}>Sent</option>
                                <option value="paid" ${invoice && invoice.status === 'paid' ? 'selected' : ''}>Paid</option>
                                <option value="overdue" ${invoice && invoice.status === 'overdue' ? 'selected' : ''}>Overdue</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
                            <input type="date" id="date-input" value="${invoice ? invoice.date : new Date().toISOString().split('T')[0]}" 
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                            <input type="date" id="due-date-input" value="${invoice ? invoice.dueDate : ''}" 
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <input type="text" id="description-input" value="${invoice ? invoice.description || '' : ''}" 
                               placeholder="Brief description of the invoice"
                               class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-gray-900">Items</h3>
                            <button type="button" onclick="window.modalSystem.addInvoiceItem()" 
                                    class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                <i class="fas fa-plus mr-2"></i>Add Item
                            </button>
                        </div>
                        
                        <div id="items-container">
                            ${invoice && invoice.items ? invoice.items.map((item, index) => this.createItemRow(item, index)).join('') : this.createItemRow()}
                        </div>
                    </div>

                    <div class="flex justify-between items-center pt-6 border-t border-gray-200">
                        <div class="text-right">
                            <div class="text-lg font-semibold">Total: $<span id="total-amount">0.00</span></div>
                        </div>
                        <div class="flex space-x-4">
                            <button type="button" onclick="window.modalSystem.closeModal()" 
                                    class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
                                Cancel
                            </button>
                            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                                ${isEdit ? 'Update' : 'Create'} Invoice
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        this.showModal(content);
        this.setupInvoiceForm(invoice);
    }

    createItemRow(item = null, index = 0) {
        return `
            <div class="item-row grid grid-cols-12 gap-4 mb-4 items-end" data-index="${index}">
                <div class="col-span-5">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" class="item-description w-full border border-gray-300 rounded-lg px-3 py-2" 
                           value="${item ? item.description : ''}" placeholder="Item description">
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" class="item-quantity w-full border border-gray-300 rounded-lg px-3 py-2" 
                           value="${item ? item.quantity : 1}" min="1">
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Rate</label>
                    <input type="number" class="item-rate w-full border border-gray-300 rounded-lg px-3 py-2" 
                           value="${item ? item.rate : 0}" min="0" step="0.01">
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="number" class="item-amount w-full border border-gray-300 rounded-lg px-3 py-2" 
                           value="${item ? item.amount : 0}" readonly>
                </div>
                <div class="col-span-1">
                    <button type="button" onclick="window.modalSystem.removeInvoiceItem(this)" 
                            class="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    setupInvoiceForm(invoice) {
        const form = document.getElementById('invoice-form');
        
        // Calculate totals when items change
        const updateTotals = () => {
            let total = 0;
            document.querySelectorAll('.item-row').forEach(row => {
                const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
                const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
                const amount = quantity * rate;
                row.querySelector('.item-amount').value = amount.toFixed(2);
                total += amount;
            });
            document.getElementById('total-amount').textContent = total.toFixed(2);
        };

        // Add event listeners for calculation
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-rate')) {
                updateTotals();
            }
        });

        // Initial calculation
        updateTotals();

        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInvoice(invoice ? invoice.id : null);
        });
    }

    addInvoiceItem() {
        const container = document.getElementById('items-container');
        const index = container.children.length;
        container.insertAdjacentHTML('beforeend', this.createItemRow(null, index));
    }

    removeInvoiceItem(button) {
        const row = button.closest('.item-row');
        row.remove();
        // Recalculate totals
        this.updateTotals();
    }

    updateTotals() {
        let total = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
            const amount = quantity * rate;
            row.querySelector('.item-amount').value = amount.toFixed(2);
            total += amount;
        });
        document.getElementById('total-amount').textContent = total.toFixed(2);
    }

    saveInvoice(invoiceId) {
        const form = document.getElementById('invoice-form');
        const formData = new FormData(form);
        
        // Collect items
        const items = [];
        document.querySelectorAll('.item-row').forEach(row => {
            const description = row.querySelector('.item-description').value;
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
            const amount = quantity * rate;
            
            if (description && quantity > 0) {
                items.push({ description, quantity, rate, amount });
            }
        });

        if (items.length === 0) {
            alert('Please add at least one item to the invoice.');
            return;
        }

        const clientId = document.getElementById('client-select').value;
        const client = clientId ? window.dataStore.getClient(clientId) : null;
        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

        const invoiceData = {
            clientId: clientId || null,
            clientName: client ? client.company : 'No Client',
            description: document.getElementById('description-input').value,
            date: document.getElementById('date-input').value,
            dueDate: document.getElementById('due-date-input').value,
            status: document.getElementById('status-select').value,
            items: items,
            subtotal: subtotal,
            tax: 0, // Can be extended later
            total: subtotal
        };

        try {
            if (invoiceId) {
                window.dataStore.updateInvoice(invoiceId, invoiceData);
                alert('Invoice updated successfully!');
            } else {
                window.dataStore.createInvoice(invoiceData);
                alert('Invoice created successfully!');
            }
            
            this.closeModal();
            // Refresh the page to show updated data
            window.location.reload();
        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Error saving invoice. Please try again.');
        }
    }

    // Client Modals
    showViewClientModal(clientId) {
        const client = window.dataStore.getClient(clientId);
        const invoices = window.dataStore.getInvoices().filter(inv => inv.clientId === clientId);

        if (!client) {
            alert('Client not found');
            return;
        }

        const content = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">${client.name}</h2>
                    <div class="flex space-x-2">
                        <button onclick="window.modalSystem.showEditClientModal('${client.id}')" 
                                class="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700">
                            <i class="fas fa-edit mr-2"></i>Edit
                        </button>
                        <button onclick="window.modalSystem.closeModal()" 
                                class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
                            <i class="fas fa-times mr-2"></i>Close
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-900 mb-3">Contact Information</h3>
                        <div class="space-y-2">
                            <div><span class="font-medium">Name:</span> ${client.name}</div>
                            <div><span class="font-medium">Company:</span> ${client.company}</div>
                            <div><span class="font-medium">Email:</span> ${client.email}</div>
                            <div><span class="font-medium">Phone:</span> ${client.phone}</div>
                            <div><span class="font-medium">Status:</span> 
                                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                    ${this.capitalizeFirst(client.status)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-gray-900 mb-3">Address</h3>
                        <div>${client.address}</div>
                    </div>
                </div>

                <div>
                    <h3 class="font-semibold text-gray-900 mb-3">Invoice History (${invoices.length})</h3>
                    ${invoices.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-50">
                                    <tr>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200">
                                    ${invoices.map(invoice => `
                                        <tr>
                                            <td class="px-6 py-4 text-sm font-medium text-gray-900">${invoice.id}</td>
                                            <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(invoice.date)}</td>
                                            <td class="px-6 py-4 text-sm text-gray-900">$${invoice.total.toFixed(2)}</td>
                                            <td class="px-6 py-4 text-sm">
                                                <span class="status-badge status-${invoice.status}">${this.capitalizeFirst(invoice.status)}</span>
                                            </td>
                                            <td class="px-6 py-4 text-sm">
                                                <button onclick="window.modalSystem.showViewInvoiceModal('${invoice.id}')" 
                                                        class="text-blue-600 hover:text-blue-900">View</button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="text-gray-500 text-center py-8">No invoices found for this client</div>
                    `}
                </div>
            </div>
        `;

        this.showModal(content);
    }

    showEditClientModal(clientId = null) {
        const client = clientId ? window.dataStore.getClient(clientId) : null;
        const isEdit = !!client;

        const content = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">${isEdit ? 'Edit' : 'Add'} Client</h2>
                    <button onclick="window.modalSystem.closeModal()" 
                            class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <form id="client-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                            <input type="text" id="name-input" value="${client ? client.name : ''}" required
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Company *</label>
                            <input type="text" id="company-input" value="${client ? client.company : ''}" required
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input type="email" id="email-input" value="${client ? client.email : ''}" required
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input type="tel" id="phone-input" value="${client ? client.phone : ''}"
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select id="status-input" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="active" ${client && client.status === 'active' ? 'selected' : ''}>Active</option>
                                <option value="inactive" ${client && client.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea id="address-input" rows="3" 
                                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${client ? client.address : ''}</textarea>
                    </div>

                    <div class="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                        <button type="button" onclick="window.modalSystem.closeModal()" 
                                class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                            ${isEdit ? 'Update' : 'Create'} Client
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.showModal(content);
        this.setupClientForm(client);
    }

    setupClientForm(client) {
        const form = document.getElementById('client-form');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveClient(client ? client.id : null);
        });
    }

    saveClient(clientId) {
        const clientData = {
            name: document.getElementById('name-input').value,
            company: document.getElementById('company-input').value,
            email: document.getElementById('email-input').value,
            phone: document.getElementById('phone-input').value,
            address: document.getElementById('address-input').value,
            status: document.getElementById('status-input').value
        };

        // Validation
        if (!clientData.name || !clientData.company || !clientData.email) {
            alert('Please fill in all required fields (Name, Company, Email).');
            return;
        }

        try {
            if (clientId) {
                window.dataStore.updateClient(clientId, clientData);
                alert('Client updated successfully!');
            } else {
                window.dataStore.createClient(clientData);
                alert('Client created successfully!');
            }
            
            this.closeModal();
            // Refresh the page to show updated data
            window.location.reload();
        } catch (error) {
            console.error('Error saving client:', error);
            alert('Error saving client. Please try again.');
        }
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Create global instance
window.modalSystem = new ModalSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalSystem;
}
