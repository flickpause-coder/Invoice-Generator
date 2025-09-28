// Invoice Automation System for InvoiceGen
// Phase 3: Enhanced automation with integrated reminder system
// Handles automated reminders, bulk operations, and workflow management

class InvoiceAutomation {
    constructor() {
        this.authService = window.ImprovedAuthService || window.AuthService;
        this.reminderSystem = null;
        this.automationEnabled = true;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[InvoiceAutomation] ${message}`, data);
        }
    }

    async init() {
        this.log('🤖 Initializing Invoice Automation with Reminder System');
        
        // Wait for reminder system to be available
        await this.waitForReminderSystem();
        
        this.setupEventListeners();
        this.startAutomation();
        this.loadAutomationSettings();
    }

    async waitForReminderSystem() {
        // Wait for the global reminder system to be initialized
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.reminderSystem?.isInitialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.reminderSystem?.isInitialized) {
            this.reminderSystem = window.reminderSystem;
            this.log('✅ Connected to Reminder System');
        } else {
            this.log('⚠️ Reminder System not available, using legacy mode');
        }
    }

    setupEventListeners() {
        // Automation toggle
        const automationToggle = document.getElementById('automation-toggle');
        if (automationToggle) {
            automationToggle.addEventListener('change', (e) => {
                this.toggleAutomation(e.target.checked);
            });
        }

        // Manual trigger buttons
        const manualReminderBtn = document.getElementById('manual-reminder-trigger');
        if (manualReminderBtn) {
            manualReminderBtn.addEventListener('click', () => {
                this.sendManualReminders();
            });
        }

        // Bulk action buttons
        const bulkActionBtns = document.querySelectorAll('.bulk-action-btn');
        bulkActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleBulkAction(e.target.dataset.action);
            });
        });
    }

    startAutomation() {
        if (!this.automationEnabled) {
            this.log('⚙️ Automation is disabled');
            return;
        }

        this.log('🚀 Starting automation processes');
        
        // Check for reminders every hour
        this.reminderInterval = setInterval(() => {
            this.checkAndSendReminders();
        }, 60 * 60 * 1000); // 1 hour

        // Update invoice statuses daily
        this.statusInterval = setInterval(() => {
            this.updateInvoiceStatuses();
        }, 24 * 60 * 60 * 1000); // 24 hours

        // Run initial checks
        setTimeout(() => {
            this.checkAndSendReminders();
            this.updateInvoiceStatuses();
        }, 5000); // Wait 5 seconds for app to initialize
    }

    stopAutomation() {
        this.log('⏹️ Stopping automation processes');
        
        if (this.reminderInterval) {
            clearInterval(this.reminderInterval);
            this.reminderInterval = null;
        }
        
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
    }

    toggleAutomation(enabled) {
        this.automationEnabled = enabled;
        this.saveAutomationSettings();
        
        if (enabled) {
            this.startAutomation();
        } else {
            this.stopAutomation();
        }
        
        this.log(`🔄 Automation ${enabled ? 'enabled' : 'disabled'}`);
    }

    checkAndSendReminders() {
        if (!this.automationEnabled) return;
        
        this.log('📧 Checking for invoice reminders');
        
        // Use new reminder system if available, otherwise fall back to legacy
        if (this.reminderSystem?.isInitialized) {
            this.log('🔄 Delegating to new Reminder System');
            return this.reminderSystem.reminderScheduler.processDueReminders();
        }
        
        // Legacy fallback
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        const currentDate = new Date();
        let remindersSent = 0;

        invoices.forEach(invoice => {
            if (this.shouldSendReminder(invoice, currentDate)) {
                this.sendReminder(invoice);
                remindersSent++;
            }
        });

        this.log(`📨 Reminders sent: ${remindersSent}`);
        return remindersSent;
    }

    shouldSendReminder(invoice, currentDate) {
        const dueDate = new Date(invoice.dueDate);
        const daysDiff = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));
        
        // Skip paid invoices
        if (invoice.status === 'paid') return false;
        
        // Initialize reminders object if it doesn't exist
        if (!invoice.reminders) {
            invoice.reminders = {
                beforeDue: { days: 7, sent: false },
                onDue: { sent: false },
                afterDue: { days: 3, sent: false }
            };
        }

        // Before due reminders
        if (daysDiff > 0 && this.reminderIntervals.beforeDue.includes(daysDiff)) {
            if (!invoice.reminders.beforeDue.sent) {
                return true;
            }
        }
        
        // On due date reminder
        if (daysDiff === 0 && !invoice.reminders.onDue.sent) {
            return true;
        }
        
        // After due reminders
        if (daysDiff < 0 && this.reminderIntervals.afterDue.includes(Math.abs(daysDiff))) {
            if (!invoice.reminders.afterDue.sent) {
                return true;
            }
        }
        
        return false;
    }

    sendReminder(invoice) {
        this.log(`📧 Sending reminder for invoice ${invoice.number}`);
        
        // Update reminder status
        const currentDate = new Date();
        const dueDate = new Date(invoice.dueDate);
        const daysDiff = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));
        
        if (!invoice.reminders) {
            invoice.reminders = {
                beforeDue: { days: 7, sent: false },
                onDue: { sent: false },
                afterDue: { days: 3, sent: false }
            };
        }

        // Mark reminder as sent
        if (daysDiff > 0) {
            invoice.reminders.beforeDue.sent = true;
        } else if (daysDiff === 0) {
            invoice.reminders.onDue.sent = true;
        } else {
            invoice.reminders.afterDue.sent = true;
        }

        // Save updated invoice
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        const index = invoices.findIndex(inv => inv.id === invoice.id);
        if (index !== -1) {
            invoices[index] = invoice;
            localStorage.setItem('invoices', JSON.stringify(invoices));
        }

        // Create notification
        this.createReminderNotification(invoice, daysDiff);
    }

    createReminderNotification(invoice, daysDiff) {
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        
        let message, type;
        if (daysDiff > 0) {
            message = `Payment reminder: Invoice ${invoice.number} is due in ${daysDiff} days`;
            type = 'reminder';
        } else if (daysDiff === 0) {
            message = `Invoice ${invoice.number} is due today`;
            type = 'due';
        } else {
            message = `Invoice ${invoice.number} is ${Math.abs(daysDiff)} days overdue`;
            type = 'overdue';
        }

        const notification = {
            id: 'notif-' + Date.now(),
            type: type,
            title: 'Invoice Reminder',
            message: message,
            invoiceId: invoice.id,
            timestamp: new Date().toISOString(),
            read: false
        };

        notifications.unshift(notification);
        
        // Keep only last 50 notifications
        if (notifications.length > 50) {
            notifications.splice(50);
        }

        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        // Show toast notification if user is currently on the page
        this.showToastNotification(notification);
    }

    showToastNotification(notification) {
        // Create toast notification element
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300';
        toast.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <i class="fas fa-bell text-blue-500"></i>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm font-medium text-gray-900">${notification.title}</p>
                    <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
                    <div class="mt-2 flex space-x-2">
                        <button onclick="viewInvoice('${notification.invoiceId}')" class="text-xs text-blue-600 hover:text-blue-500">
                            View Invoice
                        </button>
                        <button onclick="dismissNotification(this)" class="text-xs text-gray-500 hover:text-gray-400">
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 5000);
    }

    updateInvoiceStatuses() {
        if (!this.automationEnabled) return;
        
        this.log('🔄 Updating invoice statuses');
        
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        const currentDate = new Date();
        let updatedCount = 0;

        invoices.forEach(invoice => {
            if (invoice.status === 'sent') {
                const dueDate = new Date(invoice.dueDate);
                
                if (currentDate > dueDate) {
                    invoice.status = 'overdue';
                    updatedCount++;
                    
                    this.log(`📝 Invoice ${invoice.number} marked as overdue`);
                }
            }
        });

        if (updatedCount > 0) {
            localStorage.setItem('invoices', JSON.stringify(invoices));
            this.log(`📝 Updated ${updatedCount} invoice statuses`);
        }
    }

    // Bulk operations
    handleBulkAction(action) {
        const selectedInvoices = this.getSelectedInvoices();
        
        if (selectedInvoices.length === 0) {
            this.showAlert('Please select at least one invoice', 'warning');
            return;
        }

        switch(action) {
            case 'mark-sent':
                this.bulkMarkAsSent(selectedInvoices);
                break;
            case 'mark-paid':
                this.bulkMarkAsPaid(selectedInvoices);
                break;
            case 'delete':
                this.bulkDeleteInvoices(selectedInvoices);
                break;
            case 'send-reminders':
                this.bulkSendReminders(selectedInvoices);
                break;
            default:
                this.log(`⚠️ Unknown bulk action: ${action}`);
        }
    }

    getSelectedInvoices() {
        const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    bulkMarkAsSent(invoiceIds) {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        let updatedCount = 0;

        invoices.forEach(invoice => {
            if (invoiceIds.includes(invoice.id) && invoice.status === 'draft') {
                invoice.status = 'sent';
                invoice.sentDate = new Date().toISOString();
                updatedCount++;
            }
        });

        localStorage.setItem('invoices', JSON.stringify(invoices));
        this.showAlert(`${updatedCount} invoices marked as sent`, 'success');
        this.refreshInvoiceTable();
    }

    bulkMarkAsPaid(invoiceIds) {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        let updatedCount = 0;

        invoices.forEach(invoice => {
            if (invoiceIds.includes(invoice.id) && invoice.status !== 'paid') {
                invoice.status = 'paid';
                invoice.paidDate = new Date().toISOString();
                updatedCount++;
            }
        });

        localStorage.setItem('invoices', JSON.stringify(invoices));
        this.showAlert(`${updatedCount} invoices marked as paid`, 'success');
        this.refreshInvoiceTable();
    }

    bulkDeleteInvoices(invoiceIds) {
        if (!confirm(`Are you sure you want to delete ${invoiceIds.length} invoices?`)) {
            return;
        }

        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        const remainingInvoices = invoices.filter(invoice => 
            !invoiceIds.includes(invoice.id)
        );

        localStorage.setItem('invoices', JSON.stringify(remainingInvoices));
        this.showAlert(`${invoiceIds.length} invoices deleted`, 'success');
        this.refreshInvoiceTable();
    }

    bulkSendReminders(invoiceIds) {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        let sentCount = 0;

        invoices.forEach(invoice => {
            if (invoiceIds.includes(invoice.id) && invoice.status !== 'paid') {
                this.sendReminder(invoice);
                sentCount++;
            }
        });

        this.showAlert(`Reminders sent for ${sentCount} invoices`, 'success');
    }

    // Manual reminder trigger
    sendManualReminders() {
        const sentCount = this.checkAndSendReminders();
        this.showAlert(`Manual reminder check complete. ${sentCount} reminders sent.`, 'info');
    }

    // Settings management
    loadAutomationSettings() {
        const settings = JSON.parse(localStorage.getItem('automationSettings') || '{}');
        this.automationEnabled = settings.enabled !== false; // Default to true
        
        const toggle = document.getElementById('automation-toggle');
        if (toggle) {
            toggle.checked = this.automationEnabled;
        }
    }

    saveAutomationSettings() {
        const settings = {
            enabled: this.automationEnabled,
            reminderIntervals: this.reminderIntervals,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('automationSettings', JSON.stringify(settings));
    }

    // UI Helper methods
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        const colors = {
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700',
            info: 'bg-blue-100 border-blue-400 text-blue-700'
        };

        alertDiv.className = `fixed top-4 right-4 ${colors[type]} border px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
        alertDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button>
            </div>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }

    refreshInvoiceTable() {
        // Trigger refresh of invoice table if it exists
        const event = new CustomEvent('invoiceTableRefresh');
        document.dispatchEvent(event);
    }

    // Cleanup method
    destroy() {
        this.stopAutomation();
    }
}

// Global functions for UI interactions
window.viewInvoice = function(invoiceId) {
    window.location.href = `invoices.html?id=${invoiceId}`;
};

window.dismissNotification = function(button) {
    const toast = button.closest('.fixed');
    if (toast) {
        toast.remove();
    }
};

// Initialize automation system
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.invoiceAutomation = new InvoiceAutomation();
    }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.invoiceAutomation) {
        window.invoiceAutomation.destroy();
    }
});