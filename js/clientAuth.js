
/**
 * ClientAuth - Secure client authentication system
 * Phase 4: Payment Integration & Client Portal
 */
class ClientAuth {
    constructor() {
        this.currentClient = null;
        this.token = null;
        this.refreshToken = null;
        this.debugMode = localStorage.getItem('debugMode') === 'true';
        this.config = {
            apiEndpoint: localStorage.getItem('auth_api_endpoint') || '/api/auth',
            tokenKey: 'client_auth_token',
            refreshTokenKey: 'client_refresh_token',
            clientKey: 'current_client',
            sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
            refreshThreshold: 5 * 60 * 1000 // Refresh 5 minutes before expiry
        };
        this.init();
    }

    async init() {
        this.log('🔐 Initializing Client Authentication');
        
        // Check for existing session
        await this.checkExistingSession();
        
        // Set up automatic token refresh
        this.setupTokenRefresh();
        
        this.log('✅ Client Authentication ready');
    }

    log(message) {
        if (this.debugMode) {
            console.log(`[ClientAuth] ${message}`);
        }
    }

    // Check for existing valid session
    async checkExistingSession() {
        try {
            const token = localStorage.getItem(this.config.tokenKey);
            const clientData = localStorage.getItem(this.config.clientKey);
            
            if (token && clientData) {
                const client = JSON.parse(clientData);
                
                // Verify token is still valid
                if (this.isTokenValid(token)) {
                    this.token = token;
                    this.currentClient = client;
                    this.log(`✅ Restored session for client: ${client.email}`);
                    this.dispatchAuthEvent('restored', client);
                    return true;
                } else {
                    // Try to refresh token
                    const refreshToken = localStorage.getItem(this.config.refreshTokenKey);
                    if (refreshToken) {
                        return await this.refreshAuthToken();
                    }
                }
            }
            
            // Clear invalid session data
            this.clearSession();
            return false;
            
        } catch (error) {
            this.log(`❌ Session check failed: ${error.message}`);
            this.clearSession();
            return false;
        }
    }

    // Client login
    async login(email, password, rememberMe = false) {
        try {
            this.log(`🔑 Attempting login for: ${email}`);
            
            const response = await fetch(`${this.config.apiEndpoint}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password: password,
                    rememberMe: rememberMe
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store authentication data
            this.token = data.token;
            this.refreshToken = data.refreshToken;
            this.currentClient = data.client;

            // Persist session
            localStorage.setItem(this.config.tokenKey, this.token);
            localStorage.setItem(this.config.clientKey, JSON.stringify(this.currentClient));
            
            if (rememberMe && this.refreshToken) {
                localStorage.setItem(this.config.refreshTokenKey, this.refreshToken);
            }

            this.log(`✅ Login successful for: ${this.currentClient.email}`);
            this.dispatchAuthEvent('login', this.currentClient);

            return {
                success: true,
                client: this.currentClient
            };

        } catch (error) {
            this.log(`❌ Login failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Client registration
    async register(clientData) {
        try {
            this.log(`📝 Attempting registration for: ${clientData.email}`);
            
            const response = await fetch(`${this.config.apiEndpoint}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...clientData,
                    email: clientData.email.toLowerCase().trim(),
                    registeredAt: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            this.log(`✅ Registration successful for: ${clientData.email}`);
            
            // Auto-login after registration
            if (data.token) {
                this.token = data.token;
                this.refreshToken = data.refreshToken;
                this.currentClient = data.client;

                localStorage.setItem(this.config.tokenKey, this.token);
                localStorage.setItem(this.config.clientKey, JSON.stringify(this.currentClient));
                
                if (this.refreshToken) {
                    localStorage.setItem(this.config.refreshTokenKey, this.refreshToken);
                }

                this.dispatchAuthEvent('register', this.currentClient);
            }

            return {
                success: true,
                client: data.client,
                message: data.message
            };

        } catch (error) {
            this.log(`❌ Registration failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Logout
    async logout() {
        try {
            this.log('🚪 Logging out client');
            
            // Notify server
            if (this.token) {
                await fetch(`${this.config.apiEndpoint}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                    }
                }).catch(() => {}); // Ignore errors
            }

            // Clear local session
            this.clearSession();
            this.dispatchAuthEvent('logout', null);

            return { success: true };

        } catch (error) {
            this.log(`❌ Logout error: ${error.message}`);
            this.clearSession();
            return { success: false, error: error.message };
        }
    }

    // Clear session data
    clearSession() {
        this.currentClient = null;
        this.token = null;
        this.refreshToken = null;
        
        localStorage.removeItem(this.config.tokenKey);
        localStorage.removeItem(this.config.refreshTokenKey);
        localStorage.removeItem(this.config.clientKey);
        
        this.log('🧹 Session cleared');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!(this.currentClient && this.token && this.isTokenValid(this.token));
    }

    // Get current client
    getCurrentClient() {
        return this.currentClient;
    }

    // Get auth token for API requests
    getAuthToken() {
        return this.token;
    }

    // Validate token format and expiry
    isTokenValid(token) {
        if (!token) return false;
        
        try {
            // Decode JWT payload (basic validation)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            
            return payload.exp > now;
        } catch (error) {
            return false;
        }
    }

    // Refresh authentication token
    async refreshAuthToken() {
        try {
            const refreshToken = localStorage.getItem(this.config.refreshTokenKey);
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            this.log('🔄 Refreshing auth token');

            const response = await fetch(`${this.config.apiEndpoint}/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refreshToken: refreshToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Token refresh failed');
            }

            // Update tokens
            this.token = data.token;
            if (data.refreshToken) {
                this.refreshToken = data.refreshToken;
                localStorage.setItem(this.config.refreshTokenKey, this.refreshToken);
            }

            localStorage.setItem(this.config.tokenKey, this.token);

            this.log('✅ Token refreshed successfully');
            return true;

        } catch (error) {
            this.log(`❌ Token refresh failed: ${error.message}`);
            this.clearSession();
            this.dispatchAuthEvent('session_expired', null);
            return false;
        }
    }

    // Setup automatic token refresh
    setupTokenRefresh() {
        setInterval(async () => {
            if (this.token && this.isAuthenticated()) {
                try {
                    const payload = JSON.parse(atob(this.token.split('.')[1]));
                    const expiryTime = payload.exp * 1000;
                    const now = Date.now();
                    
                    // Refresh if token expires within threshold
                    if (expiryTime - now < this.config.refreshThreshold) {
                        await this.refreshAuthToken();
                    }
                } catch (error) {
                    this.log(`❌ Token refresh check failed: ${error.message}`);
                }
            }
        }, 60000); // Check every minute
    }

    // Password reset request
    async requestPasswordReset(email) {
        try {
            this.log(`🔑 Requesting password reset for: ${email}`);
            
            const response = await fetch(`${this.config.apiEndpoint}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Password reset request failed');
            }

            return {
                success: true,
                message: data.message
            };

        } catch (error) {
            this.log(`❌ Password reset request failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update client profile
    async updateProfile(updates) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Not authenticated');
            }

            this.log('👤 Updating client profile');

            const response = await fetch(`${this.config.apiEndpoint}/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Profile update failed');
            }

            // Update local client data
            this.currentClient = { ...this.currentClient, ...data.client };
            localStorage.setItem(this.config.clientKey, JSON.stringify(this.currentClient));

            this.log('✅ Profile updated successfully');
            this.dispatchAuthEvent('profile_updated', this.currentClient);

            return {
                success: true,
                client: this.currentClient
            };

        } catch (error) {
            this.log(`❌ Profile update failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Make authenticated API request
    async authenticatedRequest(url, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers
        });
    }

    // Dispatch authentication events
    dispatchAuthEvent(type, data) {
        const event = new CustomEvent('clientAuth', {
            detail: { type, data }
        });
        window.dispatchEvent(event);
    }

    // Utility: Generate secure client ID
    generateClientId() {
        return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Utility: Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Utility: Validate password strength
    validatePassword(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const errors = [];
        
        if (password.length < minLength) {
            errors.push(`Password must be at least ${minLength} characters long`);
        }
        if (!hasUpperCase) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!hasLowerCase) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!hasNumbers) {
            errors.push('Password must contain at least one number');
        }
        if (!hasSpecialChar) {
            errors.push('Password must contain at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    // Calculate password strength score
    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        if (score < 3) return 'weak';
        if (score < 5) return 'medium';
        return 'strong';
    }
}

// Export for use in other modules
window.ClientAuth = ClientAuth;
