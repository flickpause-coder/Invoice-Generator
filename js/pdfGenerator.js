
/**
 * PDFGenerator - PDF generation with reminder integration
 * Phase 3: Enhanced PDF generation with reminder tracking
 */
class PDFGenerator {
    constructor() {
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    init() {
        this.log('📄 Initializing PDF Generator');
    }

    async generateInvoicePDF(invoice, options = {}) {
        try {
            this.log(`📄 Generating PDF for invoice ${invoice.number}`);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Set up document properties
            doc.setProperties({
                title: `Invoice ${invoice.number}`,
                subject: 'Invoice',
                author: 'InvoiceGen',
                creator: 'InvoiceGen'
            });

            // Generate PDF content
            this.addHeader(doc, invoice);
            this.addInvoiceDetails(doc, invoice);
            this.addItemsTable(doc, invoice);
            this.addTotals(doc, invoice);
            this.addFooter(doc, invoice);

            // Add reminder information if available
            if (invoice.reminderHistory && invoice.reminderHistory.length > 0) {
                this.addReminderHistory(doc, invoice);
            }

            const pdfBlob = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);

            this.log(`✅ PDF generated successfully for invoice ${invoice.number}`);

            return {
                blob: pdfBlob,
                url: pdfUrl,
                filename: `invoice-${invoice.number}.pdf`
            };

        } catch (error) {
            this.log(`❌ PDF generation failed for invoice ${invoice.number}:`, error.message);
            throw error;
        }
    }

    addHeader(doc, invoice) {
        // Company logo and info
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('INVOICE', 20, 30);

        // Company details
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        const companyInfo = this.getCompanyInfo();
        doc.text(companyInfo.name, 20, 45);
        if (companyInfo.address) doc.text(companyInfo.address, 20, 55);
        if (companyInfo.phone) doc.text(`Phone: ${companyInfo.phone}`, 20, 65);
        if (companyInfo.email) doc.text(`Email: ${companyInfo.email}`, 20, 75);

        // Invoice number and date
        doc.setFont(undefined, 'bold');
        doc.text(`Invoice #: ${invoice.number}`, 120, 45);
        doc.setFont(undefined, 'normal');
        doc.text(`Date: ${this.formatDate(new Date(invoice.date))}`, 120, 55);
        doc.text(`Due Date: ${this.formatDate(new Date(invoice.dueDate))}`, 120, 65);

        // Status badge
        this.addStatusBadge(doc, invoice.status, 120, 75);
    }

    addInvoiceDetails(doc, invoice) {
        // Bill to section
        doc.setFont(undefined, 'bold');
        doc.text('Bill To:', 20, 95);
        
        doc.setFont(undefined, 'normal');
        const client = this.getClientInfo(invoice.clientId);
        let yPos = 105;
        
        if (client.name) {
            doc.text(client.name, 20, yPos);
            yPos += 10;
        }
        if (client.company) {
            doc.text(client.company, 20, yPos);
            yPos += 10;
        }
        if (client.address) {
            doc.text(client.address, 20, yPos);
            yPos += 10;
        }
        if (client.email) {
            doc.text(client.email, 20, yPos);
            yPos += 10;
        }
    }

    addItemsTable(doc, invoice) {
        const startY = 140;
        const items = invoice.items || [];

        // Table headers
        doc.setFont(undefined, 'bold');
        doc.text('Description', 20, startY);
        doc.text('Qty', 120, startY);
        doc.text('Rate', 140, startY);
        doc.text('Amount', 170, startY);

        // Table line
        doc.line(20, startY + 5, 190, startY + 5);

        // Table rows
        doc.setFont(undefined, 'normal');
        let yPos = startY + 15;

        items.forEach(item => {
            doc.text(item.description || '', 20, yPos);
            doc.text(String(item.quantity || 0), 120, yPos);
            doc.text(`$${this.formatCurrency(item.rate || 0)}`, 140, yPos);
            doc.text(`$${this.formatCurrency((item.quantity || 0) * (item.rate || 0))}`, 170, yPos);
            yPos += 10;
        });

        return yPos;
    }

    addTotals(doc, invoice) {
        const startY = 200;

        // Subtotal
        doc.text('Subtotal:', 140, startY);
        doc.text(`$${this.formatCurrency(invoice.subtotal || 0)}`, 170, startY);

        // Tax
        if (invoice.tax && invoice.tax > 0) {
            doc.text('Tax:', 140, startY + 10);
            doc.text(`$${this.formatCurrency(invoice.tax)}`, 170, startY + 10);
        }

        // Total
        doc.setFont(undefined, 'bold');
        doc.text('Total:', 140, startY + 20);
        doc.text(`$${this.formatCurrency(invoice.total || 0)}`, 170, startY + 20);

        // Payment status
        if (invoice.paymentTracking) {
            const paymentStatus = this.getPaymentStatus(invoice);
            doc.setFont(undefined, 'normal');
            doc.text('Amount Paid:', 140, startY + 35);
            doc.text(`$${this.formatCurrency(paymentStatus.totalPaid)}`, 170, startY + 35);
            doc.text('Balance Due:', 140, startY + 45);
            doc.text(`$${this.formatCurrency(paymentStatus.totalDue)}`, 170, startY + 45);
        }
    }

    addFooter(doc, invoice) {
        const pageHeight = doc.internal.pageSize.height;
        const footerY = pageHeight - 30;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        if (invoice.notes) {
            doc.text('Notes:', 20, footerY - 20);
            doc.text(invoice.notes, 20, footerY - 10);
        }

        doc.text('Thank you for your business!', 20, footerY);
    }

    addReminderHistory(doc, invoice) {
        // Add a new page for reminder history
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Reminder History', 20, 30);

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        let yPos = 50;
        invoice.reminderHistory.forEach((reminder, index) => {
            doc.text(`${index + 1}. ${reminder.type} reminder sent on ${this.formatDate(new Date(reminder.sentAt))}`, 20, yPos);
            if (reminder.messageId) {
                doc.text(`   Message ID: ${reminder.messageId}`, 25, yPos + 8);
            }
            yPos += 20;
        });
    }

    addStatusBadge(doc, status, x, y) {
        const statusColors = {
            draft: [128, 128, 128],
            sent: [59, 130, 246],
            paid: [34, 197, 94],
            overdue: [239, 68, 68],
            partial: [245, 158, 11]
        };

        const color = statusColors[status] || [128, 128, 128];
        
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y - 5, 30, 8, 2, 2, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(status.toUpperCase(), x + 2, y);
        
        // Reset text color
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
    }

    // Utility methods
    getCompanyInfo() {
        const defaultInfo = {
            name: 'InvoiceGen',
            address: '',
            phone: '',
            email: 'support@invoicegen.com'
        };

        const saved = localStorage.getItem('companyInfo');
        return saved ? { ...defaultInfo, ...JSON.parse(saved) } : defaultInfo;
    }

    getClientInfo(clientId) {
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        return clients.find(client => client.id === clientId) || {};
    }

    getPaymentStatus(invoice) {
        if (!invoice.paymentTracking) {
            return {
                totalPaid: 0,
                totalDue: parseFloat(invoice.total || 0)
            };
        }

        const totalAmount = parseFloat(invoice.total || 0);
        const totalPaid = invoice.paymentTracking.totalPaid || 0;

        return {
            totalPaid: totalPaid,
            totalDue: totalAmount - totalPaid
        };
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[PDFGenerator] ${message}`, data);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
