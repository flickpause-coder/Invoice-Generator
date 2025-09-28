
/**
 * InvoiceGen Payment Manager
 * Handles payment tracking, reconciliation, and status management
 */

class PaymentManager {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.paymentMethods = [
            { value: 'bank_transfer', label: 'Bank Transfer' },
            { value: 'credit_card', label: 'Credit Card' },
            { value: 'debit_card', label: 'Debit Card' },
            { value: 'paypal', label: 'PayPal' },
            { value: 'stripe', label: 'Stripe' },
            { value: 'cash', label: 'Cash' },
            { value: 'check', label: 'Check' },
            { value: 'other', label: 'Other' }
        ];
    }

    // Payment Recording
    recordPayment(invoiceId, paymentData) {
        try {
            const invoice = this.dataStore.addPayment(invoiceId, paymentData);
            
            // Trigger events
            this.triggerPaymentEvent('paymentAdded', {
                invoiceId,
                payment: paymentData,
                invoice
            });
            
            return invoice;
        } catch (error) {
            console.error('Error recording payment:', error);
            throw error;
        }
    }

    // Payment Removal
    removePayment(invoiceId, paymentId) {
        try {
            const invoice = this.dataStore.removePayment(invoiceId, paymentId);
            
            // Trigger events
            this.triggerPaymentEvent('paymentRemoved', {
                invoiceId,
                paymentId,
                invoice
            });
            
            return invoice;
        } catch (error) {
            console.error('Error removing payment:', error);
            throw error;
        }
    }

    // Payment Reconciliation
    reconcilePayments(invoiceId, expectedAmount) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            throw new Error('Invoice not found');
        }

        const totalPaid = invoice.paidAmount || 0;
        const difference = expectedAmount - totalPaid;

        return {
            invoiceId,
            expectedAmount,
            actualAmount: totalPaid,
            difference,
            isReconciled: Math.abs(difference) < 0.01, // Allow for small rounding differences
            status: difference > 0 ? 'underpaid' : difference < 0 ? 'overpaid' : 'reconciled'
        };
    }

    // Bulk Payment Reconciliation
    reconcileAllPayments() {
        const invoices = this.dataStore.getInvoices();
        const reconciliationReport = {
            totalInvoices: invoices.length,
            reconciledInvoices: 0,
            discrepancies: [],
            summary: {
                reconciled: 0,
                underpaid: 0,
                overpaid: 0,
                totalDiscrepancy: 0
            }
        };

        invoices.forEach(invoice => {
            const reconciliation = this.reconcilePayments(invoice.id, invoice.total);
            
            if (reconciliation.isReconciled) {
                reconciliationReport.reconciledInvoices++;
                reconciliationReport.summary.reconciled++;
            } else {
                reconciliationReport.discrepancies.push({
                    invoiceId: invoice.id,
                    clientName: invoice.clientName,
                    ...reconciliation
                });
                
                if (reconciliation.status === 'underpaid') {
                    reconciliationReport.summary.underpaid++;
                } else {
                    reconciliationReport.summary.overpaid++;
                }
                
                reconciliationReport.summary.totalDiscrepancy += Math.abs(reconciliation.difference);
            }
        });

        return reconciliationReport;
    }

    // Payment Analytics
    getPaymentAnalytics(dateRange = null) {
        const stats = this.dataStore.getPaymentStats();
        const invoiceStats = this.dataStore.getInvoiceStats();
        
        let analytics = {
            overview: {
                totalPayments: stats.totalPayments,
                totalAmount: stats.totalPaidAmount,
                averagePayment: stats.averagePaymentAmount,
                averagePaymentTime: invoiceStats.averagePaymentTime
            },
            paymentMethods: stats.paymentMethods,
            monthlyTrends: stats.monthlyPayments,
            recentPayments: stats.recentPayments,
            collectionEfficiency: this.calculateCollectionEfficiency(),
            overdueAnalysis: this.analyzeOverdueInvoices()
        };

        // Apply date range filter if provided
        if (dateRange) {
            analytics = this.filterAnalyticsByDateRange(analytics, dateRange);
        }

        return analytics;
    }

    // Collection Efficiency Calculation
    calculateCollectionEfficiency() {
        const invoices = this.dataStore.getInvoices();
        const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
        
        return {
            totalInvoiced,
            totalCollected,
            collectionRate: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
            outstandingAmount: totalInvoiced - totalCollected
        };
    }

    // Overdue Analysis
    analyzeOverdueInvoices() {
        const overdueInvoices = this.dataStore.getOverdueInvoices();
        const analysis = {
            count: overdueInvoices.length,
            totalAmount: 0,
            averageOverdueDays: 0,
            byAgeGroup: {
                '1-30': { count: 0, amount: 0 },
                '31-60': { count: 0, amount: 0 },
                '61-90': { count: 0, amount: 0 },
                '90+': { count: 0, amount: 0 }
            },
            topOverdueClients: []
        };

        let totalOverdueDays = 0;
        const clientOverdue = {};

        overdueInvoices.forEach(invoice => {
            const amount = (invoice.total || 0) - (invoice.paidAmount || 0);
            const overdueDays = invoice.overdueDays || 0;
            
            analysis.totalAmount += amount;
            totalOverdueDays += overdueDays;

            // Group by age
            if (overdueDays <= 30) {
                analysis.byAgeGroup['1-30'].count++;
                analysis.byAgeGroup['1-30'].amount += amount;
            } else if (overdueDays <= 60) {
                analysis.byAgeGroup['31-60'].count++;
                analysis.byAgeGroup['31-60'].amount += amount;
            } else if (overdueDays <= 90) {
                analysis.byAgeGroup['61-90'].count++;
                analysis.byAgeGroup['61-90'].amount += amount;
            } else {
                analysis.byAgeGroup['90+'].count++;
                analysis.byAgeGroup['90+'].amount += amount;
            }

            // Track by client
            if (!clientOverdue[invoice.clientName]) {
                clientOverdue[invoice.clientName] = { count: 0, amount: 0 };
            }
            clientOverdue[invoice.clientName].count++;
            clientOverdue[invoice.clientName].amount += amount;
        });

        if (overdueInvoices.length > 0) {
            analysis.averageOverdueDays = totalOverdueDays / overdueInvoices.length;
        }

        // Top overdue clients
        analysis.topOverdueClients = Object.entries(clientOverdue)
            .map(([client, data]) => ({ client, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return analysis;
    }

    // Payment Reminders
    generatePaymentReminders() {
        const invoices = this.dataStore.getInvoices();
        const today = new Date();
        const reminders = {
            overdue: [],
            dueSoon: [],
            followUp: []
        };

        invoices.forEach(invoice => {
            if (invoice.status === 'overdue') {
                reminders.overdue.push({
                    invoiceId: invoice.id,
                    clientName: invoice.clientName,
                    amount: (invoice.total || 0) - (invoice.paidAmount || 0),
                    overdueDays: invoice.overdueDays || 0,
                    priority: invoice.overdueDays > 30 ? 'high' : 'medium'
                });
            } else if (invoice.status === 'sent' && invoice.dueDate) {
                const dueDate = new Date(invoice.dueDate);
                const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysUntilDue <= 7 && daysUntilDue >= 0) {
                    reminders.dueSoon.push({
                        invoiceId: invoice.id,
                        clientName: invoice.clientName,
                        amount: (invoice.total || 0) - (invoice.paidAmount || 0),
                        daysUntilDue,
                        priority: daysUntilDue <= 3 ? 'high' : 'medium'
                    });
                }
            }

            // Follow-up for partially paid invoices
            if ((invoice.paidAmount || 0) > 0 && (invoice.paidAmount || 0) < (invoice.total || 0)) {
                reminders.followUp.push({
                    invoiceId: invoice.id,
                    clientName: invoice.clientName,
                    paidAmount: invoice.paidAmount || 0,
                    remainingAmount: (invoice.total || 0) - (invoice.paidAmount || 0),
                    lastPaymentDate: invoice.lastPaymentDate
                });
            }
        });

        return reminders;
    }

    // Status Management
    updateInvoiceStatus(invoiceId, newStatus, note = '') {
        try {
            const invoice = this.dataStore.updateInvoiceStatus(invoiceId, newStatus, note);
            
            // Trigger status change event
            this.triggerPaymentEvent('statusChanged', {
                invoiceId,
                newStatus,
                note,
                invoice
            });
            
            return invoice;
        } catch (error) {
            console.error('Error updating invoice status:', error);
            throw error;
        }
    }

    // Event System
    triggerPaymentEvent(eventType, data) {
        const event = new CustomEvent(`payment${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    // Utility Methods
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getPaymentMethodLabel(value) {
        const method = this.paymentMethods.find(m => m.value === value);
        return method ? method.label : value;
    }

    // Date Range Filtering
    filterAnalyticsByDateRange(analytics, dateRange) {
        // Implementation would filter analytics data by date range
        // This is a placeholder for the actual filtering logic
        return analytics;
    }

    // Export Payment Data
    exportPaymentData(format = 'csv') {
        const invoices = this.dataStore.getInvoices();
        const payments = [];

        invoices.forEach(invoice => {
            if (invoice.paymentHistory && invoice.paymentHistory.length > 0) {
                invoice.paymentHistory.forEach(payment => {
                    payments.push({
                        invoiceId: invoice.id,
                        clientName: invoice.clientName,
                        paymentId: payment.id,
                        amount: payment.amount,
                        date: payment.date,
                        method: payment.method,
                        reference: payment.reference,
                        note: payment.note
                    });
                });
            }
        });

        if (format === 'csv') {
            return this.convertToCSV(payments);
        } else {
            return JSON.stringify(payments, null, 2);
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => 
                    JSON.stringify(row[header] || '')
                ).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }
}

// Create global instance
window.paymentManager = new PaymentManager(window.dataStore);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaymentManager;
}
