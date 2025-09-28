/**
 * InvoiceGen PDF Generator
 * Handles PDF generation for invoices using jsPDF
 */

class PDFGenerator {
    constructor() {
        this.loadjsPDF();
    }

    loadjsPDF() {
        // Check if jsPDF is already loaded
        if (typeof window.jsPDF !== 'undefined') {
            return;
        }

        // Load jsPDF from CDN if not already loaded
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
            console.log('jsPDF loaded successfully');
        };
        document.head.appendChild(script);
    }

    generateInvoicePDF(invoice, client = null) {
        return new Promise((resolve, reject) => {
            try {
                // Wait for jsPDF to load if needed
                const checkjsPDF = () => {
                    if (typeof window.jsPDF !== 'undefined') {
                        this.createPDF(invoice, client);
                        resolve();
                    } else {
                        setTimeout(checkjsPDF, 100);
                    }
                };
                checkjsPDF();
            } catch (error) {
                console.error('Error generating PDF:', error);
                reject(error);
            }
        });
    }

    createPDF(invoice, client) {
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();

        // Page dimensions
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 20;

        // Colors
        const primaryColor = [59, 130, 246]; // Blue
        const textColor = [55, 65, 81]; // Gray-700
        const lightGray = [243, 244, 246]; // Gray-100

        let yPosition = margin;

        // Header
        this.addHeader(doc, pageWidth, margin, yPosition, primaryColor);
        yPosition += 40;

        // Invoice details
        yPosition = this.addInvoiceDetails(doc, invoice, margin, yPosition, textColor);
        yPosition += 20;

        // Client details
        if (client) {
            yPosition = this.addClientDetails(doc, client, margin, yPosition, textColor);
        }
        yPosition += 20;

        // Items table
        yPosition = this.addItemsTable(doc, invoice, margin, pageWidth, yPosition, primaryColor, textColor, lightGray);
        yPosition += 20;

        // Totals
        yPosition = this.addTotals(doc, invoice, pageWidth, margin, yPosition, primaryColor, textColor);

        // Footer
        this.addFooter(doc, pageWidth, pageHeight, margin, textColor);

        // Save the PDF
        doc.save(`${invoice.id}.pdf`);
    }

    addHeader(doc, pageWidth, margin, yPosition, primaryColor) {
        // Company name
        doc.setFontSize(24);
        doc.setTextColor(...primaryColor);
        doc.setFont(undefined, 'bold');
        doc.text('InvoiceGen', margin, yPosition);

        // Invoice title
        doc.setFontSize(18);
        doc.setTextColor(55, 65, 81);
        doc.text('INVOICE', pageWidth - margin - 40, yPosition);

        // Line under header
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(2);
        doc.line(margin, yPosition + 5, pageWidth - margin, yPosition + 5);
    }

    addInvoiceDetails(doc, invoice, margin, yPosition, textColor) {
        doc.setFontSize(12);
        doc.setTextColor(...textColor);
        doc.setFont(undefined, 'normal');

        const details = [
            ['Invoice #:', invoice.id],
            ['Date:', this.formatDate(invoice.date)],
            ['Due Date:', this.formatDate(invoice.dueDate)],
            ['Status:', this.capitalizeFirst(invoice.status)]
        ];

        details.forEach(([label, value], index) => {
            doc.setFont(undefined, 'bold');
            doc.text(label, margin, yPosition + (index * 8));
            doc.setFont(undefined, 'normal');
            doc.text(value, margin + 40, yPosition + (index * 8));
        });

        return yPosition + (details.length * 8);
    }

    addClientDetails(doc, client, margin, yPosition, textColor) {
        doc.setFontSize(14);
        doc.setTextColor(...textColor);
        doc.setFont(undefined, 'bold');
        doc.text('Bill To:', margin, yPosition);

        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');

        const clientInfo = [
            client.name,
            client.company,
            client.email,
            client.phone,
            client.address
        ].filter(info => info); // Remove empty values

        clientInfo.forEach((info, index) => {
            doc.text(info, margin, yPosition + (index * 6));
        });

        return yPosition + (clientInfo.length * 6);
    }

    addItemsTable(doc, invoice, margin, pageWidth, yPosition, primaryColor, textColor, lightGray) {
        const tableWidth = pageWidth - (margin * 2);
        const colWidths = [80, 20, 30, 40]; // Description, Qty, Rate, Amount
        const rowHeight = 10;

        // Table header
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');

        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.setFont(undefined, 'bold');

        const headers = ['Description', 'Qty', 'Rate', 'Amount'];
        let xPosition = margin + 5;

        headers.forEach((header, index) => {
            doc.text(header, xPosition, yPosition + 7);
            xPosition += colWidths[index];
        });

        yPosition += rowHeight;

        // Table rows
        doc.setFont(undefined, 'normal');
        invoice.items.forEach((item, index) => {
            if (index % 2 === 1) {
                doc.setFillColor(248, 250, 252); // Light gray for alternate rows
                doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
            }

            xPosition = margin + 5;
            const rowData = [
                item.description,
                item.quantity.toString(),
                `$${item.rate.toFixed(2)}`,
                `$${item.amount.toFixed(2)}`
            ];

            rowData.forEach((data, colIndex) => {
                if (colIndex === 0) {
                    // Description - left aligned
                    doc.text(data, xPosition, yPosition + 7);
                } else {
                    // Numbers - right aligned
                    const textWidth = doc.getTextWidth(data);
                    doc.text(data, xPosition + colWidths[colIndex] - textWidth - 5, yPosition + 7);
                }
                xPosition += colWidths[colIndex];
            });

            yPosition += rowHeight;
        });

        // Table border
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPosition - (invoice.items.length * rowHeight) - rowHeight, tableWidth, (invoice.items.length + 1) * rowHeight);

        return yPosition;
    }

    addTotals(doc, invoice, pageWidth, margin, yPosition, primaryColor, textColor) {
        const totalsX = pageWidth - margin - 80;
        
        doc.setFontSize(12);
        doc.setTextColor(...textColor);

        // Subtotal
        doc.setFont(undefined, 'normal');
        doc.text('Subtotal:', totalsX, yPosition);
        doc.text(`$${invoice.subtotal.toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });

        yPosition += 8;

        // Tax (if applicable)
        if (invoice.tax > 0) {
            doc.text('Tax:', totalsX, yPosition);
            doc.text(`$${invoice.tax.toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
            yPosition += 8;
        }

        // Total
        doc.setFont(undefined, 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...primaryColor);
        doc.text('Total:', totalsX, yPosition);
        doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - margin - 5, yPosition, { align: 'right' });

        // Line above total
        doc.setDrawColor(...primaryColor);
        doc.setLineWidth(1);
        doc.line(totalsX, yPosition - 3, pageWidth - margin, yPosition - 3);

        return yPosition + 10;
    }

    addFooter(doc, pageWidth, pageHeight, margin, textColor) {
        const footerY = pageHeight - margin - 20;
        
        doc.setFontSize(10);
        doc.setTextColor(...textColor);
        doc.setFont(undefined, 'normal');

        // Footer text
        const footerText = 'Thank you for your business!';
        const textWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - textWidth) / 2, footerY);

        // Contact info
        const contactInfo = 'Generated by InvoiceGen • www.invoicegen.com';
        const contactWidth = doc.getTextWidth(contactInfo);
        doc.text(contactInfo, (pageWidth - contactWidth) / 2, footerY + 10);
    }

    // Utility methods
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Preview invoice in new window
    previewInvoice(invoice, client = null) {
        const previewWindow = window.open('', '_blank', 'width=800,height=600');
        
        const previewHTML = this.generatePreviewHTML(invoice, client);
        previewWindow.document.write(previewHTML);
        previewWindow.document.close();
    }

    generatePreviewHTML(invoice, client) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice ${invoice.id} - Preview</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #374151; }
                .header { border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; color: #3b82f6; }
                .invoice-title { font-size: 18px; float: right; }
                .details { margin-bottom: 20px; }
                .details-row { margin-bottom: 5px; }
                .label { font-weight: bold; display: inline-block; width: 100px; }
                .client-info { margin-bottom: 20px; }
                .client-title { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
                .items-table th { background-color: #f3f4f6; font-weight: bold; }
                .items-table .amount { text-align: right; }
                .totals { float: right; width: 200px; }
                .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total-final { font-weight: bold; font-size: 16px; color: #3b82f6; border-top: 1px solid #3b82f6; padding-top: 5px; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #6b7280; }
                .print-btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
                .print-btn:hover { background: #2563eb; }
            </style>
        </head>
        <body>
            <button class="print-btn" onclick="window.print()">Print Invoice</button>
            
            <div class="header">
                <div class="company-name">InvoiceGen</div>
                <div class="invoice-title">INVOICE</div>
                <div style="clear: both;"></div>
            </div>

            <div class="details">
                <div class="details-row"><span class="label">Invoice #:</span> ${invoice.id}</div>
                <div class="details-row"><span class="label">Date:</span> ${this.formatDate(invoice.date)}</div>
                <div class="details-row"><span class="label">Due Date:</span> ${this.formatDate(invoice.dueDate)}</div>
                <div class="details-row"><span class="label">Status:</span> ${this.capitalizeFirst(invoice.status)}</div>
            </div>

            ${client ? `
            <div class="client-info">
                <div class="client-title">Bill To:</div>
                <div>${client.name}</div>
                <div>${client.company}</div>
                <div>${client.email}</div>
                <div>${client.phone}</div>
                <div>${client.address}</div>
            </div>
            ` : ''}

            <table class="items-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${invoice.items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td>${item.quantity}</td>
                            <td class="amount">$${item.rate.toFixed(2)}</td>
                            <td class="amount">$${item.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>$${invoice.subtotal.toFixed(2)}</span>
                </div>
                ${invoice.tax > 0 ? `
                <div class="totals-row">
                    <span>Tax:</span>
                    <span>$${invoice.tax.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="totals-row total-final">
                    <span>Total:</span>
                    <span>$${invoice.total.toFixed(2)}</span>
                </div>
            </div>

            <div style="clear: both;"></div>

            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Generated by InvoiceGen • www.invoicegen.com</p>
            </div>
        </body>
        </html>
        `;
    }
}

// Create global instance
window.pdfGenerator = new PDFGenerator();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
