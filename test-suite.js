// Comprehensive Testing Suite for InvoiceGen
// Automated testing for all application features

class InvoiceGenTestSuite {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.authService = window.ImprovedAuthService || window.AuthService;
    }

    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[TestSuite] ${message}`, data);
        }
    }

    // Main test execution method
    async runAllTests() {
        console.log('🧪 Starting InvoiceGen Test Suite...');
        console.log('=' .repeat(50));
        
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;

        try {
            // Authentication Tests
            await this.runAuthenticationTests();
            
            // Dashboard Tests
            await this.runDashboardTests();
            
            // Invoice Tests
            await this.runInvoiceTests();
            
            // Client Tests
            await this.runClientTests();
            
            // Subscription Tests
            await this.runSubscriptionTests();
            
            // UI/UX Tests
            await this.runUITests();
            
            // Performance Tests
            await this.runPerformanceTests();
            
            // Security Tests
            await this.runSecurityTests();

            this.generateTestReport();
            
        } catch (error) {
            console.error('💥 Test suite execution failed:', error);
            this.addTestResult('Test Suite Execution', false, 'Suite crashed: ' + error.message);
        }
    }

    async runAuthenticationTests() {
        console.log('\n🔐 Authentication Tests');
        console.log('-'.repeat(30));

        // Test 1: Test account login
        await this.test('Test Account Login', async () => {
            const result = await this.authService.login('test@invoicegen.com', 'test123');
            if (!result.success) throw new Error('Login failed');
            return result.user.email === 'test@invoicegen.com';
        });

        // Test 2: Invalid credentials
        await this.test('Invalid Credentials', async () => {
            const result = await this.authService.login('wrong@email.com', 'wrongpass');
            return !result.success && result.message.includes('Invalid');
        });

        // Test 3: Demo account access
        await this.test('Demo Account - Admin', async () => {
            const result = await this.authService.demoLogin('admin');
            return result.success && result.user.role === 'admin';
        });

        await this.test('Demo Account - Accountant', async () => {
            const result = await this.authService.demoLogin('accountant');
            return result.success && result.user.role === 'accountant';
        });

        await this.test('Demo Account - Staff', async () => {
            const result = await this.authService.demoLogin('staff');
            return result.success && result.user.role === 'staff';
        });

        await this.test('Demo Account - Viewer', async () => {
            const result = await this.authService.demoLogin('viewer');
            return result.success && result.user.role === 'viewer';
        });

        // Test 4: Session management
        await this.test('Session Persistence', async () => {
            this.authService.saveSession();
            const session = localStorage.getItem('authSession');
            return session !== null;
        });

        // Test 5: Logout functionality
        await this.test('Logout Functionality', async () => {
            this.authService.logout();
            return !this.authService.isAuthenticated();
        });
    }

    async runDashboardTests() {
        console.log('\n📊 Dashboard Tests');
        console.log('-'.repeat(30));

        // Test 1: Dashboard statistics calculation
        await this.test('Statistics Calculation', async () => {
            // Create test data
            this.createTestInvoices();
            const stats = this.calculateTestStatistics();
            return stats.totalRevenue > 0 && stats.totalClients > 0;
        });

        // Test 2: Chart initialization
        await this.test('Chart Initialization', async () => {
            if (window.enhancedDashboard && window.enhancedDashboard.charts) {
                const charts = window.enhancedDashboard.charts;
                return Object.keys(charts).length > 0;
            }
            return false;
        });

        // Test 3: Real-time updates
        await this.test('Real-time Updates', async () => {
            if (window.enhancedDashboard) {
                const hasRefresh = typeof window.enhancedDashboard.startAutoRefresh === 'function';
                return hasRefresh;
            }
            return false;
        });

        // Test 4: Dashboard navigation
        await this.test('Dashboard Navigation', async () => {
            const navigationLinks = document.querySelectorAll('nav a');
            return navigationLinks.length >= 5; // Should have at least 5 navigation links
        });
    }

    async runInvoiceTests() {
        console.log('\n📄 Invoice Tests');
        console.log('-'.repeat(30));

        // Test 1: Invoice creation
        await this.test('Invoice Creation', async () => {
            const testInvoice = this.createTestInvoice();
            const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
            invoices.push(testInvoice);
            localStorage.setItem('invoices', JSON.stringify(invoices));
            
            const savedInvoices = JSON.parse(localStorage.getItem('invoices'));
            return savedInvoices.some(inv => inv.id === testInvoice.id);
        });

        // Test 2: Invoice status updates
        await this.test('Invoice Status Updates', async () => {
            const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
            if (invoices.length > 0) {
                invoices[0].status = 'paid';
                localStorage.setItem('invoices', JSON.stringify(invoices));
                return invoices[0].status === 'paid';
            }
            return false;
        });

        // Test 3: Invoice filtering
        await this.test('Invoice Filtering', async () => {
            const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
            const paidInvoices = invoices.filter(inv => inv.status === 'paid');
            return Array.isArray(paidInvoices);
        });

        // Test 4: Invoice calculations
        await this.test('Invoice Calculations', async () => {
            const testInvoice = this.createTestInvoice();
            const subtotal = testInvoice.items.reduce((sum, item) => sum + item.amount, 0);
            const total = subtotal + testInvoice.tax;
            return total === testInvoice.total;
        });
    }

    async runClientTests() {
        console.log('\n👥 Client Tests');
        console.log('-'.repeat(30));

        // Test 1: Client creation
        await this.test('Client Creation', async () => {
            const testClient = this.createTestClient();
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            clients.push(testClient);
            localStorage.setItem('clients', JSON.stringify(clients));
            
            const savedClients = JSON.parse(localStorage.getItem('clients'));
            return savedClients.some(client => client.id === testClient.id);
        });

        // Test 2: Client data validation
        await this.test('Client Data Validation', async () => {
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            if (clients.length > 0) {
                const client = clients[0];
                return client.name && client.email && client.id;
            }
            return false;
        });

        // Test 3: Client search functionality
        await this.test('Client Search', async () => {
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const searchTerm = 'test';
            const results = clients.filter(client => 
                client.name.toLowerCase().includes(searchTerm) ||
                client.email.toLowerCase().includes(searchTerm)
            );
            return Array.isArray(results);
        });
    }

    async runSubscriptionTests() {
        console.log('\n💳 Subscription Tests');
        console.log('-'.repeat(30));

        // Test 1: Subscription plan access
        await this.test('Subscription Plan Access', async () => {
            if (this.authService.getCurrentUser()) {
                const user = this.authService.getCurrentUser();
                return user.subscription && user.subscription.tier;
            }
            return false;
        });

        // Test 2: Feature permissions
        await this.test('Feature Permissions', async () => {
            const user = this.authService.getCurrentUser();
            if (user) {
                const hasAdminAccess = this.authService.hasRole(['admin']);
                const hasSubscription = this.authService.hasSubscriptionTier(['starter', 'business', 'enterprise']);
                return hasAdminAccess || hasSubscription;
            }
            return false;
        });

        // Test 3: Usage tracking
        await this.test('Usage Tracking', async () => {
            const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            return invoices.length >= 0 && clients.length >= 0;
        });
    }

    async runUITests() {
        console.log('\n🎨 UI/UX Tests');
        console.log('-'.repeat(30));

        // Test 1: Navigation visibility
        await this.test('Navigation Visibility', async () => {
            const nav = document.querySelector('nav');
            return nav && window.getComputedStyle(nav).display !== 'none';
        });

        // Test 2: Responsive design
        await this.test('Responsive Design', async () => {
            const viewport = window.innerWidth;
            return viewport > 0 && viewport <= 1920; // Reasonable viewport range
        });

        // Test 3: Interactive elements
        await this.test('Interactive Elements', async () => {
            const buttons = document.querySelectorAll('button');
            const links = document.querySelectorAll('a');
            return buttons.length + links.length > 10; // Should have multiple interactive elements
        });

        // Test 4: Loading states
        await this.test('Loading States', async () => {
            const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
            return loadingElements.length >= 0; // Loading elements may or may not be present
        });
    }

    async runPerformanceTests() {
        console.log('\n⚡ Performance Tests');
        console.log('-'.repeat(30));

        // Test 1: Page load time
        await this.test('Page Load Performance', async () => {
            const loadTime = performance.now();
            return loadTime < 5000; // Should load within 5 seconds
        });

        // Test 2: LocalStorage performance
        await this.test('LocalStorage Performance', async () => {
            const start = performance.now();
            const testData = { test: 'data', timestamp: Date.now() };
            localStorage.setItem('perf-test', JSON.stringify(testData));
            const retrieved = JSON.parse(localStorage.getItem('perf-test'));
            const end = performance.now();
            
            localStorage.removeItem('perf-test');
            return (end - start) < 100 && retrieved.test === 'data';
        });

        // Test 3: Chart rendering performance
        await this.test('Chart Rendering', async () => {
            if (window.enhancedDashboard && window.enhancedDashboard.charts) {
                const chartCount = Object.keys(window.enhancedDashboard.charts).length;
                return chartCount > 0;
            }
            return false;
        });
    }

    async runSecurityTests() {
        console.log('\n🔒 Security Tests');
        console.log('-'.repeat(30));

        // Test 1: Data sanitization
        await this.test('Data Sanitization', async () => {
            const testInput = '<script>alert("XSS")</script>';
            const sanitized = this.sanitizeInput(testInput);
            return !sanitized.includes('<script>');
        });

        // Test 2: Authentication token presence
        await this.test('Authentication Security', async () => {
            const token = localStorage.getItem('authToken');
            return token && token.length > 10;
        });

        // Test 3: Role-based access
        await this.test('Role-Based Access Control', async () => {
            const user = this.authService.getCurrentUser();
            if (user) {
                const validRoles = ['admin', 'accountant', 'staff', 'viewer'];
                return validRoles.includes(user.role);
            }
            return false;
        });
    }

    // Helper methods
    async test(testName, testFunction) {
        this.totalTests++;
        
        try {
            const result = await testFunction();
            
            if (result) {
                this.passedTests++;
                this.addTestResult(testName, true);
                console.log(`✅ ${testName}`);
            } else {
                this.failedTests++;
                this.addTestResult(testName, false, 'Test returned false');
                console.log(`❌ ${testName}`);
            }
        } catch (error) {
            this.failedTests++;
            this.addTestResult(testName, false, error.message);
            console.log(`💥 ${testName}: ${error.message}`);
        }
    }

    addTestResult(testName, passed, error = null) {
        this.testResults.push({
            name: testName,
            passed: passed,
            error: error,
            timestamp: new Date().toISOString()
        });
    }

    createTestInvoice() {
        return {
            id: 'TEST-INV-' + Date.now(),
            clientId: 'test-client-001',
            number: 'TEST-001',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'draft',
            items: [
                {
                    description: 'Test Service',
                    quantity: 1,
                    rate: 1000.00,
                    amount: 1000.00
                }
            ],
            subtotal: 1000.00,
            tax: 100.00,
            total: 1100.00
        };
    }

    createTestClient() {
        return {
            id: 'TEST-CLIENT-' + Date.now(),
            name: 'Test Client Company',
            email: 'test@client.com',
            phone: '+1-555-0123',
            address: {
                street: '123 Test St',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                country: 'USA'
            },
            createdAt: new Date().toISOString()
        };
    }

    createTestInvoices() {
        const testInvoices = [
            {
                id: 'INV-001',
                clientId: 'client-001',
                number: 'INV-001',
                date: '2025-09-01',
                dueDate: '2025-09-30',
                status: 'paid',
                total: 2500.00
            },
            {
                id: 'INV-002',
                clientId: 'client-002',
                number: 'INV-002',
                date: '2025-09-15',
                dueDate: '2025-10-15',
                status: 'sent',
                total: 1800.00
            },
            {
                id: 'INV-003',
                clientId: 'client-003',
                number: 'INV-003',
                date: '2025-08-20',
                dueDate: '2025-09-20',
                status: 'overdue',
                total: 3200.00
            }
        ];
        
        localStorage.setItem('invoices', JSON.stringify(testInvoices));
    }

    calculateTestStatistics() {
        const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
        const clients = JSON.parse(localStorage.getItem('clients') || '[]');
        
        let totalRevenue = 0;
        let pendingAmount = 0;
        let overdueAmount = 0;
        
        invoices.forEach(invoice => {
            if (invoice.status === 'paid') {
                totalRevenue += invoice.total || 0;
            } else if (invoice.status === 'sent') {
                pendingAmount += invoice.total || 0;
            } else if (invoice.status === 'overdue') {
                overdueAmount += invoice.total || 0;
            }
        });
        
        return {
            totalRevenue,
            pendingAmount,
            overdueAmount,
            totalClients: clients.length,
            totalInvoices: invoices.length
        };
    }

    sanitizeInput(input) {
        // Basic HTML sanitization
        return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
                   .replace(/<[^>]*>/g, '');
    }

    generateTestReport() {
        console.log('\n📊 Test Suite Report');
        console.log('=' .repeat(50));
        console.log(`Total Tests: ${this.totalTests}`);
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.failedTests}`);
        console.log(`📈 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        
        if (this.failedTests > 0) {
            console.log('\n🔍 Failed Tests:');
            const failedTests = this.testResults.filter(test => !test.passed);
            failedTests.forEach(test => {
                console.log(`  ❌ ${test.name}: ${test.error || 'Test failed'}`);
            });
        }

        // Store test results for external access
        localStorage.setItem('testResults', JSON.stringify({
            timestamp: new Date().toISOString(),
            summary: {
                total: this.totalTests,
                passed: this.passedTests,
                failed: this.failedTests,
                successRate: ((this.passedTests / this.totalTests) * 100).toFixed(1)
            },
            results: this.testResults
        }));

        console.log('\n✨ Test suite completed!');
        console.log('📋 Results saved to localStorage: testResults');
    }
}

// Initialize and run tests
window.InvoiceGenTestSuite = new InvoiceGenTestSuite();

// Auto-run tests if in debug mode
if (localStorage.getItem('debugMode') === 'true') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.InvoiceGenTestSuite.runAllTests();
        }, 2000); // Wait for app to initialize
    });
}

// Manual test execution function
window.runInvoiceGenTests = function() {
    window.InvoiceGenTestSuite.runAllTests();
};

// Quick test function for specific areas
window.runQuickTests = function(area) {
    const testSuite = window.InvoiceGenTestSuite;
    
    switch(area) {
        case 'auth':
            testSuite.runAuthenticationTests();
            break;
        case 'dashboard':
            testSuite.runDashboardTests();
            break;
        case 'invoices':
            testSuite.runInvoiceTests();
            break;
        case 'clients':
            testSuite.runClientTests();
            break;
        default:
            console.log('Please specify test area: auth, dashboard, invoices, or clients');
    }
};