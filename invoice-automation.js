// invoice-automation.js (replacement)
class InvoiceAutomation {
    constructor({ serverBase = '/api', clientFallback = false } = {}) {
        this.serverBase = serverBase;
        this.clientFallback = clientFallback && (localStorage.getItem('debugMode') === 'true');
        this.debugMode = (typeof window !== 'undefined') && (localStorage.getItem('debugMode') === 'true');
        this.log('InvoiceAutomation init', { clientFallback: this.clientFallback });
        this.pollHandle = null;
        this.init();
    }

    log(...args) {
        if (this.debugMode) console.debug('[InvoiceAutomation]', ...args);
    }

    // Use server-driven automation: call endpoints that perform work server-side.
    async triggerServerAutomation(runType = 'reminders') {
        // runType can be 'reminders', 'statusUpdate', 'batchCreate', etc.
        try {
            const res = await fetch(`${this.serverBase}/automation/run`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ runType })
            });
            if (!res.ok) {
                const err = await res.text().catch(()=>res.statusText);
                this.log('Server automation request failed', res.status, err);
                return { ok: false, status: res.status, error: err };
            }
            const payload = await res.json().catch(()=>null);
            this.log('Server automation completed', payload);
            return { ok: true, payload };
        } catch (e) {
            this.log('Server automation error', e);
            return { ok: false, error: e.message || String(e) };
        }
    }

    // Request server to save automation settings
    async saveSettings(settings = {}) {
        try {
            const res = await fetch(`${this.serverBase}/automation/settings`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (!res.ok) throw new Error('Failed to save settings');
            return await res.json();
        } catch (e) {
            this.log('saveSettings error', e);
            throw e;
        }
    }

    // ---- Client-side fallback (DEV only) ----
    startClientPoll(intervalMs = 60 * 60 * 1000) {
        if (!this.clientFallback) {
            this.log('client fallback disabled; use server automation in production');
            return;
        }
        if (this.pollHandle) return;
        this.log('Starting client-side poll (DEV only)', { intervalMs });
        this.pollHandle = setInterval(()=>this._clientPoll(), intervalMs);
    }

    stopClientPoll() {
        if (this.pollHandle) {
            clearInterval(this.pollHandle);
            this.pollHandle = null;
        }
    }

    async _clientPoll() {
        // Conservative: perform only read-only operations or notify server to perform heavy work.
        this.log('Client poll running (DEV only)');
        // Example: ping server automation endpoint to actually run heavy tasks
        await this.triggerServerAutomation('reminders');
    }

    // Public helper to manually trigger automation from UI
    async runOnce(runType='reminders') {
        this.log('Manual runOnce', runType);
        const res = await this.triggerServerAutomation(runType);
        if (!res.ok) {
            this.showToast('Automation failed: ' + (res.error || res.status));
            return res;
        }
        this.showToast('Automation run queued/completed on server');
        return res;
    }

    // Safe toast helper (no innerHTML)
    showToast(message, timeout = 4000) {
        try {
            const toast = document.createElement('div');
            toast.setAttribute('role','status');
            toast.style.position = 'fixed';
            toast.style.right = '16px';
            toast.style.bottom = '16px';
            toast.style.padding = '10px 14px';
            toast.style.borderRadius = '8px';
            toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(()=> {
                try { document.body.removeChild(toast); } catch(e){}
            }, timeout);
        } catch(e) { this.log('showToast failed', e); }
    }

    // Utility: safe money formatting using Intl
    formatMoneyCents(cents, currency='USD', locale=undefined) {
        const amount = (cents === null || cents === undefined) ? 0 : (cents / 100);
        try {
            return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency }).format(amount);
        } catch (e) {
            return (amount).toFixed(2);
        }
    }

    // Destroy / cleanup
    destroy() {
        this.stopClientPoll();
        this.log('Destroyed InvoiceAutomation instance');
    }

    init() {
        // Placeholder for initialization logic if needed
    }
}

// Expose an instance
(function exposeAutomation() {
    if (!window) return;
    if (!window.InvoiceAutomationInstance) {
        window.InvoiceAutomationInstance = new InvoiceAutomation({ serverBase: '/api', clientFallback: false });
    }
    window.invoiceAutomation = window.InvoiceAutomationInstance;
})();
