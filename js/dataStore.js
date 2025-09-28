
/**
 * InvoiceGen Data Store
 * Centralized data management system using LocalStorage
 * Handles CRUD operations for invoices, clients, and settings
 * Enhanced with Payment Tracking & Status Management
 */

class DataStore {
    constructor() {
        this.storageKeys = {
            invoices: 'invoiceGen_invoices',
            clients: 'invoiceGen_clients',
            settings: 'invoiceGen_settings',
            user: 'invoiceGen_user'
        };
        
        // Invoice status workflow
        this.statusWorkflow = {
            draft: ['sent', 'paid'],
            sent: ['paid', 'overdue', 'draft'],
            paid: ['sent'], // Allow reverting if needed
            overdue: ['paid', 'sent']
        };
        
        this.init();
    }

    init() {
        // Initialize with sample data if storage is empty
        if (!this.getInvoices().length) {
            this.initializeSampleData();
        }
        
        // Check for overdue invoices on initialization
        this.updateOverdueInvoices();
    }

    // Generic storage methods
    setItem(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getItem(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // Invoice CRUD operations
    getInvoices() {
        return this.getItem(this.storageKeys.invoices) || [];
    }

    getInvoice(invoiceId) {
        const invoices = this.getInvoices();
        return invoices.find(invoice => invoice.id === invoiceId);
    }

    createInvoice(invoiceData) {
        const invoices = this.getInvoices();
        const newInvoice = {
            id: this.generateId('INV'),
            ...invoiceData,
            status: invoiceData.status || 'draft',
            paymentHistory: [],
            paidAmount: 0,
            remainingAmount: invoiceData.total || 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        invoices.push(newInvoice);
        this.setItem(this.storageKeys.invoices, invoices);
        return newInvoice;
    }

    updateInvoice(invoiceId, updateData) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(invoice => invoice.id === invoiceId);
        
        if (index !== -1) {
            const currentInvoice = invoices[index];
            
            // Handle status transitions
            if (updateData.status && updateData.status !== currentInvoice.status) {
                if (!this.isValidStatusTransition(currentInvoice.status, updateData.status)) {
                    throw new Error(`Invalid status transition from ${currentInvoice.status} to ${updateData.status}`);
                }
                
                // Add status change to history
                if (!currentInvoice.statusHistory) {
                    currentInvoice.statusHistory = [];
                }
                currentInvoice.statusHistory.push({
                    from: currentInvoice.status,
                    to: updateData.status,
                    timestamp: new Date().toISOString(),
                    note: updateData.statusNote || ''
                });
            }
            
            invoices[index] = {
                ...currentInvoice,
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            
            // Recalculate remaining amount if total changed
            if (updateData.total !== undefined) {
                invoices[index].remainingAmount = updateData.total - (invoices[index].paidAmount || 0);
            }
            
            this.setItem(this.storageKeys.invoices, invoices);
            return invoices[index];
        }
        return null;
    }

    deleteInvoice(invoiceId) {
        const invoices = this.getInvoices();
        const filteredInvoices = invoices.filter(invoice => invoice.id !== invoiceId);
        
        if (filteredInvoices.length !== invoices.length) {
            this.setItem(this.storageKeys.invoices, filteredInvoices);
            return true;
        }
        return false;
    }

    // Payment Management
    addPayment(invoiceId, paymentData) {
        const invoice = this.getInvoice(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const payment = {
            id: this.generateId('PAY'),
            amount: parseFloat(paymentData.amount),
            date: paymentData.date || new Date().toISOString().split('T')[0],
            method: paymentData.method || 'bank_transfer',
            reference: paymentData.reference || '',
            note: paymentData.note || '',
            timestamp: new Date().toISOString()
        };

        // Validate payment amount
        if (payment.amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
        if (newPaidAmount > invoice.total) {
            throw new Error('Payment amount exceeds invoice total');
        }

        // Add payment to history
        if (!invoice.paymentHistory) {
            invoice.paymentHistory = [];
        }
        invoice.paymentHistory.push(payment);

        // Update payment amounts
        const updateData = {
            paidAmount: newPaidAmount,
            remainingAmount: invoice.total - newPaidAmount,
            lastPaymentDate: payment.date
        };

        // Update status based on payment
        if (newPaidAmount >= invoice.total) {
            updateData.status = 'paid';
            updateData.paidDate = payment.date;
        } else if (invoice.status === 'draft') {
            updateData.status = 'sent'; // Partial payment moves from draft to sent
        }

        return this.updateInvoice(invoiceId, updateData);
    }

    removePayment(invoiceId, paymentId) {
        const invoice = this.getInvoice(invoiceId);
        if (!invoice || !invoice.paymentHistory) {
            throw new Error('Invoice or payment not found');
        }

        const paymentIndex = invoice.paymentHistory.findIndex(p => p.id === paymentId);
        if (paymentIndex === -1) {
            throw new Error('Payment not found');
        }

        const payment = invoice.paymentHistory[paymentIndex];
        invoice.paymentHistory.splice(paymentIndex, 1);

        // Recalculate amounts
        const newPaidAmount = (invoice.paidAmount || 0) - payment.amount;
        const updateData = {
            paidAmount: Math.max(0, newPaidAmount),
            remainingAmount: invoice.total - Math.max(0, newPaidAmount)
        };

        // Update status if fully paid becomes partially paid
        if (invoice.status === 'paid' && newPaidAmount < invoice.total) {
            updateData.status = 'sent';
            delete updateData.paidDate;
        }

        return this.updateInvoice(invoiceId, updateData);
    }

    // Status Management
    isValidStatusTransition(fromStatus, toStatus) {
        if (!this.statusWorkflow[fromStatus]) {
            return false;
        }
        return this.statusWorkflow[fromStatus].includes(toStatus);
    }

    updateInvoiceStatus(invoiceId, newStatus, note = '') {
        const invoice = this.getInvoice(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        if (!this.isValidStatusTransition(invoice.status, newStatus)) {
            throw new Error(`Cannot change status from ${invoice.status} to ${newStatus}`);
        }

        return this.updateInvoice(invoiceId, {
            status: newStatus,
            statusNote: note
        });
    }

    // Overdue Detection
    updateOverdueInvoices() {
        const invoices = this.getInvoices();
        const today = new Date();
        let updated = false;

        invoices.forEach(invoice => {
            if (invoice.status === 'sent' && invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                if (today > dueDate) {
                    invoice.status = 'overdue';
                    invoice.overdueDate = today.toISOString().split('T')[0];
                    invoice.overdueDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
                    
                    // Add to status history
                    if (!invoice.statusHistory) {
                        invoice.statusHistory = [];
                    }
                    invoice.statusHistory.push({
                        from: 'sent',
                        to: 'overdue',
                        timestamp: new Date().toISOString(),
                        note: 'Automatically marked overdue'
                    });
                    
                    updated = true;
                }
            }
        });

        if (updated) {
            this.setItem(this.storageKeys.invoices, invoices);
        }

        return updated;
    }

    getOverdueInvoices() {
        return this.getInvoices().filter(invoice => invoice.status === 'overdue');
    }

    // Client CRUD operations
    getClients() {
        return this.getItem(this.storageKeys.clients) || [];
    }

    getClient(clientId) {
        const clients = this.getClients();
        return clients.find(client => client.id === clientId);
    }

    createClient(clientData) {
        const clients = this.getClients();
        const newClient = {
            id: this.generateId('CLI'),
            ...clientData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        clients.push(newClient);
        this.setItem(this.storageKeys.clients, clients);
        return newClient;
    }

    updateClient(clientId, updateData) {
        const clients = this.getClients();
        const index = clients.findIndex(client => client.id === clientId);
        
        if (index !== -1) {
            clients[index] = {
                ...clients[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
            this.setItem(this.storageKeys.clients, clients);
            return clients[index];
        }
        return null;
    }

    deleteClient(clientId) {
        const clients = this.getClients();
        const filteredClients = clients.filter(client => client.id !== clientId);
        
        if (filteredClients.length !== clients.length) {
            this.setItem(this.storageKeys.clients, filteredClients);
            return true;
        }
        return false;
    }

    // Utility methods
    generateId(prefix = '') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `${prefix}-${timestamp}-${random}`;
    }

    // Search and filter methods
    searchInvoices(query, filters = {}) {
        let invoices = this.getInvoices();
        
        // Text search
        if (query) {
            const searchTerm = query.toLowerCase();
            invoices = invoices.filter(invoice => 
                invoice.id.toLowerCase().includes(searchTerm) ||
                invoice.clientName?.toLowerCase().includes(searchTerm) ||
                invoice.description?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Status filter
        if (filters.status) {
            invoices = invoices.filter(invoice => invoice.status === filters.status);
        }
        
        // Payment status filter
        if (filters.paymentStatus) {
            invoices = invoices.filter(invoice => {
                switch (filters.paymentStatus) {
                    case 'fully_paid':
                        return invoice.status === 'paid';
                    case 'partially_paid':
                        return invoice.paidAmount > 0 && invoice.paidAmount < invoice.total;
                    case 'unpaid':
                        return (invoice.paidAmount || 0) === 0;
                    default:
                        return true;
                }
            });
        }
        
        // Date range filter
        if (filters.dateFrom) {
            invoices = invoices.filter(invoice => 
                new Date(invoice.date) >= new Date(filters.dateFrom)
            );
        }
        
        if (filters.dateTo) {
            invoices = invoices.filter(invoice => 
                new Date(invoice.date) <= new Date(filters.dateTo)
            );
        }
        
        return invoices;
    }

    searchClients(query, filters = {}) {
        let clients = this.getClients();
        
        // Text search
        if (query) {
            const searchTerm = query.toLowerCase();
            clients = clients.filter(client => 
                client.name?.toLowerCase().includes(searchTerm) ||
                client.company?.toLowerCase().includes(searchTerm) ||
                client.email?.toLowerCase().includes(searchTerm)
            );
        }
        
        // Status filter
        if (filters.status) {
            clients = clients.filter(client => client.status === filters.status);
        }
        
        return clients;
    }

    // Enhanced Statistics methods
    getInvoiceStats() {
        const invoices = this.getInvoices();
        const stats = {
            total: invoices.length,
            paid: 0,
            pending: 0,
            overdue: 0,
            draft: 0,
            partiallyPaid: 0,
            totalRevenue: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            paidAmount: 0,
            averagePaymentTime: 0,
            overdueInvoices: []
        };
        
        let totalPaymentDays = 0;
        let paidInvoicesCount = 0;

        invoices.forEach(invoice => {
            const total = parseFloat(invoice.total) || 0;
            const paidAmount = parseFloat(invoice.paidAmount) || 0;
            
            // Count by status
            switch (invoice.status) {
                case 'paid':
                    stats.paid++;
                    stats.totalRevenue += total;
                    stats.paidAmount += paidAmount;
                    
                    // Calculate payment time
                    if (invoice.paidDate && invoice.date) {
                        const issueDate = new Date(invoice.date);
                        const paidDate = new Date(invoice.paidDate);
                        const paymentDays = Math.floor((paidDate - issueDate) / (1000 * 60 * 60 * 24));
                        totalPaymentDays += paymentDays;
                        paidInvoicesCount++;
                    }
                    break;
                case 'sent':
                case 'pending':
                    stats.pending++;
                    stats.pendingAmount += (total - paidAmount);
                    if (paidAmount > 0) {
                        stats.partiallyPaid++;
                        stats.paidAmount += paidAmount;
                    }
                    break;
                case 'overdue':
                    stats.overdue++;
                    stats.overdueAmount += (total - paidAmount);
                    stats.overdueInvoices.push({
                        id: invoice.id,
                        clientName: invoice.clientName,
                        amount: total - paidAmount,
                        dueDate: invoice.dueDate,
                        overdueDays: invoice.overdueDays || 0
                    });
                    if (paidAmount > 0) {
                        stats.partiallyPaid++;
                        stats.paidAmount += paidAmount;
                    }
                    break;
                case 'draft':
                    stats.draft++;
                    break;
            }
        });
        
        // Calculate average payment time
        if (paidInvoicesCount > 0) {
            stats.averagePaymentTime = Math.round(totalPaymentDays / paidInvoicesCount);
        }
        
        return stats;
    }

    getPaymentStats() {
        const invoices = this.getInvoices();
        const stats = {
            totalPayments: 0,
            totalPaidAmount: 0,
            averagePaymentAmount: 0,
            paymentMethods: {},
            monthlyPayments: {},
            recentPayments: []
        };

        const allPayments = [];
        
        invoices.forEach(invoice => {
            if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
                invoice.paymentHistory.forEach(payment => {
                    allPayments.push({
                        ...payment,
                        invoiceId: invoice.id,
                        clientName: invoice.clientName
                    });
                });
            }
        });

        stats.totalPayments = allPayments.length;
        stats.totalPaidAmount = allPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        if (stats.totalPayments > 0) {
            stats.averagePaymentAmount = stats.totalPaidAmount / stats.totalPayments;
        }

        // Group by payment method
        allPayments.forEach(payment => {
            const method = payment.method || 'unknown';
            stats.paymentMethods[method] = (stats.paymentMethods[method] || 0) + payment.amount;
        });

        // Group by month
        allPayments.forEach(payment => {
            const month = payment.date.substring(0, 7); // YYYY-MM
            stats.monthlyPayments[month] = (stats.monthlyPayments[month] || 0) + payment.amount;
        });

        // Recent payments (last 10)
        stats.recentPayments = allPayments
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        return stats;
    }

    getClientStats() {
        const clients = this.getClients();
        const invoices = this.getInvoices();
        const stats = {
            total: clients.length,
            active: 0,
            inactive: 0,
            topClients: []
        };
        
        // Calculate client revenue
        const clientRevenue = {};
        invoices.forEach(invoice => {
            if (invoice.clientId && invoice.status === 'paid') {
                clientRevenue[invoice.clientId] = (clientRevenue[invoice.clientId] || 0) + (invoice.total || 0);
            }
        });

        clients.forEach(client => {
            if (client.status === 'active') {
                stats.active++;
            } else {
                stats.inactive++;
            }

            // Add to top clients if they have revenue
            if (clientRevenue[client.id]) {
                stats.topClients.push({
                    id: client.id,
                    name: client.name,
                    company: client.company,
                    revenue: clientRevenue[client.id]
                });
            }
        });

        // Sort top clients by revenue
        stats.topClients.sort((a, b) => b.revenue - a.revenue);
        stats.topClients = stats.topClients.slice(0, 5);
        
        return stats;
    }

    // Initialize sample data with payment tracking
    initializeSampleData() {
        // Sample clients
        const sampleClients = [
            {
                id: 'CLI-001',
                name: 'John Doe',
                company: 'Acme Corp',
                email: 'john.doe@acmecorp.com',
                phone: '+1 (555) 123-4567',
                address: '123 Business St, City, State 12345',
                status: 'active',
                createdAt: '2024-09-15T10:00:00Z',
                updatedAt: '2024-09-15T10:00:00Z'
            },
            {
                id: 'CLI-002',
                name: 'Jane Smith',
                company: 'Tech Solutions Ltd',
                email: 'jane.smith@techsolutions.com',
                phone: '+1 (555) 987-6543',
                address: '456 Tech Ave, City, State 12345',
                status: 'active',
                createdAt: '2024-09-10T10:00:00Z',
                updatedAt: '2024-09-10T10:00:00Z'
            },
            {
                id: 'CLI-003',
                name: 'Mike Johnson',
                company: 'Global Industries',
                email: 'mike.johnson@globalind.com',
                phone: '+1 (555) 456-7890',
                address: '789 Global Blvd, City, State 12345',
                status: 'inactive',
                createdAt: '2024-09-05T10:00:00Z',
                updatedAt: '2024-09-05T10:00:00Z'
            },
            {
                id: 'CLI-004',
                name: 'Sarah Wilson',
                company: 'Startup Co',
                email: 'sarah.wilson@startupco.com',
                phone: '+1 (555) 234-5678',
                address: '321 Innovation Dr, City, State 12345',
                status: 'active',
                createdAt: '2024-09-01T10:00:00Z',
                updatedAt: '2024-09-01T10:00:00Z'
            }
        ];

        // Sample invoices with payment tracking
        const sampleInvoices = [
            {
                id: 'INV-001',
                clientId: 'CLI-001',
                clientName: 'Acme Corp',
                description: 'Web Development Services',
                date: '2024-09-15',
                dueDate: '2024-09-30',
                status: 'paid',
                items: [
                    { description: 'Frontend Development', quantity: 1, rate: 1000, amount: 1000 },
                    { description: 'Backend Integration', quantity: 1, rate: 250, amount: 250 }
                ],
                subtotal: 1250,
                tax: 0,
                total: 1250,
                paidAmount: 1250,
                remainingAmount: 0,
                paidDate: '2024-09-25',
                paymentHistory: [
                    {
                        id: 'PAY-001',
                        amount: 1250,
                        date: '2024-09-25',
                        method: 'bank_transfer',
                        reference: 'TXN-12345',
                        note: 'Full payment received',
                        timestamp: '2024-09-25T14:30:00Z'
                    }
                ],
                statusHistory: [
                    {
                        from: 'draft',
                        to: 'sent',
                        timestamp: '2024-09-15T10:00:00Z',
                        note: 'Invoice sent to client'
                    },
                    {
                        from: 'sent',
                        to: 'paid',
                        timestamp: '2024-09-25T14:30:00Z',
                        note: 'Payment received'
                    }
                ],
                createdAt: '2024-09-15T10:00:00Z',
                updatedAt: '2024-09-25T14:30:00Z'
            },
            {
                id: 'INV-002',
                clientId: 'CLI-002',
                clientName: 'Tech Solutions Ltd',
                description: 'Mobile App Development',
                date: '2024-09-20',
                dueDate: '2024-10-05',
                status: 'sent',
                items: [
                    { description: 'iOS App Development', quantity: 1, rate: 1500, amount: 1500 },
                    { description: 'Android App Development', quantity: 1, rate: 1000, amount: 1000 }
                ],
                subtotal: 2500,
                tax: 0,
                total: 2500,
                paidAmount: 1000,
                remainingAmount: 1500,
                paymentHistory: [
                    {
                        id: 'PAY-002',
                        amount: 1000,
                        date: '2024-09-22',
                        method: 'credit_card',
                        reference: 'CC-67890',
                        note: 'Partial payment - 40%',
                        timestamp: '2024-09-22T09:15:00Z'
                    }
                ],
                statusHistory: [
                    {
                        from: 'draft',
                        to: 'sent',
                        timestamp: '2024-09-20T10:00:00Z',
                        note: 'Invoice sent to client'
                    }
                ],
                createdAt: '2024-09-20T10:00:00Z',
                updatedAt: '2024-09-22T09:15:00Z'
            },
            {
                id: 'INV-003',
                clientId: 'CLI-003',
                clientName: 'Global Industries',
                description: 'Consulting Services',
                date: '2024-09-10',
                dueDate: '2024-09-25',
                status: 'overdue',
                items: [
                    { description: 'Business Analysis', quantity: 20, rate: 150, amount: 3000 },
                    { description: 'Strategy Planning', quantity: 5, rate: 150, amount: 750 }
                ],
                subtotal: 3750,
                tax: 0,
                total: 3750,
                paidAmount: 0,
                remainingAmount: 3750,
                overdueDate: '2024-09-26',
                overdueDays: 2,
                paymentHistory: [],
                statusHistory: [
                    {
                        from: 'draft',
                        to: 'sent',
                        timestamp: '2024-09-10T10:00:00Z',
                        note: 'Invoice sent to client'
                    },
                    {
                        from: 'sent',
                        to: 'overdue',
                        timestamp: '2024-09-26T00:00:00Z',
                        note: 'Automatically marked overdue'
                    }
                ],
                createdAt: '2024-09-10T10:00:00Z',
                updatedAt: '2024-09-26T00:00:00Z'
            },
            {
                id: 'INV-004',
                clientId: 'CLI-004',
                clientName: 'Startup Co',
                description: 'Logo Design',
                date: '2024-09-25',
                dueDate: '2024-10-10',
                status: 'draft',
                items: [
                    { description: 'Logo Design Concepts', quantity: 3, rate: 200, amount: 600 },
                    { description: 'Final Logo Files', quantity: 1, rate: 250, amount: 250 }
                ],
                subtotal: 850,
                tax: 0,
                total: 850,
                paidAmount: 0,
                remainingAmount: 850,
                paymentHistory: [],
                statusHistory: [],
                createdAt: '2024-09-25T10:00:00Z',
                updatedAt: '2024-09-25T10:00:00Z'
            }
        ];

        this.setItem(this.storageKeys.clients, sampleClients);
        this.setItem(this.storageKeys.invoices, sampleInvoices);
    }

    // Export/Import functionality
    exportData() {
        return {
            invoices: this.getInvoices(),
            clients: this.getClients(),
            exportDate: new Date().toISOString()
        };
    }

    importData(data) {
        try {
            if (data.invoices) {
                this.setItem(this.storageKeys.invoices, data.invoices);
            }
            if (data.clients) {
                this.setItem(this.storageKeys.clients, data.clients);
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Clear all data
    clearAllData() {
        Object.values(this.storageKeys).forEach(key => {
            this.removeItem(key);
        });
    }
}

// Create global instance
window.dataStore = new DataStore();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStore;
}
