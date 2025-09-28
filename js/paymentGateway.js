
/**
 * PaymentGateway - Unified payment processing for Stripe and PayPal
 * Phase 4: Payment Integration & Client Portal
 */
class PaymentGateway {
    constructor() {
        this.stripe = null;
        this.paypal = null;
        this.config = this.loadConfig();
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    loadConfig() {
        // Load from localStorage or environment
        return {
            stripe: {
                publishableKey: localStorage.getItem('stripe_publishable_key') || 'pk_test_TYooMQauvdEDq54NiTphI7jx',
                enabled: localStorage.getItem('stripe_enabled') !== 'false'
            },
            paypal: {
                clientId: localStorage.getItem('paypal_client_id') || 'YOUR_PAYPAL_CLIENT_ID',
                enabled: localStorage.getItem('paypal_enabled') !== 'false'
            },
            serverEndpoint: localStorage.getItem('payment_server_endpoint') || '/api/payments'
        };
    }

    async init() {
        this.log('💳 Initializing Payment Gateway');
        
        // Initialize Stripe if enabled
        if (this.config.stripe.enabled && window.Stripe) {
            this.stripe = Stripe(this.config.stripe.publishableKey);
            this.log('✅ Stripe initialized');
        }

        // PayPal is initialized dynamically when needed
        this.log('🚀 Payment Gateway ready');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[PaymentGateway] ${message}`);
        }
    }

    // Stripe Payment Processing
    async processStripePayment(invoice, paymentElement) {
        try {
            this.log(`Processing Stripe payment for invoice ${invoice.id}`);

            // Submit payment details
            const { error: submitError } = await paymentElement.submit();
            if (submitError) {
                throw new Error(submitError.message);
            }

            // Create payment intent on server
            const response = await fetch(`${this.config.serverEndpoint}/stripe/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoiceId: invoice.id,
                    amount: Math.round(invoice.total * 100), // Convert to cents
                    currency: invoice.currency || 'usd',
                    metadata: {
                        invoiceId: invoice.id,
                        clientId: invoice.clientId
                    }
                })
            });

            const { client_secret: clientSecret, error } = await response.json();
            if (error) {
                throw new Error(error);
            }

            // Confirm payment
            const { error: confirmError, paymentIntent } = await this.stripe.confirmPayment({
                elements: paymentElement.elements,
                clientSecret,
                redirect: 'if_required'
            });

            if (confirmError) {
                throw new Error(confirmError.message);
            }

            // Record payment
            await this.recordPayment(invoice.id, {
                gateway: 'stripe',
                transactionId: paymentIntent.id,
                amount: paymentIntent.amount / 100,
                status: paymentIntent.status,
                paymentMethod: paymentIntent.payment_method
            });

            return {
                success: true,
                transactionId: paymentIntent.id,
                status: paymentIntent.status
            };

        } catch (error) {
            this.log(`❌ Stripe payment failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // PayPal Payment Processing
    async processPayPalPayment(invoice) {
        try {
            this.log(`Processing PayPal payment for invoice ${invoice.id}`);

            return new Promise((resolve, reject) => {
                paypal.Buttons({
                    style: {
                        layout: 'vertical',
                        color: 'gold',
                        shape: 'rect',
                        label: 'paypal'
                    },

                    createOrder: async () => {
                        const response = await fetch(`${this.config.serverEndpoint}/paypal/create-order`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                invoiceId: invoice.id,
                                amount: invoice.total.toFixed(2),
                                currency: invoice.currency || 'USD',
                                description: `Invoice ${invoice.number}`,
                                reference_id: invoice.id
                            })
                        });

                        const { id, error } = await response.json();
                        if (error) {
                            throw new Error(error);
                        }
                        return id;
                    },

                    onApprove: async (data) => {
                        try {
                            const response = await fetch(`${this.config.serverEndpoint}/paypal/capture-order`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    orderID: data.orderID,
                                    invoiceId: invoice.id
                                })
                            });

                            const details = await response.json();
                            
                            // Record payment
                            await this.recordPayment(invoice.id, {
                                gateway: 'paypal',
                                transactionId: data.orderID,
                                amount: parseFloat(details.purchase_units[0].amount.value),
                                status: 'completed',
                                paymentMethod: 'paypal'
                            });

                            resolve({
                                success: true,
                                transactionId: data.orderID,
                                status: 'completed'
                            });

                        } catch (error) {
                            reject(new Error(`PayPal capture failed: ${error.message}`));
                        }
                    },

                    onCancel: () => {
                        resolve({
                            success: false,
                            error: 'Payment cancelled by user'
                        });
                    },

                    onError: (err) => {
                        reject(new Error(`PayPal error: ${err.message || 'Unknown error'}`));
                    }

                }).render('#paypal-button-container');
            });

        } catch (error) {
            this.log(`❌ PayPal payment failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Record payment in the system
    async recordPayment(invoiceId, paymentData) {
        try {
            // Get existing payment manager
            const paymentManager = window.paymentManager;
            if (!paymentManager) {
                throw new Error('Payment manager not available');
            }

            // Add payment record
            const payment = {
                id: this.generateId(),
                invoiceId: invoiceId,
                gateway: paymentData.gateway,
                transactionId: paymentData.transactionId,
                amount: paymentData.amount,
                status: paymentData.status,
                paymentMethod: paymentData.paymentMethod,
                processedAt: new Date().toISOString(),
                metadata: paymentData.metadata || {}
            };

            // Update invoice payment tracking
            paymentManager.addPayment(invoiceId, payment);

            // Update invoice status if fully paid
            const invoice = window.dataStore.getInvoice(invoiceId);
            if (invoice) {
                const totalPaid = paymentManager.getTotalPaid(invoiceId);
                if (totalPaid >= invoice.total) {
                    paymentManager.updatePaymentStatus(invoiceId, 'paid', {
                        fullyPaidAt: new Date().toISOString(),
                        gateway: paymentData.gateway
                    });
                }
            }

            this.log(`✅ Payment recorded: ${paymentData.transactionId}`);
            return payment;

        } catch (error) {
            this.log(`❌ Failed to record payment: ${error.message}`);
            throw error;
        }
    }

    // Create Stripe Payment Element
    createStripePaymentElement(containerId, amount, currency = 'usd') {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        const elements = this.stripe.elements({
            mode: 'payment',
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            appearance: {
                theme: 'stripe',
                variables: {
                    colorPrimary: '#0570de',
                    colorBackground: '#ffffff',
                    colorText: '#30313d',
                    colorDanger: '#df1b41',
                    fontFamily: 'Ideal Sans, system-ui, sans-serif',
                    spacingUnit: '2px',
                    borderRadius: '4px'
                }
            }
        });

        const paymentElement = elements.create('payment', {
            layout: 'tabs'
        });

        paymentElement.mount(containerId);

        return {
            elements,
            paymentElement
        };
    }

    // Initialize PayPal buttons
    initializePayPalButtons(containerId, invoice) {
        if (!window.paypal) {
            throw new Error('PayPal SDK not loaded');
        }

        return this.processPayPalPayment(invoice);
    }

    // Utility functions
    generateId() {
        return 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Configuration management
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Save to localStorage
        if (newConfig.stripe) {
            if (newConfig.stripe.publishableKey) {
                localStorage.setItem('stripe_publishable_key', newConfig.stripe.publishableKey);
            }
            if (typeof newConfig.stripe.enabled !== 'undefined') {
                localStorage.setItem('stripe_enabled', newConfig.stripe.enabled.toString());
            }
        }

        if (newConfig.paypal) {
            if (newConfig.paypal.clientId) {
                localStorage.setItem('paypal_client_id', newConfig.paypal.clientId);
            }
            if (typeof newConfig.paypal.enabled !== 'undefined') {
                localStorage.setItem('paypal_enabled', newConfig.paypal.enabled.toString());
            }
        }

        if (newConfig.serverEndpoint) {
            localStorage.setItem('payment_server_endpoint', newConfig.serverEndpoint);
        }

        this.log('💾 Configuration updated');
    }

    // Get available payment methods for an invoice
    getAvailablePaymentMethods(invoice) {
        const methods = [];

        if (this.config.stripe.enabled && this.stripe) {
            methods.push({
                id: 'stripe',
                name: 'Credit/Debit Card',
                description: 'Pay securely with your credit or debit card',
                icon: '💳',
                processor: 'stripe'
            });
        }

        if (this.config.paypal.enabled && window.paypal) {
            methods.push({
                id: 'paypal',
                name: 'PayPal',
                description: 'Pay with your PayPal account',
                icon: '🅿️',
                processor: 'paypal'
            });
        }

        return methods;
    }
}

// Export for use in other modules
window.PaymentGateway = PaymentGateway;
