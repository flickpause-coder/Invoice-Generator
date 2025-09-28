// Improved Authentication Service for InvoiceGen
// Enhanced with better error handling and demo account support

class ImprovedAuthService {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.refreshToken = null;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.init();
    }

    init() {
        this.log('🔐 Auth Service Initializing...');
        this.loadSession();
        this.setupEventListeners();
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[AuthService] ${message}`, data);
        }
    }

    // Enhanced login with better error handling
    async login(email, password, rememberMe = false) {
        try {
            this.log('🔄 Attempting login', { email, rememberMe });
            
            // Normalize email for comparison
            const normalizedEmail = email.toLowerCase().trim();
            
            // Check against test credentials first
            if (normalizedEmail === 'test@invoicegen.com' && password === 'test123') {
                return this.createTestSession(rememberMe);
            }

            // Check mock users
            const users = this.getMockUsers();
            const user = users.find(u => 
                u.email.toLowerCase().trim() === normalizedEmail && 
                u.password === password
            );

            if (user) {
                return this.createUserSession(user, rememberMe);
            } else {
                this.log('❌ Login failed - Invalid credentials');
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }
        } catch (error) {
            this.log('💥 Login error', error);
            return {
                success: false,
                message: 'An error occurred during login'
            };
        }
    }

    // Demo login with predefined roles
    demoLogin(role) {
        try {
            this.log('🎭 Demo login attempt', { role });
            
            const demoUsers = this.getDemoUsers();
            const user = demoUsers[role];
            
            if (user) {
                return this.createUserSession(user, true);
            } else {
                this.log('❌ Demo login failed - Unknown role');
                return {
                    success: false,
                    message: 'Demo account not found'
                };
            }
        } catch (error) {
            this.log('💥 Demo login error', error);
            return {
                success: false,
                message: 'Demo login failed'
            };
        }
    }

    // Bypass authentication for development
    bypassLogin(userData = null) {
        this.log('🚀 Bypass login - Development mode');
        
        const bypassUser = userData || {
            id: 'bypass-user-' + Date.now(),
            email: 'dev@invoicegen.com',
            firstName: 'Developer',
            lastName: 'Mode',
            company: 'InvoiceGen Dev',
            role: 'admin',
            subscription: {
                tier: 'enterprise',
                status: 'active',
                startDate: '2025-01-01',
                endDate: '2025-12-31'
            },
            preferences: {
                theme: 'light',
                notifications: true
            }
        };

        return this.createUserSession(bypassUser, false);
    }

    // Create test session for test@invoicegen.com
    createTestSession(rememberMe = false) {
        const testUser = {
            id: 'test-user-001',
            email: 'test@invoicegen.com',
            firstName: 'Test',
            lastName: 'User',
            company: 'Test Company',
            role: 'admin',
            subscription: {
                tier: 'starter',
                status: 'active',
                startDate: '2025-09-01',
                endDate: '2025-12-31'
            },
            preferences: {
                theme: 'light',
                notifications: true
            }
        };

        return this.createUserSession(testUser, rememberMe);
    }

    // Create user session
    createUserSession(user, rememberMe = false) {
        try {
            const tokens = this.generateTokens(user);
            
            this.currentUser = {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                company: user.company || '',
                role: user.role,
                subscription: user.subscription,
                preferences: user.preferences || {}
            };

            this.token = tokens.token;
            this.refreshToken = tokens.refreshToken;

            if (rememberMe) {
                this.saveSession();
            }

            this.log('✅ Session created successfully', { 
                user: this.currentUser.email, 
                role: this.currentUser.role 
            });

            return {
                success: true,
                user: this.currentUser,
                token: this.token
            };
        } catch (error) {
            this.log('💥 Session creation failed', error);
            return {
                success: false,
                message: 'Failed to create user session'
            };
        }
    }

    // Logout user
    logout() {
        this.log('🚪 Logging out user');
        this.currentUser = null;
        this.token = null;
        this.refreshToken = null;
        this.clearSession();
        
        // Redirect to login page if not already there
        if (!window.location.pathname.includes('auth')) {
            window.location.href = 'auth/login.html';
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        const isAuth = !!(this.token && this.currentUser);
        this.log('🔍 Authentication check', { authenticated: isAuth });
        return isAuth;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check user role
    hasRole(roles) {
        if (!this.currentUser) return false;
        
        const userRoles = Array.isArray(roles) ? roles : [roles];
        return userRoles.includes(this.currentUser.role);
    }

    // Check subscription tier
    hasSubscriptionTier(tiers) {
        if (!this.currentUser) return false;
        
        const requiredTiers = Array.isArray(tiers) ? tiers : [tiers];
        return requiredTiers.includes(this.currentUser.subscription.tier);
    }

    // Generate mock tokens
    generateTokens(user) {
        const timestamp = Date.now();
        return {
            token: `jwt-${user.id}-${timestamp}`,
            refreshToken: `refresh-${user.id}-${timestamp}`
        };
    }

    // Save session to localStorage
    saveSession() {
        try {
            const sessionData = {
                currentUser: this.currentUser,
                token: this.token,
                refreshToken: this.refreshToken,
                timestamp: Date.now()
            };
            
            localStorage.setItem('authSession', JSON.stringify(sessionData));
            this.log('💾 Session saved to localStorage');
        } catch (error) {
            this.log('❌ Failed to save session', error);
        }
    }

    // Load session from localStorage
    loadSession() {
        try {
            const sessionData = localStorage.getItem('authSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                
                // Check if session is not expired (24 hours)
                const sessionAge = Date.now() - session.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                if (sessionAge < maxAge) {
                    this.currentUser = session.currentUser;
                    this.token = session.token;
                    this.refreshToken = session.refreshToken;
                    this.log('📂 Session loaded from localStorage');
                } else {
                    this.log('⏰ Session expired, clearing');
                    this.clearSession();
                }
            }
        } catch (error) {
            this.log('❌ Failed to load session', error);
            this.clearSession();
        }
    }

    // Clear session from localStorage
    clearSession() {
        localStorage.removeItem('authSession');
        this.log('🗑️ Session cleared from localStorage');
    }

    // Setup event listeners
    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated()) {
                this.log('👀 Page became visible, refreshing session');
                this.loadSession();
            }
        });

        // Handle storage changes (for multi-tab synchronization)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authSession') {
                this.log('🔄 Storage changed, reloading session');
                this.loadSession();
            }
        });
    }

    // Get mock users for testing
    getMockUsers() {
        return [
            {
                id: 'admin-001',
                email: 'admin@invoicegen.com',
                password: 'admin123',
                firstName: 'John',
                lastName: 'Admin',
                company: 'InvoiceGen Corp',
                role: 'admin',
                subscription: {
                    tier: 'enterprise',
                    status: 'active',
                    startDate: '2025-01-01',
                    endDate: '2025-12-31'
                },
                preferences: { theme: 'light', notifications: true }
            },
            {
                id: 'accountant-001',
                email: 'accountant@invoicegen.com',
                password: 'accountant123',
                firstName: 'Jane',
                lastName: 'Accountant',
                company: 'Acme Accounting',
                role: 'accountant',
                subscription: {
                    tier: 'business',
                    status: 'active',
                    startDate: '2025-02-01',
                    endDate: '2025-12-31'
                },
                preferences: { theme: 'light', notifications: true }
            },
            {
                id: 'staff-001',
                email: 'staff@invoicegen.com',
                password: 'staff123',
                firstName: 'Bob',
                lastName: 'Staff',
                company: 'Tech Solutions',
                role: 'staff',
                subscription: {
                    tier: 'starter',
                    status: 'active',
                    startDate: '2025-03-01',
                    endDate: '2025-12-31'
                },
                preferences: { theme: 'dark', notifications: false }
            },
            {
                id: 'viewer-001',
                email: 'viewer@invoicegen.com',
                password: 'viewer123',
                firstName: 'Alice',
                lastName: 'Viewer',
                company: 'Client Company',
                role: 'viewer',
                subscription: {
                    tier: 'free',
                    status: 'active',
                    startDate: '2025-04-01',
                    endDate: '2025-12-31'
                },
                preferences: { theme: 'light', notifications: true }
            }
        ];
    }

    // Get demo users
    getDemoUsers() {
        const mockUsers = this.getMockUsers();
        return {
            admin: mockUsers[0],
            accountant: mockUsers[1],
            staff: mockUsers[2],
            viewer: mockUsers[3]
        };
    }

    // Initialize demo data
    initializeDemoData() {
        this.log('🎭 Initializing demo data');
        
        // Create sample clients if they don't exist
        if (!localStorage.getItem('clients')) {
            const sampleClients = [
                {
                    id: 'client-001',
                    userId: 'demo-user',
                    name: 'Acme Corporation',
                    email: 'contact@acmecorp.com',
                    phone: '+1-555-0101',
                    address: {
                        street: '123 Business Ave',
                        city: 'New York',
                        state: 'NY',
                        zip: '10001',
                        country: 'USA'
                    },
                    taxId: '12-3456789',
                    notes: 'Long-term client, NET 30 terms',
                    createdAt: '2025-01-15',
                    totalRevenue: 15000.00,
                    invoiceCount: 5
                },
                {
                    id: 'client-002',
                    userId: 'demo-user',
                    name: 'Tech Solutions Ltd',
                    email: 'info@techsolutions.com',
                    phone: '+1-555-0102',
                    address: {
                        street: '456 Innovation Dr',
                        city: 'San Francisco',
                        state: 'CA',
                        zip: '94105',
                        country: 'USA'
                    },
                    taxId: '98-7654321',
                    notes: 'New client, prefers digital communication',
                    createdAt: '2025-02-20',
                    totalRevenue: 8500.00,
                    invoiceCount: 3
                }
            ];
            
            localStorage.setItem('clients', JSON.stringify(sampleClients));
            this.log('✅ Sample clients created');
        }

        // Create sample invoices if they don't exist
        if (!localStorage.getItem('invoices')) {
            const sampleInvoices = [
                {
                    id: 'INV-001',
                    userId: 'demo-user',
                    clientId: 'client-001',
                    number: 'INV-001',
                    date: '2025-09-01',
                    dueDate: '2025-09-30',
                    status: 'paid',
                    items: [
                        {
                            description: 'Web Design Services',
                            quantity: 1,
                            rate: 2500.00,
                            amount: 2500.00
                        }
                    ],
                    subtotal: 2500.00,
                    tax: 250.00,
                    total: 2750.00,
                    reminders: {
                        beforeDue: { days: 7, sent: true },
                        onDue: { sent: false },
                        afterDue: { days: 3, sent: false }
                    },
                    template: 'professional',
                    design: {
                        primaryColor: '#3b82f6',
                        font: 'Inter'
                    }
                },
                {
                    id: 'INV-002',
                    userId: 'demo-user',
                    clientId: 'client-002',
                    number: 'INV-002',
                    date: '2025-09-15',
                    dueDate: '2025-10-15',
                    status: 'sent',
                    items: [
                        {
                            description: 'Consulting Services',
                            quantity: 20,
                            rate: 90.00,
                            amount: 1800.00
                        }
                    ],
                    subtotal: 1800.00,
                    tax: 180.00,
                    total: 1980.00,
                    reminders: {
                        beforeDue: { days: 7, sent: false },
                        onDue: { sent: false },
                        afterDue: { days: 3, sent: false }
                    },
                    template: 'modern',
                    design: {
                        primaryColor: '#10b981',
                        font: 'Inter'
                    }
                }
            ];
            
            localStorage.setItem('invoices', JSON.stringify(sampleInvoices));
            this.log('✅ Sample invoices created');
        }
    }
}

// Export for global use
window.ImprovedAuthService = new ImprovedAuthService();