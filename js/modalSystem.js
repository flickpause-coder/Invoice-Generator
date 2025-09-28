
/**
 * ModalSystem - Enhanced modal system with reminder configuration
 * Phase 3: Reminder settings and email template management
 */
class ModalSystem {
    constructor() {
        this.activeModal = null;
        this.modalStack = [];
        this.init();
    }

    init() {
        this.createModalContainer();
        this.setupEventListeners();
    }

    createModalContainer() {
        if (document.getElementById('modal-container')) return;

        const container = document.createElement('div');
        container.id = 'modal-container';
        container.className = 'fixed inset-0 z-50 hidden';
        document.body.appendChild(container);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
    }

    showModal(content, options = {}) {
        const modal = this.createModal(content, options);
        this.displayModal(modal);
        return modal;
    }

    createModal(content, options) {
        const modal = {
            id: 'modal-' + Date.now(),
            content: content,
            options: {
                size: options.size || 'md',
                closable: options.closable !== false,
                backdrop: options.backdrop !== false,
                ...options
            }
        };

        return modal;
    }

    displayModal(modal) {
        const container = document.getElementById('modal-container');
        
        const sizeClasses = {
            sm: 'max-w-md',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl',
            full: 'max-w-full mx-4'
        };

        container.innerHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" ${modal.options.backdrop ? 'onclick="modalSystem.closeModal()"' : ''}></div>
            <div class="fixed inset-0 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg shadow-xl ${sizeClasses[modal.options.size]} w-full max-h-screen overflow-y-auto">
                    ${modal.options.closable ? `
                        <div class="absolute top-4 right-4 z-10">
                            <button onclick="modalSystem.closeModal()" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>
                    ` : ''}
                    <div class="p-6">
                        ${modal.content}
                    </div>
                </div>
            </div>
        `;

        container.classList.remove('hidden');
        this.activeModal = modal;
        this.modalStack.push(modal);

        // Focus management
        const firstInput = container.querySelector('input, select, textarea, button');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    closeModal() {
        const container = document.getElementById('modal-container');
        container.classList.add('hidden');
        container.innerHTML = '';
        
        this.modalStack.pop();
        this.activeModal = this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
    }

    // Reminder Settings Modal
    showReminderSettingsModal(dataStore) {
        const settings = dataStore.getReminderSettings();
        
        const content = `
            <div class="reminder-settings-modal">
                <h2 class="text-2xl font-bold mb-6">Reminder Settings</h2>
                
                <form id="reminder-settings-form" class="space-y-6">
                    <!-- Enable/Disable Reminders -->
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <h3 class="font-semibold">Enable Automatic Reminders</h3>
                            <p class="text-sm text-gray-600">Automatically send payment reminders for unpaid invoices</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="reminders-enabled" ${settings.enabled ? 'checked' : ''} class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <!-- Before Due Date Reminders -->
                    <div class="space-y-3">
                        <h3 class="font-semibold">Before Due Date Reminders</h3>
                        <p class="text-sm text-gray-600">Send reminders X days before the due date</p>
                        <div class="flex flex-wrap gap-2">
                            ${[1, 3, 7, 14, 30].map(days => `
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="beforeDueDays" value="${days}" 
                                           ${settings.beforeDueDays.includes(days) ? 'checked' : ''}>
                                    <span>${days} day${days > 1 ? 's' : ''}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- After Due Date Reminders -->
                    <div class="space-y-3">
                        <h3 class="font-semibold">After Due Date Reminders</h3>
                        <p class="text-sm text-gray-600">Send reminders X days after the due date</p>
                        <div class="flex flex-wrap gap-2">
                            ${[1, 7, 14, 30, 60].map(days => `
                                <label class="flex items-center space-x-2">
                                    <input type="checkbox" name="afterDueDays" value="${days}" 
                                           ${settings.afterDueDays.includes(days) ? 'checked' : ''}>
                                    <span>${days} day${days > 1 ? 's' : ''}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Maximum Reminders -->
                    <div class="space-y-3">
                        <label class="block">
                            <span class="font-semibold">Maximum Reminders per Invoice</span>
                            <input type="number" id="max-reminders" value="${settings.maxReminders}" 
                                   min="1" max="20" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        </label>
                    </div>

                    <!-- Business Hours -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="font-semibold">Business Hours Restriction</h3>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="business-hours-enabled" ${settings.businessHours.enabled ? 'checked' : ''} class="sr-only peer">
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <label class="block">
                                <span class="text-sm">Start Time</span>
                                <input type="time" id="business-start" value="${settings.businessHours.start}" 
                                       class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            </label>
                            <label class="block">
                                <span class="text-sm">End Time</span>
                                <input type="time" id="business-end" value="${settings.businessHours.end}" 
                                       class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            </label>
                        </div>
                    </div>

                    <!-- Email Settings -->
                    <div class="space-y-3">
                        <h3 class="font-semibold">Email Settings</h3>
                        <div class="flex items-center space-x-4">
                            <label class="flex items-center space-x-2">
                                <input type="checkbox" id="email-enabled" ${settings.emailEnabled ? 'checked' : ''}>
                                <span>Enable Email Reminders</span>
                            </label>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex justify-end space-x-3 pt-6 border-t">
                        <button type="button" onclick="modalSystem.closeModal()" 
                                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="button" onclick="modalSystem.showEmailTemplatesModal(window.dataStore)" 
                                class="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50">
                            Manage Templates
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.showModal(content, { size: 'lg' });

        // Handle form submission
        document.getElementById('reminder-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReminderSettings(dataStore);
        });
    }

    saveReminderSettings(dataStore) {
        const form = document.getElementById('reminder-settings-form');
        const formData = new FormData(form);

        const settings = {
            enabled: document.getElementById('reminders-enabled').checked,
            beforeDueDays: Array.from(form.querySelectorAll('input[name="beforeDueDays"]:checked')).map(cb => parseInt(cb.value)),
            afterDueDays: Array.from(form.querySelectorAll('input[name="afterDueDays"]:checked')).map(cb => parseInt(cb.value)),
            maxReminders: parseInt(document.getElementById('max-reminders').value),
            emailEnabled: document.getElementById('email-enabled').checked,
            businessHours: {
                enabled: document.getElementById('business-hours-enabled').checked,
                start: document.getElementById('business-start').value,
                end: document.getElementById('business-end').value,
                timezone: 'UTC'
            },
            templates: dataStore.getReminderSettings().templates // Preserve existing template settings
        };

        dataStore.setReminderSettings(settings);
        this.closeModal();
        
        // Show success message
        this.showAlert('Reminder settings saved successfully!', 'success');
    }

    // Email Templates Modal
    showEmailTemplatesModal(dataStore) {
        const templates = dataStore.getEmailTemplates();
        
        const content = `
            <div class="email-templates-modal">
                <h2 class="text-2xl font-bold mb-6">Email Templates</h2>
                
                <div class="space-y-4">
                    ${Object.values(templates).map(template => `
                        <div class="border rounded-lg p-4">
                            <div class="flex justify-between items-start mb-3">
                                <div>
                                    <h3 class="font-semibold">${template.name}</h3>
                                    <p class="text-sm text-gray-600">Template ID: ${template.id}</p>
                                </div>
                                <button onclick="modalSystem.editEmailTemplate('${template.id}', window.dataStore)" 
                                        class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                                    Edit
                                </button>
                            </div>
                            <div class="text-sm">
                                <p><strong>Subject:</strong> ${template.subject}</p>
                                <p class="mt-2"><strong>Variables:</strong> ${template.variables.join(', ')}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex justify-end space-x-3 pt-6 border-t mt-6">
                    <button type="button" onclick="modalSystem.closeModal()" 
                            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        `;

        this.showModal(content, { size: 'lg' });
    }

    editEmailTemplate(templateId, dataStore) {
        const template = dataStore.getEmailTemplate(templateId);
        
        const content = `
            <div class="edit-template-modal">
                <h2 class="text-2xl font-bold mb-6">Edit Email Template</h2>
                
                <form id="template-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Template Name</label>
                        <input type="text" id="template-name" value="${template.name}" 
                               class="w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">Subject Line</label>
                        <input type="text" id="template-subject" value="${template.subject}" 
                               class="w-full rounded-md border-gray-300 shadow-sm">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">HTML Content</label>
                        <textarea id="template-html" rows="10" 
                                  class="w-full rounded-md border-gray-300 shadow-sm font-mono text-sm">${template.htmlContent}</textarea>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2">Text Content</label>
                        <textarea id="template-text" rows="6" 
                                  class="w-full rounded-md border-gray-300 shadow-sm">${template.textContent}</textarea>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-medium mb-2">Available Variables:</h4>
                        <div class="text-sm text-gray-600 grid grid-cols-2 gap-2">
                            ${template.variables.map(variable => `<code>{{${variable}}}</code>`).join('')}
                        </div>
                    </div>

                    <div class="flex justify-end space-x-3 pt-6 border-t">
                        <button type="button" onclick="modalSystem.closeModal()" 
                                class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                            Save Template
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.showModal(content, { size: 'xl' });

        // Handle form submission
        document.getElementById('template-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEmailTemplate(templateId, dataStore);
        });
    }

    saveEmailTemplate(templateId, dataStore) {
        const updates = {
            name: document.getElementById('template-name').value,
            subject: document.getElementById('template-subject').value,
            htmlContent: document.getElementById('template-html').value,
            textContent: document.getElementById('template-text').value
        };

        dataStore.updateEmailTemplate(templateId, updates);
        this.closeModal();
        this.showAlert('Email template saved successfully!', 'success');
    }

    // Utility methods
    showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        const colors = {
            success: 'bg-green-100 border-green-400 text-green-700',
            warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
            error: 'bg-red-100 border-red-400 text-red-700',
            info: 'bg-blue-100 border-blue-400 text-blue-700'
        };

        alertDiv.className = `fixed top-4 right-4 ${colors[type]} border px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm`;
        alertDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button>
            </div>
        `;

        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalSystem;
}
