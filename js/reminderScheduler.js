
/**
 * ReminderScheduler - Advanced scheduling system for invoice reminders
 * Phase 3: Automated recurring reminders with persistence and error handling
 */
class ReminderScheduler {
    constructor(dataStore, emailService) {
        this.dataStore = dataStore;
        this.emailService = emailService;
        this.scheduledJobs = new Map();
        this.isRunning = false;
        this.checkInterval = null;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    init() {
        this.log('🕐 Initializing Reminder Scheduler');
        this.loadScheduledReminders();
        this.startScheduler();
    }

    startScheduler() {
        if (this.isRunning) {
            this.log('⚠️ Scheduler already running');
            return;
        }

        this.isRunning = true;
        this.log('🚀 Starting reminder scheduler');

        // Check for due reminders every minute
        this.checkInterval = setInterval(() => {
            this.processDueReminders();
        }, 60 * 1000); // 1 minute

        // Schedule reminders for all unpaid invoices every hour
        setInterval(() => {
            this.scheduleRemindersForUnpaidInvoices();
        }, 60 * 60 * 1000); // 1 hour

        // Initial run
        setTimeout(() => {
            this.scheduleRemindersForUnpaidInvoices();
            this.processDueReminders();
        }, 5000);
    }

    stopScheduler() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.log('⏹️ Stopping reminder scheduler');

        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }

        // Clear all scheduled jobs
        this.scheduledJobs.clear();
    }

    scheduleRemindersForUnpaidInvoices() {
        if (!this.isRunning) return;

        this.log('📅 Scheduling reminders for unpaid invoices');
        
        const invoices = this.dataStore.getInvoices();
        const settings = this.dataStore.getReminderSettings();
        
        if (!settings.enabled) {
            this.log('⚙️ Reminders disabled in settings');
            return;
        }

        let scheduledCount = 0;

        invoices.forEach(invoice => {
            if (this.shouldScheduleReminders(invoice)) {
                this.scheduleRemindersForInvoice(invoice, settings);
                scheduledCount++;
            }
        });

        this.log(`📅 Scheduled reminders for ${scheduledCount} invoices`);
    }

    shouldScheduleReminders(invoice) {
        // Only schedule for unpaid invoices
        if (invoice.status === 'paid') return false;
        
        // Skip draft invoices unless they have a due date
        if (invoice.status === 'draft' && !invoice.dueDate) return false;
        
        // Check if we've reached the maximum reminder limit
        const reminderHistory = invoice.reminderHistory || [];
        const settings = this.dataStore.getReminderSettings();
        
        if (reminderHistory.length >= settings.maxReminders) {
            this.log(`⚠️ Max reminders reached for invoice ${invoice.number}`);
            return false;
        }

        return true;
    }

    scheduleRemindersForInvoice(invoice, settings) {
        const dueDate = new Date(invoice.dueDate);
        const currentDate = new Date();
        const reminderHistory = invoice.reminderHistory || [];

        // Schedule before-due reminders
        settings.beforeDueDays.forEach(days => {
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(reminderDate.getDate() - days);
            
            if (reminderDate > currentDate && !this.hasReminderBeenSent(reminderHistory, 'beforeDue', days)) {
                this.scheduleReminder({
                    invoiceId: invoice.id,
                    type: 'beforeDue',
                    scheduledDate: reminderDate,
                    days: days,
                    metadata: { daysBeforeDue: days }
                });
            }
        });

        // Schedule on-due reminder
        if (dueDate >= currentDate && !this.hasReminderBeenSent(reminderHistory, 'onDue')) {
            this.scheduleReminder({
                invoiceId: invoice.id,
                type: 'onDue',
                scheduledDate: dueDate,
                metadata: { dueDate: true }
            });
        }

        // Schedule after-due reminders
        settings.afterDueDays.forEach(days => {
            const reminderDate = new Date(dueDate);
            reminderDate.setDate(reminderDate.getDate() + days);
            
            if (!this.hasReminderBeenSent(reminderHistory, 'afterDue', days)) {
                this.scheduleReminder({
                    invoiceId: invoice.id,
                    type: 'afterDue',
                    scheduledDate: reminderDate,
                    days: days,
                    metadata: { daysAfterDue: days }
                });
            }
        });
    }

    hasReminderBeenSent(reminderHistory, type, days = null) {
        return reminderHistory.some(reminder => 
            reminder.type === type && 
            (days === null || reminder.days === days) &&
            reminder.status === 'sent'
        );
    }

    scheduleReminder(reminderData) {
        const reminder = this.dataStore.addReminder({
            ...reminderData,
            status: 'scheduled',
            attempts: 0,
            lastAttempt: null,
            nextAttempt: reminderData.scheduledDate
        });

        this.log(`📅 Scheduled ${reminderData.type} reminder for invoice ${reminderData.invoiceId}`, {
            scheduledDate: reminderData.scheduledDate,
            reminderId: reminder.id
        });

        return reminder;
    }

    processDueReminders() {
        if (!this.isRunning) return;

        const currentDate = new Date();
        const reminders = this.dataStore.getReminders();
        const dueReminders = reminders.filter(reminder => 
            reminder.status === 'scheduled' && 
            new Date(reminder.nextAttempt) <= currentDate
        );

        if (dueReminders.length === 0) return;

        this.log(`📧 Processing ${dueReminders.length} due reminders`);

        dueReminders.forEach(reminder => {
            this.processReminder(reminder);
        });
    }

    async processReminder(reminder) {
        try {
            this.log(`📧 Processing reminder ${reminder.id} for invoice ${reminder.invoiceId}`);

            const invoice = this.dataStore.getInvoice(reminder.invoiceId);
            if (!invoice) {
                this.log(`⚠️ Invoice ${reminder.invoiceId} not found, cancelling reminder`);
                this.dataStore.updateReminder(reminder.id, { 
                    status: 'cancelled',
                    error: 'Invoice not found'
                });
                return;
            }

            // Skip if invoice is now paid
            if (invoice.status === 'paid') {
                this.log(`✅ Invoice ${invoice.number} is now paid, cancelling reminder`);
                this.dataStore.updateReminder(reminder.id, { 
                    status: 'cancelled',
                    reason: 'Invoice paid'
                });
                return;
            }

            // Check business hours if enabled
            if (!this.isWithinBusinessHours()) {
                this.log(`🕐 Outside business hours, rescheduling reminder ${reminder.id}`);
                this.rescheduleToBusinessHours(reminder);
                return;
            }

            // Update reminder status to pending
            this.dataStore.updateReminder(reminder.id, { 
                status: 'pending',
                attempts: reminder.attempts + 1,
                lastAttempt: new Date().toISOString()
            });

            // Send the reminder email
            const result = await this.emailService.sendReminderEmail(invoice, reminder.type);

            // Update reminder and invoice on success
            this.dataStore.updateReminder(reminder.id, { 
                status: 'sent',
                sentAt: new Date().toISOString(),
                messageId: result.messageId,
                provider: result.provider
            });

            // Add to invoice reminder history
            this.addToInvoiceReminderHistory(invoice, reminder, result);

            // Create notification
            this.createReminderNotification(invoice, reminder, 'sent');

            this.log(`✅ Reminder sent successfully for invoice ${invoice.number}`);

        } catch (error) {
            this.log(`❌ Failed to send reminder ${reminder.id}:`, error.message);
            
            const maxRetries = 3;
            const shouldRetry = reminder.attempts < maxRetries;

            if (shouldRetry) {
                // Schedule retry with exponential backoff
                const retryDelay = Math.pow(2, reminder.attempts) * 60 * 1000; // 1, 2, 4 minutes
                const nextAttempt = new Date(Date.now() + retryDelay);

                this.dataStore.updateReminder(reminder.id, {
                    status: 'scheduled',
                    nextAttempt: nextAttempt.toISOString(),
                    error: error.message
                });

                this.log(`🔄 Scheduled retry for reminder ${reminder.id} at ${nextAttempt}`);
            } else {
                this.dataStore.updateReminder(reminder.id, {
                    status: 'failed',
                    error: error.message,
                    failedAt: new Date().toISOString()
                });

                this.createReminderNotification(
                    this.dataStore.getInvoice(reminder.invoiceId), 
                    reminder, 
                    'failed'
                );
            }
        }
    }

    addToInvoiceReminderHistory(invoice, reminder, result) {
        if (!invoice.reminderHistory) {
            invoice.reminderHistory = [];
        }

        invoice.reminderHistory.push({
            id: reminder.id,
            type: reminder.type,
            days: reminder.days,
            sentAt: new Date().toISOString(),
            status: 'sent',
            messageId: result.messageId,
            provider: result.provider
        });

        this.dataStore.updateInvoice(invoice.id, { reminderHistory: invoice.reminderHistory });
    }

    createReminderNotification(invoice, reminder, status) {
        let message, type;
        
        switch (status) {
            case 'sent':
                message = `Reminder sent for invoice ${invoice.number} (${reminder.type})`;
                type = 'reminder-sent';
                break;
            case 'failed':
                message = `Failed to send reminder for invoice ${invoice.number}`;
                type = 'reminder-failed';
                break;
            default:
                return;
        }

        this.dataStore.addNotification({
            type: type,
            title: 'Reminder Update',
            message: message,
            invoiceId: invoice.id,
            reminderId: reminder.id
        });
    }

    isWithinBusinessHours() {
        const settings = this.dataStore.getReminderSettings();
        if (!settings.businessHours.enabled) return true;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = settings.businessHours.start.split(':').map(Number);
        const [endHour, endMinute] = settings.businessHours.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        return currentTime >= startTime && currentTime <= endTime;
    }

    rescheduleToBusinessHours(reminder) {
        const settings = this.dataStore.getReminderSettings();
        const [startHour, startMinute] = settings.businessHours.start.split(':').map(Number);
        
        const nextBusinessDay = new Date();
        nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
        nextBusinessDay.setHours(startHour, startMinute, 0, 0);

        this.dataStore.updateReminder(reminder.id, {
            nextAttempt: nextBusinessDay.toISOString(),
            rescheduledReason: 'Outside business hours'
        });
    }

    // Manual reminder operations
    async sendManualReminder(invoiceId, reminderType) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const reminder = this.dataStore.addReminder({
            invoiceId: invoiceId,
            type: reminderType,
            scheduledDate: new Date(),
            status: 'manual',
            metadata: { manual: true }
        });

        return await this.processReminder(reminder);
    }

    cancelScheduledReminders(invoiceId) {
        const reminders = this.dataStore.getReminders();
        const invoiceReminders = reminders.filter(r => 
            r.invoiceId === invoiceId && r.status === 'scheduled'
        );

        invoiceReminders.forEach(reminder => {
            this.dataStore.updateReminder(reminder.id, {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                reason: 'Manual cancellation'
            });
        });

        this.log(`🚫 Cancelled ${invoiceReminders.length} scheduled reminders for invoice ${invoiceId}`);
        return invoiceReminders.length;
    }

    // Utility methods
    loadScheduledReminders() {
        const reminders = this.dataStore.getReminders();
        const scheduledReminders = reminders.filter(r => r.status === 'scheduled');
        
        this.log(`📋 Loaded ${scheduledReminders.length} scheduled reminders`);
        return scheduledReminders;
    }

    getReminderStats() {
        return this.dataStore.getReminderStats();
    }

    getUpcomingReminders(days = 7) {
        const reminders = this.dataStore.getReminders();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + days);

        return reminders.filter(reminder => 
            reminder.status === 'scheduled' &&
            new Date(reminder.nextAttempt) <= cutoffDate
        ).sort((a, b) => new Date(a.nextAttempt) - new Date(b.nextAttempt));
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[ReminderScheduler] ${message}`, data);
        }
    }

    // Cleanup
    destroy() {
        this.stopScheduler();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReminderScheduler;
}
