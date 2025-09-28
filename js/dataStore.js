
/**
 * DataStore - Enhanced data management with reminder tracking
 * Phase 3: Reminder System Integration
 */
class DataStore {
    constructor() {
        this.storageKeys = {
            invoices: 'invoices',
            clients: 'clients',
            reminders: 'reminders',
            reminderSettings: 'reminderSettings',
            emailTemplates: 'emailTemplates',
            notifications: 'notifications'
        };
        this.init();
    }

    init() {
        this.initializeDefaultData();
        this.migrateExistingData();
    }

    initializeDefaultData() {
        // Initialize reminder settings if not exists
        if (!localStorage.getItem(this.storageKeys.reminderSettings)) {
            const defaultSettings = {
                enabled: true,
                beforeDueDays: [7, 3, 1],
                afterDueDays: [1, 7, 14, 30],
                maxReminders: 10,
                emailEnabled: true,
                smsEnabled: false,
                templates: {
                    beforeDue: 'before-due-template',
                    onDue: 'on-due-template',
                    afterDue: 'after-due-template'
                },
                businessHours: {
                    enabled: true,
                    start: '09:00',
                    end: '17:00',
                    timezone: 'UTC'
                }
            };
            this.setReminderSettings(defaultSettings);
        }

        // Initialize email templates if not exists
        if (!localStorage.getItem(this.storageKeys.emailTemplates)) {
            this.initializeDefaultEmailTemplates();
        }
    }

    initializeDefaultEmailTemplates() {
        const defaultTemplates = {
            'before-due-template': {
                id: 'before-due-template',
                name: 'Before Due Date Reminder',
                subject: 'Payment Reminder: Invoice {{invoiceNumber}} Due in {{daysUntilDue}} Days',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Payment Reminder</h2>
                        <p>Dear {{clientName}},</p>
                        <p>This is a friendly reminder that your invoice <strong>{{invoiceNumber}}</strong> is due in <strong>{{daysUntilDue}} days</strong>.</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin: 0 0 10px 0;">Invoice Details:</h3>
                            <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
                            <p><strong>Amount:</strong> {{currency}}{{amount}}</p>
                            <p><strong>Due Date:</strong> {{dueDate}}</p>
                        </div>
                        <p>Please ensure payment is made by the due date to avoid any late fees.</p>
                        <p>If you have any questions, please don't hesitate to contact us.</p>
                        <p>Best regards,<br>{{companyName}}</p>
                    </div>
                `,
                textContent: `Payment Reminder - Invoice {{invoiceNumber}} Due in {{daysUntilDue}} Days\n\nDear {{clientName}},\n\nThis is a friendly reminder that your invoice {{invoiceNumber}} is due in {{daysUntilDue}} days.\n\nInvoice Details:\nInvoice Number: {{invoiceNumber}}\nAmount: {{currency}}{{amount}}\nDue Date: {{dueDate}}\n\nPlease ensure payment is made by the due date to avoid any late fees.\n\nBest regards,\n{{companyName}}`,
                variables: ['clientName', 'invoiceNumber', 'daysUntilDue', 'amount', 'currency', 'dueDate', 'companyName']
            },
            'on-due-template': {
                id: 'on-due-template',
                name: 'Due Date Reminder',
                subject: 'Payment Due Today: Invoice {{invoiceNumber}}',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">Payment Due Today</h2>
                        <p>Dear {{clientName}},</p>
                        <p>Your invoice <strong>{{invoiceNumber}}</strong> is <strong>due today</strong>.</p>
                        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin: 0 0 10px 0; color: #dc2626;">Invoice Details:</h3>
                            <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
                            <p><strong>Amount:</strong> {{currency}}{{amount}}</p>
                            <p><strong>Due Date:</strong> {{dueDate}}</p>
                        </div>
                        <p>Please process payment immediately to avoid late fees and maintain your account in good standing.</p>
                        <p>If you have any questions or need assistance, please contact us immediately.</p>
                        <p>Best regards,<br>{{companyName}}</p>
                    </div>
                `,
                textContent: `Payment Due Today - Invoice {{invoiceNumber}}\n\nDear {{clientName}},\n\nYour invoice {{invoiceNumber}} is due today.\n\nInvoice Details:\nInvoice Number: {{invoiceNumber}}\nAmount: {{currency}}{{amount}}\nDue Date: {{dueDate}}\n\nPlease process payment immediately to avoid late fees.\n\nBest regards,\n{{companyName}}`,
                variables: ['clientName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'companyName']
            },
            'after-due-template': {
                id: 'after-due-template',
                name: 'Overdue Payment Reminder',
                subject: 'OVERDUE: Invoice {{invoiceNumber}} - {{daysOverdue}} Days Past Due',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">OVERDUE PAYMENT NOTICE</h2>
                        <p>Dear {{clientName}},</p>
                        <p>Your invoice <strong>{{invoiceNumber}}</strong> is now <strong>{{daysOverdue}} days overdue</strong>.</p>
                        <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin: 0 0 10px 0; color: #dc2626;">Overdue Invoice Details:</h3>
                            <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
                            <p><strong>Amount:</strong> {{currency}}{{amount}}</p>
                            <p><strong>Original Due Date:</strong> {{dueDate}}</p>
                            <p><strong>Days Overdue:</strong> {{daysOverdue}}</p>
                        </div>
                        <p><strong>IMMEDIATE ACTION REQUIRED:</strong> Please remit payment immediately to avoid further collection actions.</p>
                        <p>Late fees may apply. Please contact us immediately if there are any issues with payment.</p>
                        <p>Best regards,<br>{{companyName}}</p>
                    </div>
                `,
                textContent: `OVERDUE PAYMENT NOTICE - Invoice {{invoiceNumber}} - {{daysOverdue}} Days Past Due\n\nDear {{clientName}},\n\nYour invoice {{invoiceNumber}} is now {{daysOverdue}} days overdue.\n\nOverdue Invoice Details:\nInvoice Number: {{invoiceNumber}}\nAmount: {{currency}}{{amount}}\nOriginal Due Date: {{dueDate}}\nDays Overdue: {{daysOverdue}}\n\nIMMEDIATE ACTION REQUIRED: Please remit payment immediately to avoid further collection actions.\n\nBest regards,\n{{companyName}}`,
                variables: ['clientName', 'invoiceNumber', 'daysOverdue', 'amount', 'currency', 'dueDate', 'companyName']
            }
        };
        
        localStorage.setItem(this.storageKeys.emailTemplates, JSON.stringify(defaultTemplates));
    }

    migrateExistingData() {
        // Migrate existing invoices to include reminder tracking
        const invoices = this.getInvoices();
        let migrated = false;

        invoices.forEach(invoice => {
            if (!invoice.reminderHistory) {
                invoice.reminderHistory = [];
                migrated = true;
            }
            if (!invoice.paymentTracking) {
                invoice.paymentTracking = {
                    status: invoice.status || 'draft',
                    totalPaid: 0,
                    payments: [],
                    lastUpdated: new Date().toISOString()
                };
                migrated = true;
            }
        });

        if (migrated) {
            this.setInvoices(invoices);
        }
    }

    // Invoice operations
    getInvoices() {
        return JSON.parse(localStorage.getItem(this.storageKeys.invoices) || '[]');
    }

    setInvoices(invoices) {
        localStorage.setItem(this.storageKeys.invoices, JSON.stringify(invoices));
    }

    getInvoice(id) {
        const invoices = this.getInvoices();
        return invoices.find(invoice => invoice.id === id);
    }

    updateInvoice(id, updates) {
        const invoices = this.getInvoices();
        const index = invoices.findIndex(invoice => invoice.id === id);
        
        if (index !== -1) {
            invoices[index] = { ...invoices[index], ...updates };
            this.setInvoices(invoices);
            return invoices[index];
        }
        return null;
    }

    // Client operations
    getClients() {
        return JSON.parse(localStorage.getItem(this.storageKeys.clients) || '[]');
    }

    getClient(id) {
        const clients = this.getClients();
        return clients.find(client => client.id === id);
    }

    // Reminder operations
    getReminders() {
        return JSON.parse(localStorage.getItem(this.storageKeys.reminders) || '[]');
    }

    setReminders(reminders) {
        localStorage.setItem(this.storageKeys.reminders, JSON.stringify(reminders));
    }

    addReminder(reminder) {
        const reminders = this.getReminders();
        reminder.id = 'reminder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        reminder.createdAt = new Date().toISOString();
        reminders.push(reminder);
        this.setReminders(reminders);
        return reminder;
    }

    updateReminder(id, updates) {
        const reminders = this.getReminders();
        const index = reminders.findIndex(reminder => reminder.id === id);
        
        if (index !== -1) {
            reminders[index] = { ...reminders[index], ...updates };
            this.setReminders(reminders);
            return reminders[index];
        }
        return null;
    }

    // Reminder settings
    getReminderSettings() {
        return JSON.parse(localStorage.getItem(this.storageKeys.reminderSettings) || '{}');
    }

    setReminderSettings(settings) {
        localStorage.setItem(this.storageKeys.reminderSettings, JSON.stringify(settings));
    }

    // Email templates
    getEmailTemplates() {
        return JSON.parse(localStorage.getItem(this.storageKeys.emailTemplates) || '{}');
    }

    setEmailTemplates(templates) {
        localStorage.setItem(this.storageKeys.emailTemplates, JSON.stringify(templates));
    }

    getEmailTemplate(id) {
        const templates = this.getEmailTemplates();
        return templates[id];
    }

    updateEmailTemplate(id, template) {
        const templates = this.getEmailTemplates();
        templates[id] = { ...templates[id], ...template };
        this.setEmailTemplates(templates);
    }

    // Statistics and analytics
    getInvoiceStats() {
        const invoices = this.getInvoices();
        const stats = {
            total: invoices.length,
            draft: 0,
            sent: 0,
            paid: 0,
            overdue: 0,
            totalAmount: 0,
            paidAmount: 0,
            overdueAmount: 0
        };

        invoices.forEach(invoice => {
            const amount = parseFloat(invoice.total || 0);
            stats.totalAmount += amount;

            switch (invoice.status) {
                case 'draft':
                    stats.draft++;
                    break;
                case 'sent':
                    stats.sent++;
                    break;
                case 'paid':
                    stats.paid++;
                    stats.paidAmount += amount;
                    break;
                case 'overdue':
                    stats.overdue++;
                    stats.overdueAmount += amount;
                    break;
            }
        });

        return stats;
    }

    getReminderStats() {
        const reminders = this.getReminders();
        const stats = {
            total: reminders.length,
            pending: 0,
            sent: 0,
            failed: 0,
            scheduled: 0
        };

        reminders.forEach(reminder => {
            switch (reminder.status) {
                case 'pending':
                    stats.pending++;
                    break;
                case 'sent':
                    stats.sent++;
                    break;
                case 'failed':
                    stats.failed++;
                    break;
                case 'scheduled':
                    stats.scheduled++;
                    break;
            }
        });

        return stats;
    }

    updateOverdueInvoices() {
        const invoices = this.getInvoices();
        const currentDate = new Date();
        let updated = false;

        invoices.forEach(invoice => {
            if (invoice.status === 'sent' && invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                if (currentDate > dueDate) {
                    invoice.status = 'overdue';
                    updated = true;
                }
            }
        });

        if (updated) {
            this.setInvoices(invoices);
        }

        return updated;
    }

    // Notification operations
    getNotifications() {
        return JSON.parse(localStorage.getItem(this.storageKeys.notifications) || '[]');
    }

    addNotification(notification) {
        const notifications = this.getNotifications();
        notification.id = 'notif-' + Date.now();
        notification.timestamp = new Date().toISOString();
        notification.read = false;
        
        notifications.unshift(notification);
        
        // Keep only last 100 notifications
        if (notifications.length > 100) {
            notifications.splice(100);
        }
        
        localStorage.setItem(this.storageKeys.notifications, JSON.stringify(notifications));
        return notification;
    }

    markNotificationRead(id) {
        const notifications = this.getNotifications();
        const notification = notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            localStorage.setItem(this.storageKeys.notifications, JSON.stringify(notifications));
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataStore;
}
