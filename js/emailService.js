
/**
 * EmailService - Email integration for reminder system
 * Phase 3: Automated email notifications with template support
 */
class EmailService {
    constructor(dataStore) {
        this.dataStore = dataStore;
        this.emailConfig = this.loadEmailConfig();
        this.templateEngine = new EmailTemplateEngine();
        this.debugMode = localStorage.getItem('debugMode') === 'true';
    }

    loadEmailConfig() {
        const defaultConfig = {
            provider: 'smtp', // smtp, sendgrid, mailgun, ses
            smtp: {
                host: '',
                port: 587,
                secure: false,
                auth: {
                    user: '',
                    pass: ''
                }
            },
            sendgrid: {
                apiKey: ''
            },
            mailgun: {
                apiKey: '',
                domain: ''
            },
            ses: {
                accessKeyId: '',
                secretAccessKey: '',
                region: 'us-east-1'
            },
            from: {
                name: 'InvoiceGen',
                email: 'noreply@invoicegen.com'
            },
            replyTo: '',
            testMode: true // Set to false for production
        };

        const saved = localStorage.getItem('emailConfig');
        return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    }

    saveEmailConfig(config) {
        this.emailConfig = { ...this.emailConfig, ...config };
        localStorage.setItem('emailConfig', JSON.stringify(this.emailConfig));
    }

    async sendReminderEmail(invoice, reminderType, customTemplate = null) {
        try {
            const client = this.dataStore.getClient(invoice.clientId);
            if (!client || !client.email) {
                throw new Error('Client email not found');
            }

            const template = customTemplate || this.getTemplateForReminderType(reminderType);
            const emailContent = this.templateEngine.renderTemplate(template, {
                invoice,
                client,
                reminderType
            });

            const emailData = {
                to: {
                    email: client.email,
                    name: client.name
                },
                from: this.emailConfig.from,
                replyTo: this.emailConfig.replyTo || this.emailConfig.from.email,
                subject: emailContent.subject,
                html: emailContent.html,
                text: emailContent.text,
                metadata: {
                    invoiceId: invoice.id,
                    reminderType: reminderType,
                    timestamp: new Date().toISOString()
                }
            };

            if (this.emailConfig.testMode) {
                return this.simulateEmailSend(emailData);
            }

            switch (this.emailConfig.provider) {
                case 'smtp':
                    return await this.sendViaSMTP(emailData);
                case 'sendgrid':
                    return await this.sendViaSendGrid(emailData);
                case 'mailgun':
                    return await this.sendViaMailgun(emailData);
                case 'ses':
                    return await this.sendViaSES(emailData);
                default:
                    throw new Error(`Unsupported email provider: ${this.emailConfig.provider}`);
            }
        } catch (error) {
            this.log('Email send failed', { error: error.message, invoice: invoice.id });
            throw error;
        }
    }

    getTemplateForReminderType(reminderType) {
        const settings = this.dataStore.getReminderSettings();
        const templateId = settings.templates[reminderType];
        return this.dataStore.getEmailTemplate(templateId);
    }

    simulateEmailSend(emailData) {
        this.log('Simulating email send (test mode)', emailData);
        
        // Create a realistic delay
        return new Promise((resolve) => {
            setTimeout(() => {
                const result = {
                    success: true,
                    messageId: 'test-' + Date.now(),
                    provider: 'test',
                    timestamp: new Date().toISOString(),
                    testMode: true
                };
                
                // Add to email log for testing
                this.addToEmailLog(emailData, result);
                resolve(result);
            }, Math.random() * 1000 + 500); // 500-1500ms delay
        });
    }

    async sendViaSMTP(emailData) {
        // In a real implementation, this would use nodemailer or similar
        // For now, we'll simulate the SMTP send
        this.log('Sending via SMTP', { to: emailData.to.email });
        
        if (!this.emailConfig.smtp.host) {
            throw new Error('SMTP configuration incomplete');
        }

        // Simulate SMTP send
        return this.simulateEmailSend(emailData);
    }

    async sendViaSendGrid(emailData) {
        if (!this.emailConfig.sendgrid.apiKey) {
            throw new Error('SendGrid API key not configured');
        }

        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.emailConfig.sendgrid.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personalizations: [{
                        to: [{ email: emailData.to.email, name: emailData.to.name }],
                        subject: emailData.subject
                    }],
                    from: { email: emailData.from.email, name: emailData.from.name },
                    reply_to: { email: emailData.replyTo },
                    content: [
                        { type: 'text/plain', value: emailData.text },
                        { type: 'text/html', value: emailData.html }
                    ],
                    custom_args: emailData.metadata
                })
            });

            if (!response.ok) {
                throw new Error(`SendGrid API error: ${response.status}`);
            }

            const result = {
                success: true,
                messageId: response.headers.get('X-Message-Id'),
                provider: 'sendgrid',
                timestamp: new Date().toISOString()
            };

            this.addToEmailLog(emailData, result);
            return result;
        } catch (error) {
            throw new Error(`SendGrid send failed: ${error.message}`);
        }
    }

    async sendViaMailgun(emailData) {
        if (!this.emailConfig.mailgun.apiKey || !this.emailConfig.mailgun.domain) {
            throw new Error('Mailgun configuration incomplete');
        }

        // Mailgun implementation would go here
        return this.simulateEmailSend(emailData);
    }

    async sendViaSES(emailData) {
        if (!this.emailConfig.ses.accessKeyId || !this.emailConfig.ses.secretAccessKey) {
            throw new Error('AWS SES configuration incomplete');
        }

        // AWS SES implementation would go here
        return this.simulateEmailSend(emailData);
    }

    addToEmailLog(emailData, result) {
        const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
        
        const logEntry = {
            id: 'email-' + Date.now(),
            timestamp: new Date().toISOString(),
            to: emailData.to,
            from: emailData.from,
            subject: emailData.subject,
            provider: result.provider,
            messageId: result.messageId,
            success: result.success,
            metadata: emailData.metadata,
            testMode: result.testMode || false
        };

        emailLog.unshift(logEntry);
        
        // Keep only last 500 email logs
        if (emailLog.length > 500) {
            emailLog.splice(500);
        }

        localStorage.setItem('emailLog', JSON.stringify(emailLog));
    }

    getEmailLog() {
        return JSON.parse(localStorage.getItem('emailLog') || '[]');
    }

    async testEmailConfiguration() {
        const testEmail = {
            to: {
                email: this.emailConfig.from.email,
                name: 'Test User'
            },
            from: this.emailConfig.from,
            subject: 'InvoiceGen Email Configuration Test',
            html: '<p>This is a test email to verify your email configuration is working correctly.</p>',
            text: 'This is a test email to verify your email configuration is working correctly.',
            metadata: {
                type: 'test',
                timestamp: new Date().toISOString()
            }
        };

        try {
            const result = await this.sendViaSMTP(testEmail);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[EmailService] ${message}`, data);
        }
    }
}

/**
 * EmailTemplateEngine - Template rendering with variable substitution
 */
class EmailTemplateEngine {
    renderTemplate(template, data) {
        if (!template) {
            throw new Error('Template not found');
        }

        const variables = this.extractVariables(data);
        
        return {
            subject: this.replaceVariables(template.subject, variables),
            html: this.replaceVariables(template.htmlContent, variables),
            text: this.replaceVariables(template.textContent, variables)
        };
    }

    extractVariables(data) {
        const { invoice, client, reminderType } = data;
        const currentDate = new Date();
        const dueDate = new Date(invoice.dueDate);
        const daysDiff = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));

        return {
            // Client variables
            clientName: client?.name || 'Valued Customer',
            clientEmail: client?.email || '',
            clientCompany: client?.company || '',
            
            // Invoice variables
            invoiceNumber: invoice.number || invoice.id,
            amount: this.formatCurrency(invoice.total || 0),
            currency: invoice.currency || '$',
            dueDate: this.formatDate(dueDate),
            issueDate: this.formatDate(new Date(invoice.date)),
            
            // Reminder variables
            daysUntilDue: Math.max(0, daysDiff),
            daysOverdue: Math.max(0, -daysDiff),
            reminderType: reminderType,
            
            // Company variables
            companyName: this.getCompanyInfo().name,
            companyEmail: this.getCompanyInfo().email,
            companyPhone: this.getCompanyInfo().phone,
            companyAddress: this.getCompanyInfo().address,
            
            // System variables
            currentDate: this.formatDate(currentDate),
            year: currentDate.getFullYear()
        };
    }

    replaceVariables(template, variables) {
        let result = template;
        
        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, variables[key] || '');
        });
        
        return result;
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
            month: 'long',
            day: 'numeric'
        }).format(date);
    }

    getCompanyInfo() {
        const defaultInfo = {
            name: 'InvoiceGen',
            email: 'support@invoicegen.com',
            phone: '',
            address: ''
        };

        const saved = localStorage.getItem('companyInfo');
        return saved ? { ...defaultInfo, ...JSON.parse(saved) } : defaultInfo;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmailService, EmailTemplateEngine };
}
