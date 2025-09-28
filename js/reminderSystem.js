
/**
 * ReminderSystem - Main orchestrator for the reminder system
 * Phase 3: Integration layer that coordinates all reminder components
 */
class ReminderSystem {
    constructor() {
        this.dataStore = null;
        this.emailService = null;
        this.reminderScheduler = null;
        this.paymentManager = null;
        this.modalSystem = null;
        this.isInitialized = false;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
    }

    async init(dependencies = {}) {
        try {
            this.log('🚀 Initializing Reminder System');

            // Initialize dependencies
            this.dataStore = dependencies.dataStore || new DataStore();
            this.modalSystem = dependencies.modalSystem || new ModalSystem();
            this.paymentManager = dependencies.paymentManager || new PaymentManager(this.dataStore);
            this.emailService = new EmailService(this.dataStore);
            this.reminderScheduler = new ReminderScheduler(this.dataStore, this.emailService);

            // Set up event listeners
            this.setupEventListeners();

            // Initialize UI components
            this.initializeUI();

            this.isInitialized = true;
            this.log('✅ Reminder System initialized successfully');

            return true;
        } catch (error) {
            this.log('❌ Failed to initialize Reminder System:', error.message);
            throw error;
        }
    }

    setupEventListeners() {
        // Listen for payment status changes
        document.addEventListener('paymentStatusChanged', (event) => {
            this.handlePaymentStatusChange(event.detail);
        });

        // Listen for invoice updates
        document.addEventListener('invoiceUpdated', (event) => {
            this.handleInvoiceUpdate(event.detail);
        });

        // Listen for reminder cancellation requests
        document.addEventListener('cancelReminders', (event) => {
            this.cancelRemindersForInvoice(event.detail.invoiceId);
        });

        // Listen for manual reminder requests
        document.addEventListener('sendManualReminder', (event) => {
            this.sendManualReminder(event.detail);
        });
    }

    initializeUI() {
        // Add reminder system controls to the UI
        this.addReminderControls();
        this.addReminderDashboard();
    }

    addReminderControls() {
        // Add reminder settings button to settings menu
        const settingsMenu = document.querySelector('.settings-menu');
        if (settingsMenu) {
            const reminderButton = document.createElement('button');
            reminderButton.className = 'w-full text-left px-4 py-2 hover:bg-gray-100';
            reminderButton.innerHTML = `
                <i class="fas fa-bell mr-2"></i>
                Reminder Settings
            `;
            reminderButton.onclick = () => this.showReminderSettings();
            settingsMenu.appendChild(reminderButton);
        }

        // Add manual reminder buttons to invoice actions
        this.addInvoiceReminderButtons();
    }

    addInvoiceReminderButtons() {
        // This would be called when invoice rows are rendered
        const invoiceRows = document.querySelectorAll('.invoice-row');
        invoiceRows.forEach(row => {
            const invoiceId = row.dataset.invoiceId;
            const actionsCell = row.querySelector('.invoice-actions');
            
            if (actionsCell && invoiceId) {
                const reminderButton = document.createElement('button');
                reminderButton.className = 'text-blue-600 hover:text-blue-800 mr-2';
                reminderButton.innerHTML = '<i class="fas fa-bell"></i>';
                reminderButton.title = 'Send Reminder';
                reminderButton.onclick = () => this.showManualReminderDialog(invoiceId);
                actionsCell.appendChild(reminderButton);
            }
        });
    }

    addReminderDashboard() {
        // Add reminder statistics to dashboard
        const dashboardStats = document.querySelector('.dashboard-stats');
        if (dashboardStats) {
            const reminderStats = this.getReminderStats();
            const reminderCard = document.createElement('div');
            reminderCard.className = 'bg-white p-6 rounded-lg shadow hover-lift';
            reminderCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900">Reminders</h3>
                        <div class="mt-2 space-y-1">
                            <p class="text-sm text-gray-600">Scheduled: ${reminderStats.scheduled}</p>
                            <p class="text-sm text-gray-600">Sent Today: ${reminderStats.sentToday}</p>
                            <p class="text-sm text-gray-600">Failed: ${reminderStats.failed}</p>
                        </div>
                    </div>
                    <div class="text-3xl text-blue-600">
                        <i class="fas fa-bell"></i>
                    </div>
                </div>
                <div class="mt-4">
                    <button onclick="reminderSystem.showReminderDashboard()" 
                            class="text-blue-600 hover:text-blue-800 text-sm">
                        View Details →
                    </button>
                </div>
            `;
            dashboardStats.appendChild(reminderCard);
        }
    }

    // Event handlers
    handlePaymentStatusChange(data) {
        const { invoiceId, oldStatus, newStatus } = data;
        
        if (newStatus === 'paid') {
            // Cancel all scheduled reminders for paid invoices
            this.cancelRemindersForInvoice(invoiceId);
            this.log(`🚫 Cancelled reminders for paid invoice ${invoiceId}`);
        } else if (newStatus === 'sent' && oldStatus === 'draft') {
            // Schedule reminders for newly sent invoices
            this.scheduleRemindersForInvoice(invoiceId);
            this.log(`📅 Scheduled reminders for sent invoice ${invoiceId}`);
        }
    }

    handleInvoiceUpdate(data) {
        const { invoiceId, changes } = data;
        
        // If due date changed, reschedule reminders
        if (changes.dueDate) {
            this.rescheduleRemindersForInvoice(invoiceId);
            this.log(`🔄 Rescheduled reminders for invoice ${invoiceId} due to date change`);
        }
    }

    // Core reminder operations
    async scheduleRemindersForInvoice(invoiceId) {
        try {
            const invoice = this.dataStore.getInvoice(invoiceId);
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            const settings = this.dataStore.getReminderSettings();
            if (!settings.enabled) {
                this.log('⚙️ Reminders disabled, skipping scheduling');
                return;
            }

            // Let the scheduler handle the actual scheduling
            this.reminderScheduler.scheduleRemindersForInvoice(invoice, settings);
            
            this.log(`📅 Scheduled reminders for invoice ${invoice.number}`);
        } catch (error) {
            this.log(`❌ Failed to schedule reminders for invoice ${invoiceId}:`, error.message);
        }
    }

    cancelRemindersForInvoice(invoiceId) {
        try {
            const cancelledCount = this.reminderScheduler.cancelScheduledReminders(invoiceId);
            this.log(`🚫 Cancelled ${cancelledCount} reminders for invoice ${invoiceId}`);
            return cancelledCount;
        } catch (error) {
            this.log(`❌ Failed to cancel reminders for invoice ${invoiceId}:`, error.message);
            return 0;
        }
    }

    async rescheduleRemindersForInvoice(invoiceId) {
        try {
            // Cancel existing reminders
            this.cancelRemindersForInvoice(invoiceId);
            
            // Schedule new reminders
            await this.scheduleRemindersForInvoice(invoiceId);
            
            this.log(`🔄 Rescheduled reminders for invoice ${invoiceId}`);
        } catch (error) {
            this.log(`❌ Failed to reschedule reminders for invoice ${invoiceId}:`, error.message);
        }
    }

    async sendManualReminder(data) {
        try {
            const { invoiceId, reminderType } = data;
            const result = await this.reminderScheduler.sendManualReminder(invoiceId, reminderType);
            
            this.showAlert(`Manual reminder sent successfully!`, 'success');
            this.log(`📧 Manual reminder sent for invoice ${invoiceId}`);
            
            return result;
        } catch (error) {
            this.showAlert(`Failed to send reminder: ${error.message}`, 'error');
            this.log(`❌ Manual reminder failed for invoice ${invoiceId}:`, error.message);
            throw error;
        }
    }

    // UI Methods
    showReminderSettings() {
        if (!this.modalSystem) {
            this.showAlert('Modal system not available', 'error');
            return;
        }
        
        this.modalSystem.showReminderSettingsModal(this.dataStore);
    }

    showManualReminderDialog(invoiceId) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            this.showAlert('Invoice not found', 'error');
            return;
        }

        const content = `
            <div class="manual-reminder-dialog">
                <h2 class="text-xl font-bold mb-4">Send Manual Reminder</h2>
                <p class="mb-4">Send a reminder for Invoice ${invoice.number}</p>
                
                <div class="space-y-3">
                    <label class="block">
                        <span class="font-medium">Reminder Type:</span>
                        <select id="reminder-type" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="beforeDue">Before Due Date</option>
                            <option value="onDue">Due Date</option>
                            <option value="afterDue">Overdue</option>
                        </select>
                    </label>
                </div>

                <div class="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button type="button" onclick="modalSystem.closeModal()" 
                            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Cancel
                    </button>
                    <button type="button" onclick="reminderSystem.sendManualReminderFromDialog('${invoiceId}')" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Send Reminder
                    </button>
                </div>
            </div>
        `;

        this.modalSystem.showModal(content);
    }

    async sendManualReminderFromDialog(invoiceId) {
        const reminderType = document.getElementById('reminder-type').value;
        
        try {
            await this.sendManualReminder({ invoiceId, reminderType });
            this.modalSystem.closeModal();
        } catch (error) {
            // Error already handled in sendManualReminder
        }
    }

    showReminderDashboard() {
        const reminders = this.dataStore.getReminders();
        const stats = this.getReminderStats();
        
        const content = `
            <div class="reminder-dashboard">
                <h2 class="text-2xl font-bold mb-6">Reminder Dashboard</h2>
                
                <!-- Statistics -->
                <div class="grid grid-cols-4 gap-4 mb-6">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-blue-900">Scheduled</h3>
                        <p class="text-2xl font-bold text-blue-600">${stats.scheduled}</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-green-900">Sent</h3>
                        <p class="text-2xl font-bold text-green-600">${stats.sent}</p>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-yellow-900">Pending</h3>
                        <p class="text-2xl font-bold text-yellow-600">${stats.pending}</p>
                    </div>
                    <div class="bg-red-50 p-4 rounded-lg">
                        <h3 class="font-semibold text-red-900">Failed</h3>
                        <p class="text-2xl font-bold text-red-600">${stats.failed}</p>
                    </div>
                </div>

                <!-- Upcoming Reminders -->
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3">Upcoming Reminders (Next 7 Days)</h3>
                    <div class="space-y-2">
                        ${this.renderUpcomingReminders()}
                    </div>
                </div>

                <!-- Recent Activity -->
                <div>
                    <h3 class="text-lg font-semibold mb-3">Recent Activity</h3>
                    <div class="space-y-2">
                        ${this.renderRecentReminderActivity()}
                    </div>
                </div>

                <div class="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button type="button" onclick="reminderSystem.showReminderSettings()" 
                            class="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50">
                        Settings
                    </button>
                    <button type="button" onclick="modalSystem.closeModal()" 
                            class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
                        Close
                    </button>
                </div>
            </div>
        `;

        this.modalSystem.showModal(content, { size: 'xl' });
    }

    renderUpcomingReminders() {
        const upcomingReminders = this.reminderScheduler.getUpcomingReminders(7);
        
        if (upcomingReminders.length === 0) {
            return '<p class="text-gray-500">No upcoming reminders</p>';
        }

        return upcomingReminders.map(reminder => {
            const invoice = this.dataStore.getInvoice(reminder.invoiceId);
            const scheduledDate = new Date(reminder.nextAttempt);
            
            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                        <span class="font-medium">Invoice ${invoice?.number || reminder.invoiceId}</span>
                        <span class="text-sm text-gray-600 ml-2">(${reminder.type})</span>
                    </div>
                    <div class="text-sm text-gray-600">
                        ${this.formatDate(scheduledDate)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentReminderActivity() {
        const reminders = this.dataStore.getReminders()
            .filter(r => r.status === 'sent' || r.status === 'failed')
            .sort((a, b) => new Date(b.sentAt || b.failedAt) - new Date(a.sentAt || a.failedAt))
            .slice(0, 10);

        if (reminders.length === 0) {
            return '<p class="text-gray-500">No recent activity</p>';
        }

        return reminders.map(reminder => {
            const invoice = this.dataStore.getInvoice(reminder.invoiceId);
            const date = new Date(reminder.sentAt || reminder.failedAt);
            const statusColor = reminder.status === 'sent' ? 'text-green-600' : 'text-red-600';
            
            return `
                <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                        <span class="font-medium">Invoice ${invoice?.number || reminder.invoiceId}</span>
                        <span class="text-sm text-gray-600 ml-2">(${reminder.type})</span>
                    </div>
                    <div class="text-sm">
                        <span class="${statusColor}">${reminder.status}</span>
                        <span class="text-gray-600 ml-2">${this.formatDate(date)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Utility methods
    getReminderStats() {
        const baseStats = this.dataStore.getReminderStats();
        const today = new Date().toDateString();
        const reminders = this.dataStore.getReminders();
        
        const sentToday = reminders.filter(r => 
            r.status === 'sent' && 
            r.sentAt && 
            new Date(r.sentAt).toDateString() === today
        ).length;

        return {
            ...baseStats,
            sentToday
        };
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    showAlert(message, type = 'info') {
        if (this.modalSystem) {
            this.modalSystem.showAlert(message, type);
        } else {
            alert(message);
        }
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[ReminderSystem] ${message}`, data);
        }
    }

    // Cleanup
    destroy() {
        if (this.reminderScheduler) {
            this.reminderScheduler.destroy();
        }
        this.isInitialized = false;
        this.log('🛑 Reminder System destroyed');
    }
}

// Global instance
window.reminderSystem = new ReminderSystem();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReminderSystem;
}
