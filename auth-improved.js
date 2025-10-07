// auth-improved.js (replacement)
class ImprovedAuthService {
    constructor({serverBase = '', enableDemo = false} = {}) {
        this.serverBase = serverBase || ''; // e.g. '/api'
        this.currentUser = null;            // minimal in-memory user object
        this.debugMode = (typeof window !== 'undefined') && (localStorage.getItem('debugMode') === 'true');
        this.enableDemo = enableDemo;
        this.init();
    }

    log(...args) {
        if (this.debugMode) console.debug('[Auth]', ...args);
    }

    async init() {
        this.log('Initializing auth service');
        try {
            // Attempt to load current user from server session (expects HttpOnly cookie)
            await this.loadServerSession();
        } catch (e) {
            this.log('Server session load failed:', e);
            if (this.enableDemo) this.createDemoSession();
        }
    }

    // --------------------------
    // Server-backed login flow
    // --------------------------
    async login(email, password) {
        // Do not store password locally. Send to server over HTTPS.
        if (!email || !password) throw new Error('Missing credentials');

        const res = await fetch(`${this.serverBase}/login`, {
            method: 'POST',
            credentials: 'include', // important: allows HttpOnly cookie session
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!res.ok) {
            const payload = await res.json().catch(()=>({error: res.statusText}));
            throw new Error(payload.error || 'Login failed');
        }

        // Server should set HttpOnly cookie and return minimal user object
        const data = await res.json().catch(()=>null);
        if (data && data.user) {
            this.currentUser = data.user;
            this.log('Login successful', this.currentUser.id || '(no-id)');
            this.onAuthChange();
            return this.currentUser;
        }

        // If server did not return user, still attempt to reload session
        await this.loadServerSession();
        return this.currentUser;
    }

    async logout() {
        try {
            await fetch(`${this.serverBase}/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (e) {
            this.log('Logout request failed (ignored):', e);
        }
        this.currentUser = null;
        this.onAuthChange();
    }

    // --------------------------
    // Session helpers
    // --------------------------
    async loadServerSession() {
        // GET /me should return { user: { ... } } when cookie/session exists
        const res = await fetch(`${this.serverBase}/me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) {
            this.log('No server session (status)', res.status);
            return null;
        }
        const payload = await res.json().catch(()=>null);
        if (payload && payload.user) {
            this.currentUser = payload.user;
            this.onAuthChange();
            return this.currentUser;
        }
        return null;
    }

    // --------------------------
    // Demo / local fallback (explicitly opt-in)
    // --------------------------
    createDemoSession() {
        if (!this.enableDemo) return null;
        this.currentUser = {
            id: 'demo-user',
            name: 'Demo Account',
            email: 'demo@local.test',
            role: 'demo'
        };
        this.log('Demo session created');
        this.onAuthChange();
        return this.currentUser;
    }

    // --------------------------
    // UI helpers (safe DOM updates)
    // --------------------------
    onAuthChange() {
        // Emit a simple event others can listen to
        try {
            window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user: this.currentUser } }));
        } catch(e) { this.log('Event dispatch failed', e); }
        this.renderUserUI();
    }

    renderUserUI() {
        // Safely update elements that show user name / email.
        if (!document) return;
        const els = document.querySelectorAll('[data-auth-user]');
        els.forEach(el => {
            if (this.currentUser && this.currentUser.name) {
                // Always use textContent to avoid XSS
                el.textContent = this.currentUser.name;
            } else {
                el.textContent = '';
            }
        });
    }

    // --------------------------
    // Utility / debugging
    // --------------------------
    enableDebug(flag = true) {
        this.debugMode = Boolean(flag);
        try { localStorage.setItem('debugMode', this.debugMode ? 'true' : 'false'); } catch(e){}
    }
}

// Expose a singleton that other scripts can use.
// IMPORTANT: This does NOT persist tokens in localStorage. Server must set HttpOnly cookie.
(function exposeAuth() {
    if (!window) return;
    if (!window.ImprovedAuthServiceInstance) {
        window.ImprovedAuthServiceInstance = new ImprovedAuthService({ serverBase: '/api', enableDemo: true });
    }
    // provide a convenient reference
    window.ImprovedAuthService = window.ImprovedAuthServiceInstance;
})();
