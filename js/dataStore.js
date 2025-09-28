/**
 * InvoiceGen Data Store
 * Centralized data management system using LocalStorage
 * Handles CRUD operations for invoices, clients, and settings
 */

class DataStore {
    constructor() {
        this.storageKeys = {
            invoices: 'invoiceGen_invoices',
            clients: 'invoiceGen_clients',
            settings: 'invoiceGen_settings',
            user: 'invoiceGen_user'
        };
        this.init();
    }

    init() {
        // Initialize with sample data if storage is empty
        if (!this.getInvoices().length) {
            this.initializeSampleData();
        }
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
            invoices[index] = {
                ...invoices[index],
                ...updateData,
                updatedAt: new Date().toISOString()
            };
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

    // Statistics methods
    getInvoiceStats() {
        const invoices = this.getInvoices();
        const stats = {
            total: invoices.length,
            paid: 0,
            pending: 0,
            overdue: 0,
            draft: 0,
            totalRevenue: 0,
            pendingAmount: 0,
            overdueAmount: 0
        };
        
        invoices.forEach(invoice => {
            const amount = parseFloat(invoice.total) || 0;
            
            switch (invoice.status) {
                case 'paid':
                    stats.paid++;
                    stats.totalRevenue += amount;
                    break;
                case 'sent':
                case 'pending':
                    stats.pending++;
                    stats.pendingAmount += amount;
                    break;
                case 'overdue':
                    stats.overdue++;
                    stats.overdueAmount += amount;
                    break;
                case 'draft':
                    stats.draft++;
                    break;
            }
        });
        
        return stats;
    }

    getClientStats() {
        const clients = this.getClients();
        const stats = {
            total: clients.length,
            active: 0,
            inactive: 0
        };
        
        clients.forEach(client => {
            if (client.status === 'active') {
                stats.active++;
            } else {
                stats.inactive++;
            }
        });
        
        return stats;
    }

    // Initialize sample data
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

        // Sample invoices
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
                createdAt: '2024-09-15T10:00:00Z',
                updatedAt: '2024-09-15T10:00:00Z'
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
                createdAt: '2024-09-20T10:00:00Z',
                updatedAt: '2024-09-20T10:00:00Z'
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
                createdAt: '2024-09-10T10:00:00Z',
                updatedAt: '2024-09-10T10:00:00Z'
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
