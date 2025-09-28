
/**
 * PaymentManager - Enhanced payment tracking with reminder integration
 * Phase 3: Integration with reminder system and payment status workflows
 */
class PaymentManager {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    init() {
        this.log('💰 Initializing Payment Manager');
        this.migrateExistingPaymentData();
    }

    migrateExistingPaymentData() {
        const invoices = this.dataStore.getInvoices();
        let migrated = false;

        invoices.forEach(invoice => {
            if (!invoice.paymentTracking) {
                invoice.paymentTracking = {
                    status: invoice.status || 'draft',
                    totalPaid: 0,
                    payments: [],
                    lastUpdated: new Date().toISOString(),
                    remindersSent: 0,
                    lastReminderSent: null
                };
                migrated = true;
            }
        });

        if (migrated) {
            this.dataStore.setInvoices(invoices);
            this.log('📊 Migrated payment tracking data for existing invoices');
        }
    }

    // Payment status management
    updatePaymentStatus(invoiceId, newStatus, metadata = {}) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const oldStatus = invoice.status;
        const updates = {
            status: newStatus,
            'paymentTracking.status': newStatus,
            'paymentTracking.lastUpdated': new Date().toISOString()
        };

        // Handle status-specific updates
        switch (newStatus) {
            case 'sent':
                updates.sentDate = metadata.sentDate || new Date().toISOString();
                break;
            case 'paid':
                updates.paidDate = metadata.paidDate || new Date().toISOString();
                updates['paymentTracking.totalPaid'] = invoice.total;
                // Cancel any scheduled reminders
                this.cancelRemindersForInvoice(invoiceId);
                break;
            case 'overdue':
                updates.overdueDate = metadata.overdueDate || new Date().toISOString();
                break;
        }

        const updatedInvoice = this.dataStore.updateInvoice(invoiceId, updates);
        
        // Create notification for status change
        this.createPaymentStatusNotification(updatedInvoice, oldStatus, newStatus);
        
        this.log(`💰 Payment status updated: ${oldStatus} → ${newStatus} for invoice ${invoice.number}`);
        
        return updatedInvoice;
    }

    // Payment recording
    recordPayment(invoiceId, paymentData) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const payment = {
            id: 'payment-' + Date.now(),
            amount: parseFloat(paymentData.amount),
            date: paymentData.date || new Date().toISOString(),
            method: paymentData.method || 'unknown',
            reference: paymentData.reference || '',
            notes: paymentData.notes || '',
            recordedAt: new Date().toISOString()
        };

        // Initialize payment tracking if not exists
        if (!invoice.paymentTracking) {
            invoice.paymentTracking = {
                status: invoice.status,
                totalPaid: 0,
                payments: [],
                lastUpdated: new Date().toISOString()
            };
        }

        // Add payment to tracking
        invoice.paymentTracking.payments.push(payment);
        invoice.paymentTracking.totalPaid += payment.amount;
        invoice.paymentTracking.lastUpdated = new Date().toISOString();

        // Determine new payment status
        const totalAmount = parseFloat(invoice.total);
        const totalPaid = invoice.paymentTracking.totalPaid;
        
        let newStatus;
        if (totalPaid >= totalAmount) {
            newStatus = 'paid';
        } else if (totalPaid > 0) {
            newStatus = 'partial';
        } else {
            newStatus = invoice.status; // Keep current status
        }

        // Update invoice
        const updates = {
            paymentTracking: invoice.paymentTracking,
            status: newStatus === 'paid' ? 'paid' : invoice.status
        };

        if (newStatus === 'paid') {
            updates.paidDate = new Date().toISOString();
            // Cancel any scheduled reminders
            this.cancelRemindersForInvoice(invoiceId);
        }

        const updatedInvoice = this.dataStore.updateInvoice(invoiceId, updates);

        // Create notification
        this.createPaymentRecordedNotification(updatedInvoice, payment);

        this.log(`💰 Payment recorded: $${payment.amount} for invoice ${invoice.number}`);
        
        return { invoice: updatedInvoice, payment };
    }

    // Payment analysis
    getPaymentStatus(invoice) {
        if (!invoice.paymentTracking) {
            return {
                status: 'none',
                totalPaid: 0,
                totalDue: parseFloat(invoice.total || 0),
                percentagePaid: 0,
                isFullyPaid: false,
                isPartiallyPaid: false
            };
        }

        const totalAmount = parseFloat(invoice.total || 0);
        const totalPaid = invoice.paymentTracking.totalPaid || 0;
        const percentagePaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

        return {
            status: totalPaid >= totalAmount ? 'full' : totalPaid > 0 ? 'partial' : 'none',
            totalPaid: totalPaid,
            totalDue: totalAmount - totalPaid,
            percentagePaid: Math.round(percentagePaid * 100) / 100,
            isFullyPaid: totalPaid >= totalAmount,
            isPartiallyPaid: totalPaid > 0 && totalPaid < totalAmount
        };
    }

    calculateCollectionEfficiency() {
        const invoices = this.dataStore.getInvoices();
        const stats = {
            totalInvoices: invoices.length,
            totalAmount: 0,
            totalPaid: 0,
            paidInvoices: 0,
            partiallyPaidInvoices: 0,
            unpaidInvoices: 0,
            overdueInvoices: 0,
            averageDaysToPayment: 0,
            collectionRate: 0
        };

        let totalDaysToPayment = 0;
        let paidInvoicesWithDates = 0;

        invoices.forEach(invoice => {
            const amount = parseFloat(invoice.total || 0);
            const paymentStatus = this.getPaymentStatus(invoice);
            
            stats.totalAmount += amount;
            stats.totalPaid += paymentStatus.totalPaid;

            if (paymentStatus.isFullyPaid) {
                stats.paidInvoices++;
                
                // Calculate days to payment
                if (invoice.date && invoice.paidDate) {
                    const issueDate = new Date(invoice.date);
                    const paidDate = new Date(invoice.paidDate);
                    const daysToPayment = Math.ceil((paidDate - issueDate) / (1000 * 60 * 60 * 24));
                    totalDaysToPayment += daysToPayment;
                    paidInvoicesWithDates++;
                }
            } else if (paymentStatus.isPartiallyPaid) {
                stats.partiallyPaidInvoices++;
            } else {
                stats.unpaidInvoices++;
            }

            if (invoice.status === 'overdue') {
                stats.overdueInvoices++;
            }
        });

        stats.collectionRate = stats.totalAmount > 0 ? (stats.totalPaid / stats.totalAmount) * 100 : 0;
        stats.averageDaysToPayment = paidInvoicesWithDates > 0 ? totalDaysToPayment / paidInvoicesWithDates : 0;

        return stats;
    }

    // Reminder integration
    cancelRemindersForInvoice(invoiceId) {
        // This would integrate with the ReminderScheduler
        // For now, we'll emit an event that the scheduler can listen to
        const event = new CustomEvent('cancelReminders', {
            detail: { invoiceId }
        });
        document.dispatchEvent(event);
    }

    updateReminderStats(invoiceId, reminderType) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice || !invoice.paymentTracking) return;

        invoice.paymentTracking.remindersSent = (invoice.paymentTracking.remindersSent || 0) + 1;
        invoice.paymentTracking.lastReminderSent = new Date().toISOString();
        invoice.paymentTracking.lastReminderType = reminderType;

        this.dataStore.updateInvoice(invoiceId, {
            paymentTracking: invoice.paymentTracking
        });
    }

    // Aging analysis
    getAgingReport() {
        const invoices = this.dataStore.getInvoices();
        const currentDate = new Date();
        
        const aging = {
            current: { count: 0, amount: 0 }, // 0-30 days
            days30: { count: 0, amount: 0 },  // 31-60 days
            days60: { count: 0, amount: 0 },  // 61-90 days
            days90: { count: 0, amount: 0 }   // 90+ days
        };

        invoices.forEach(invoice => {
            if (invoice.status === 'paid') return;

            const dueDate = new Date(invoice.dueDate);
            const daysOverdue = Math.ceil((currentDate - dueDate) / (1000 * 60 * 60 * 24));
            const amount = parseFloat(invoice.total || 0);

            if (daysOverdue <= 0) {
                aging.current.count++;
                aging.current.amount += amount;
            } else if (daysOverdue <= 30) {
                aging.days30.count++;
                aging.days30.amount += amount;
            } else if (daysOverdue <= 60) {
                aging.days60.count++;
                aging.days60.amount += amount;
            } else {
                aging.days90.count++;
                aging.days90.amount += amount;
            }
        });

        return aging;
    }

    // Notifications
    createPaymentStatusNotification(invoice, oldStatus, newStatus) {
        let message, type;
        
        switch (newStatus) {
            case 'paid':
                message = `Invoice ${invoice.number} has been marked as paid`;
                type = 'payment-received';
                break;
            case 'overdue':
                message = `Invoice ${invoice.number} is now overdue`;
                type = 'payment-overdue';
                break;
            case 'sent':
                message = `Invoice ${invoice.number} has been sent to client`;
                type = 'invoice-sent';
                break;
            default:
                return;
        }

        this.dataStore.addNotification({
            type: type,
            title: 'Payment Status Update',
            message: message,
            invoiceId: invoice.id
        });
    }

    createPaymentRecordedNotification(invoice, payment) {
        const paymentStatus = this.getPaymentStatus(invoice);
        const message = paymentStatus.isFullyPaid 
            ? `Payment of $${payment.amount} received - Invoice ${invoice.number} is now fully paid`
            : `Partial payment of $${payment.amount} received for Invoice ${invoice.number}`;

        this.dataStore.addNotification({
            type: 'payment-recorded',
            title: 'Payment Received',
            message: message,
            invoiceId: invoice.id,
            paymentId: payment.id
        });
    }

    // Utility methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[PaymentManager] ${message}`, data);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}
