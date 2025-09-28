
/**
 * ClientPortal - Client-facing portal interface
 * Phase 4: Payment Integration & Client Portal
 */
class ClientPortal {
    constructor(dataStore, paymentGateway, clientAuth) {
        this.dataStore = dataStore;
        this.paymentGateway = paymentGateway;
        this.clientAuth = clientAuth;
        this.currentClient = null;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.config = {
            itemsPerPage: 10,
            allowedFileTypes: ['pdf', 'png', 'jpg', 'jpeg'],
            maxFileSize: 5 * 1024 * 1024 // 5MB
        };
        this.init();
    }

    async init() {
        this.log('🏢 Initializing Client Portal');
        
        // Listen for authentication events
        window.addEventListener('clientAuth', (event) => {
            this.handleAuthEvent(event.detail);
        });

        // Check if client is already authenticated
        if (this.clientAuth.isAuthenticated()) {
            this.currentClient = this.clientAuth.getCurrentClient();
            this.log(`✅ Client portal ready for: ${this.currentClient.email}`);
        }

        this.setupEventListeners();
        this.log('🚀 Client Portal initialized');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[ClientPortal] ${message}`);
        }
    }

    // Handle authentication events
    handleAuthEvent(detail) {
        const { type, data } = detail;
        
        switch (type) {
            case 'login':
            case 'register':
            case 'restored':
                this.currentClient = data;
                this.onClientAuthenticated();
                break;
            case 'logout':
            case 'session_expired':
                this.currentClient = null;
                this.onClientLoggedOut();
                break;
            case 'profile_updated':
                this.currentClient = data;
                this.refreshClientInfo();
                break;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-portal-nav]')) {
                e.preventDefault();
                const section = e.target.dataset.portalNav;
                this.navigateToSection(section);
            }
        });

        // Payment method selection
        document.addEventListener('change', (e) => {
            if (e.target.matches('[name="payment-method"]')) {
                this.handlePaymentMethodChange(e.target.value);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('#client-login-form')) {
                e.preventDefault();
                this.handleLogin(e.target);
            } else if (e.target.matches('#client-register-form')) {
                e.preventDefault();
                this.handleRegistration(e.target);
            } else if (e.target.matches('#payment-form')) {
                e.preventDefault();
                this.handlePaymentSubmission(e.target);
            } else if (e.target.matches('#profile-form')) {
                e.preventDefault();
                this.handleProfileUpdate(e.target);
            }
        });
    }

    // Client authenticated callback
    onClientAuthenticated() {
        this.log(`👋 Welcome ${this.currentClient.name || this.currentClient.email}`);
        this.renderPortalDashboard();
        this.loadClientInvoices();
    }

    // Client logged out callback
    onClientLoggedOut() {
        this.log('👋 Client logged out');
        this.renderLoginForm();
    }

    // Navigate to portal section
    navigateToSection(section) {
        if (!this.currentClient) {
            this.renderLoginForm();
            return;
        }

        const sections = ['dashboard', 'invoices', 'payments', 'profile', 'settings'];
        if (!sections.includes(section)) {
            section = 'dashboard';
        }

        // Update active navigation
        document.querySelectorAll('[data-portal-nav]').forEach(nav => {
            nav.classList.toggle('active', nav.dataset.portalNav === section);
        });

        // Render section content
        switch (section) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'invoices':
                this.renderInvoices();
                break;
            case 'payments':
                this.renderPayments();
                break;
            case 'profile':
                this.renderProfile();
                break;
            case 'settings':
                this.renderSettings();
                break;
        }
    }

    // Render login form
    renderLoginForm() {
        const container = document.getElementById('portal-content') || document.body;
        container.innerHTML = `
            <div class="client-portal-login">
                <div class="login-container">
                    <div class="login-header">
                        <h2>Client Portal</h2>
                        <p>Access your invoices and make payments</p>
                    </div>
                    
                    <div class="login-tabs">
                        <button type="button" class="tab-btn active" data-tab="login">Sign In</button>
                        <button type="button" class="tab-btn" data-tab="register">Register</button>
                    </div>

                    <!-- Login Form -->
                    <form id="client-login-form" class="auth-form active">
                        <div class="form-group">
                            <label for="login-email">Email Address</label>
                            <input type="email" id="login-email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="login-password">Password</label>
                            <input type="password" id="login-password" name="password" required>
                        </div>
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" name="rememberMe">
                                <span>Remember me</span>
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary">Sign In</button>
                        <div class="form-links">
                            <a href="#" data-action="forgot-password">Forgot Password?</a>
                        </div>
                    </form>

                    <!-- Registration Form -->
                    <form id="client-register-form" class="auth-form">
                        <div class="form-group">
                            <label for="register-name">Full Name</label>
                            <input type="text" id="register-name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="register-email">Email Address</label>
                            <input type="email" id="register-email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="register-company">Company (Optional)</label>
                            <input type="text" id="register-company" name="company">
                        </div>
                        <div class="form-group">
                            <label for="register-password">Password</label>
                            <input type="password" id="register-password" name="password" required>
                            <div class="password-strength" id="password-strength"></div>
                        </div>
                        <div class="form-group">
                            <label for="register-confirm-password">Confirm Password</label>
                            <input type="password" id="register-confirm-password" name="confirmPassword" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Account</button>
                    </form>

                    <div id="auth-message" class="message"></div>
                </div>
            </div>
        `;

        this.setupLoginFormEvents();
    }

    // Setup login form events
    setupLoginFormEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`client-${tab}-form`).classList.add('active');
            });
        });

        // Password strength indicator
        const passwordInput = document.getElementById('register-password');
        const strengthIndicator = document.getElementById('password-strength');
        
        if (passwordInput && strengthIndicator) {
            passwordInput.addEventListener('input', () => {
                const validation = this.clientAuth.validatePassword(passwordInput.value);
                strengthIndicator.innerHTML = `
                    <div class="strength-bar ${validation.strength}"></div>
                    <span class="strength-text">Password strength: ${validation.strength}</span>
                `;
            });
        }

        // Forgot password
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="forgot-password"]')) {
                e.preventDefault();
                this.handleForgotPassword();
            }
        });
    }

    // Handle login form submission
    async handleLogin(form) {
        const formData = new FormData(form);
        const email = formData.get('email');
        const password = formData.get('password');
        const rememberMe = formData.get('rememberMe') === 'on';

        this.showMessage('Signing in...', 'info');

        const result = await this.clientAuth.login(email, password, rememberMe);
        
        if (result.success) {
            this.showMessage('Welcome back!', 'success');
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    // Handle registration form submission
    async handleRegistration(form) {
        const formData = new FormData(form);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        // Validate passwords match
        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return;
        }

        // Validate password strength
        const validation = this.clientAuth.validatePassword(password);
        if (!validation.isValid) {
            this.showMessage(validation.errors.join('. '), 'error');
            return;
        }

        const clientData = {
            name: formData.get('name'),
            email: formData.get('email'),
            company: formData.get('company'),
            password: password
        };

        this.showMessage('Creating account...', 'info');

        const result = await this.clientAuth.register(clientData);
        
        if (result.success) {
            this.showMessage('Account created successfully!', 'success');
        } else {
            this.showMessage(result.error, 'error');
        }
    }

    // Render portal dashboard
    renderPortalDashboard() {
        const container = document.getElementById('portal-content') || document.body;
        container.innerHTML = `
            <div class="client-portal">
                <header class="portal-header">
                    <div class="portal-nav">
                        <h1>Client Portal</h1>
                        <nav class="nav-menu">
                            <a href="#" data-portal-nav="dashboard" class="nav-link active">Dashboard</a>
                            <a href="#" data-portal-nav="invoices" class="nav-link">Invoices</a>
                            <a href="#" data-portal-nav="payments" class="nav-link">Payments</a>
                            <a href="#" data-portal-nav="profile" class="nav-link">Profile</a>
                            <a href="#" data-portal-nav="settings" class="nav-link">Settings</a>
                        </nav>
                    </div>
                    <div class="portal-user">
                        <span>Welcome, ${this.currentClient.name || this.currentClient.email}</span>
                        <button type="button" class="btn btn-outline" onclick="clientAuth.logout()">Logout</button>
                    </div>
                </header>
                <main class="portal-main" id="portal-main">
                    <!-- Content will be loaded here -->
                </main>
            </div>
        `;

        this.renderDashboard();
    }

    // Render dashboard content
    renderDashboard() {
        const main = document.getElementById('portal-main');
        const clientInvoices = this.getClientInvoices();
        const stats = this.calculateClientStats(clientInvoices);

        main.innerHTML = `
            <div class="dashboard">
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <h3>Total Invoices</h3>
                        <div class="stat-value">${stats.totalInvoices}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Outstanding Amount</h3>
                        <div class="stat-value">${this.formatCurrency(stats.outstandingAmount)}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Paid This Month</h3>
                        <div class="stat-value">${this.formatCurrency(stats.paidThisMonth)}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Overdue Invoices</h3>
                        <div class="stat-value">${stats.overdueCount}</div>
                    </div>
                </div>

                <div class="dashboard-content">
                    <div class="recent-invoices">
                        <h3>Recent Invoices</h3>
                        ${this.renderInvoiceList(clientInvoices.slice(0, 5), true)}
                    </div>
                    
                    <div class="quick-actions">
                        <h3>Quick Actions</h3>
                        <div class="action-buttons">
                            <button type="button" class="btn btn-primary" data-portal-nav="invoices">
                                View All Invoices
                            </button>
                            <button type="button" class="btn btn-outline" data-portal-nav="payments">
                                Payment History
                            </button>
                            <button type="button" class="btn btn-outline" data-portal-nav="profile">
                                Update Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Render invoices section
    renderInvoices() {
        const main = document.getElementById('portal-main');
        const clientInvoices = this.getClientInvoices();

        main.innerHTML = `
            <div class="invoices-section">
                <div class="section-header">
                    <h2>Your Invoices</h2>
                    <div class="invoice-filters">
                        <select id="status-filter">
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="viewed">Viewed</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        <input type="text" id="search-invoices" placeholder="Search invoices...">
                    </div>
                </div>
                
                <div class="invoices-list">
                    ${this.renderInvoiceList(clientInvoices)}
                </div>
            </div>
        `;

        this.setupInvoiceFilters();
    }

    // Render invoice list
    renderInvoiceList(invoices, isPreview = false) {
        if (!invoices.length) {
            return '<div class="empty-state">No invoices found</div>';
        }

        return `
            <div class="invoice-table">
                <div class="table-header">
                    <div class="col-invoice">Invoice</div>
                    <div class="col-date">Date</div>
                    <div class="col-amount">Amount</div>
                    <div class="col-status">Status</div>
                    <div class="col-actions">Actions</div>
                </div>
                ${invoices.map(invoice => `
                    <div class="table-row" data-invoice-id="${invoice.id}">
                        <div class="col-invoice">
                            <strong>${invoice.number}</strong>
                            <div class="invoice-description">${invoice.description || 'Invoice'}</div>
                        </div>
                        <div class="col-date">${this.formatDate(invoice.date)}</div>
                        <div class="col-amount">${this.formatCurrency(invoice.total)}</div>
                        <div class="col-status">
                            <span class="status-badge status-${invoice.status}">${invoice.status}</span>
                        </div>
                        <div class="col-actions">
                            <button type="button" class="btn btn-sm" onclick="clientPortal.viewInvoice('${invoice.id}')">
                                View
                            </button>
                            <button type="button" class="btn btn-sm" onclick="clientPortal.downloadInvoice('${invoice.id}')">
                                Download
                            </button>
                            ${invoice.status !== 'paid' ? `
                                <button type="button" class="btn btn-sm btn-primary" onclick="clientPortal.payInvoice('${invoice.id}')">
                                    Pay Now
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Get client's invoices
    getClientInvoices() {
        if (!this.currentClient) return [];
        
        const allInvoices = this.dataStore.getInvoices();
        return allInvoices.filter(invoice => 
            invoice.clientId === this.currentClient.id ||
            invoice.clientEmail === this.currentClient.email
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Calculate client statistics
    calculateClientStats(invoices) {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return {
            totalInvoices: invoices.length,
            outstandingAmount: invoices
                .filter(inv => inv.status !== 'paid')
                .reduce((sum, inv) => sum + inv.total, 0),
            paidThisMonth: invoices
                .filter(inv => inv.status === 'paid' && new Date(inv.date) >= thisMonth)
                .reduce((sum, inv) => sum + inv.total, 0),
            overdueCount: invoices
                .filter(inv => inv.status === 'overdue').length
        };
    }

    // View invoice details
    async viewInvoice(invoiceId) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            this.showMessage('Invoice not found', 'error');
            return;
        }

        // Create modal for invoice view
        const modal = this.createModal('Invoice Details', `
            <div class="invoice-view">
                <div class="invoice-header">
                    <h3>Invoice ${invoice.number}</h3>
                    <span class="status-badge status-${invoice.status}">${invoice.status}</span>
                </div>
                
                <div class="invoice-details">
                    <div class="detail-row">
                        <label>Date:</label>
                        <span>${this.formatDate(invoice.date)}</span>
                    </div>
                    <div class="detail-row">
                        <label>Due Date:</label>
                        <span>${this.formatDate(invoice.dueDate)}</span>
                    </div>
                    <div class="detail-row">
                        <label>Amount:</label>
                        <span>${this.formatCurrency(invoice.total)}</span>
                    </div>
                    <div class="detail-row">
                        <label>Description:</label>
                        <span>${invoice.description || 'N/A'}</span>
                    </div>
                </div>

                <div class="invoice-items">
                    <h4>Items</h4>
                    <div class="items-table">
                        ${invoice.items.map(item => `
                            <div class="item-row">
                                <div class="item-description">${item.description}</div>
                                <div class="item-quantity">${item.quantity}</div>
                                <div class="item-rate">${this.formatCurrency(item.rate)}</div>
                                <div class="item-amount">${this.formatCurrency(item.amount)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="invoice-actions">
                    <button type="button" class="btn btn-outline" onclick="clientPortal.downloadInvoice('${invoice.id}')">
                        Download PDF
                    </button>
                    ${invoice.status !== 'paid' ? `
                        <button type="button" class="btn btn-primary" onclick="clientPortal.payInvoice('${invoice.id}')">
                            Pay Now
                        </button>
                    ` : ''}
                </div>
            </div>
        `);

        document.body.appendChild(modal);
    }

    // Download invoice
    async downloadInvoice(invoiceId) {
        try {
            const invoice = this.dataStore.getInvoice(invoiceId);
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Use existing PDF generator
            if (window.pdfGenerator) {
                await window.pdfGenerator.generatePDF(invoice);
                this.showMessage('Invoice downloaded successfully', 'success');
            } else {
                throw new Error('PDF generator not available');
            }

        } catch (error) {
            this.log(`❌ Download failed: ${error.message}`);
            this.showMessage('Failed to download invoice', 'error');
        }
    }

    // Pay invoice
    async payInvoice(invoiceId) {
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            this.showMessage('Invoice not found', 'error');
            return;
        }

        if (invoice.status === 'paid') {
            this.showMessage('Invoice is already paid', 'info');
            return;
        }

        // Show payment modal
        this.showPaymentModal(invoice);
    }

    // Show payment modal
    showPaymentModal(invoice) {
        const availableMethods = this.paymentGateway.getAvailablePaymentMethods(invoice);
        
        if (!availableMethods.length) {
            this.showMessage('No payment methods available', 'error');
            return;
        }

        const modal = this.createModal('Pay Invoice', `
            <div class="payment-modal">
                <div class="payment-header">
                    <h3>Pay Invoice ${invoice.number}</h3>
                    <div class="payment-amount">${this.formatCurrency(invoice.total)}</div>
                </div>

                <form id="payment-form">
                    <input type="hidden" name="invoiceId" value="${invoice.id}">
                    
                    <div class="payment-methods">
                        <h4>Select Payment Method</h4>
                        ${availableMethods.map((method, index) => `
                            <label class="payment-method-option">
                                <input type="radio" name="payment-method" value="${method.id}" ${index === 0 ? 'checked' : ''}>
                                <div class="method-info">
                                    <span class="method-icon">${method.icon}</span>
                                    <div class="method-details">
                                        <strong>${method.name}</strong>
                                        <p>${method.description}</p>
                                    </div>
                                </div>
                            </label>
                        `).join('')}
                    </div>

                    <div id="payment-element-container">
                        <!-- Payment elements will be mounted here -->
                    </div>

                    <div id="paypal-button-container" style="display: none;">
                        <!-- PayPal buttons will be rendered here -->
                    </div>

                    <div class="payment-actions">
                        <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" id="pay-button">
                            Pay ${this.formatCurrency(invoice.total)}
                        </button>
                    </div>
                </form>

                <div id="payment-message" class="message"></div>
            </div>
        `);

        document.body.appendChild(modal);
        
        // Initialize payment method
        this.initializePaymentMethod(invoice, availableMethods[0].id);
    }

    // Initialize payment method
    initializePaymentMethod(invoice, methodId) {
        const container = document.getElementById('payment-element-container');
        const paypalContainer = document.getElementById('paypal-button-container');
        const payButton = document.getElementById('pay-button');

        // Clear previous elements
        container.innerHTML = '';
        paypalContainer.style.display = 'none';
        paypalContainer.innerHTML = '';

        if (methodId === 'stripe') {
            try {
                const { elements, paymentElement } = this.paymentGateway.createStripePaymentElement(
                    '#payment-element-container',
                    invoice.total,
                    invoice.currency || 'usd'
                );
                
                // Store for form submission
                container.dataset.stripeElements = 'true';
                window.currentStripeElements = { elements, paymentElement };
                
                payButton.style.display = 'block';
            } catch (error) {
                this.showPaymentMessage('Failed to initialize Stripe payment', 'error');
            }
        } else if (methodId === 'paypal') {
            payButton.style.display = 'none';
            paypalContainer.style.display = 'block';
            
            try {
                this.paymentGateway.initializePayPalButtons('#paypal-button-container', invoice);
            } catch (error) {
                this.showPaymentMessage('Failed to initialize PayPal payment', 'error');
            }
        }
    }

    // Handle payment method change
    handlePaymentMethodChange(methodId) {
        const modal = document.querySelector('.payment-modal');
        if (!modal) return;

        const invoiceId = modal.querySelector('[name="invoiceId"]').value;
        const invoice = this.dataStore.getInvoice(invoiceId);
        
        if (invoice) {
            this.initializePaymentMethod(invoice, methodId);
        }
    }

    // Handle payment form submission
    async handlePaymentSubmission(form) {
        const formData = new FormData(form);
        const invoiceId = formData.get('invoiceId');
        const paymentMethod = formData.get('payment-method');
        
        const invoice = this.dataStore.getInvoice(invoiceId);
        if (!invoice) {
            this.showPaymentMessage('Invoice not found', 'error');
            return;
        }

        this.showPaymentMessage('Processing payment...', 'info');

        try {
            let result;
            
            if (paymentMethod === 'stripe' && window.currentStripeElements) {
                result = await this.paymentGateway.processStripePayment(
                    invoice, 
                    window.currentStripeElements.paymentElement
                );
            } else {
                throw new Error('Invalid payment method');
            }

            if (result.success) {
                this.showPaymentMessage('Payment successful!', 'success');
                setTimeout(() => {
                    document.querySelector('.modal').remove();
                    this.refreshCurrentView();
                }, 2000);
            } else {
                this.showPaymentMessage(result.error, 'error');
            }

        } catch (error) {
            this.showPaymentMessage(`Payment failed: ${error.message}`, 'error');
        }
    }

    // Show payment message
    showPaymentMessage(message, type) {
        const messageEl = document.getElementById('payment-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
        }
    }

    // Utility functions
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        return modal;
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('auth-message') || document.getElementById('portal-message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
        }
    }

    refreshCurrentView() {
        // Refresh the current view
        const activeNav = document.querySelector('[data-portal-nav].active');
        if (activeNav) {
            this.navigateToSection(activeNav.dataset.portalNav);
        }
    }

    // Additional methods for other sections (payments, profile, settings) would go here...
    // For brevity, I'm including the core functionality
}

// Export for use in other modules
window.ClientPortal = ClientPortal;
