// Main Application Controller
class App {
    constructor() {
        this.currentPage = 'new-bill';
        this.currentRole = 'user';
        this.isInitialized = false;
        this.isAdminAuthenticated = false;
        // Obfuscated passcode - stored as base64 encoded string
        this._pc = this._d('MzczNjc5'); // Encoded passcode
        this.firebaseUser = null;
    }
    
    // Decode function for obfuscated data
    _d(encoded) {
        try {
            return atob(encoded);
        } catch(e) {
            return '';
        }
    }
    
    // Passcode verification with additional obfuscation
    _vp(input) {
        const h = (s) => {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
                const char = s.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString();
        };
        // Verify using hash comparison instead of direct string comparison
        return h(input) === h(this._pc);
    }

    // Firebase auth state change handler
    onFirebaseAuthChanged(user) {
        this.firebaseUser = user;
        if (user) {
            console.log('Firebase user authenticated:', user.email || user.uid);
            // Silent authentication - no toast message
        } else {
            console.log('Firebase user signed out');
        }
    }

    init() {
        if (this.isInitialized) return;
        
        // Initialize data store first
        this.checkAndSeedData();
        
        // Initialize managers
        billingManager.init();
        
        // Set up navigation
        this.setupNavigation();
        
        // Show initial page
        this.showPage('new-bill');
        
        this.isInitialized = true;
        console.log('Diwali Billing App initialized successfully!');
    }

    checkAndSeedData() {
        // Data is now loaded directly from getSimpleItems method
        console.log('Using simple items structure...');
    }

    setupNavigation() {
        // Set up nav button handlers
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.currentTarget.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.showPage(page);
            });
        });
        
        // Set up admin button handler
        this.setupAdminAuthentication();
        
        // Prevent Ctrl+P without customer name
        this.setupPrintValidation();
    }

    setupPrintValidation() {
        document.addEventListener('keydown', (e) => {
            // Check if Ctrl+P or Cmd+P
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                const customerName = document.getElementById('customer-name').value.trim();
                
                if (!customerName) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Show error message
                    const toast = document.createElement('div');
                    toast.textContent = '⚠️ Please enter Customer Name before printing!';
                    toast.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: #dc3545;
                        color: white;
                        padding: 1.5rem 2rem;
                        border-radius: 8px;
                        z-index: 10000;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                        font-size: 1.1rem;
                        font-weight: bold;
                    `;
                    
                    document.body.appendChild(toast);
                    
                    // Focus on customer name input
                    document.getElementById('customer-name').focus();
                    
                    setTimeout(() => {
                        toast.remove();
                    }, 3000);
                    
                    return false;
                }
            }
        });
    }

    setupAdminAuthentication() {
        const adminBtn = document.getElementById('admin-access-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                this.requestAdminAccess();
            });
        }
    }

    requestAdminAccess() {
        if (this.isAdminAuthenticated) {
            // If already authenticated, show admin pages
            this.showPage('admin-catalog');
            return;
        }

        // Create and show passcode modal
        this.showPasscodeModal();
    }

    showPasscodeModal() {
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content admin-auth-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-lock"></i> Admin Access</h3>
                    <button class="close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Please enter the admin passcode to access catalog management:</p>
                    <div class="auth-form">
                        <input type="password" id="admin-passcode" placeholder="Enter passcode" maxlength="6" autocomplete="off">
                        <div class="auth-buttons">
                            <button class="btn btn-primary" onclick="app.validateAdminAccess()">
                                <i class="fas fa-key"></i> Authenticate
                            </button>
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                Cancel
                            </button>
                        </div>
                    </div>
                    <div id="auth-error" class="auth-error" style="display: none;"></div>
                </div>
            </div>
        `;

        // Add to body
        document.body.appendChild(modalOverlay);

        // Focus on input
        const passcodeInput = document.getElementById('admin-passcode');
        passcodeInput.focus();

        // Handle Enter key
        passcodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.validateAdminAccess();
            }
        });
    }

    validateAdminAccess() {
        const enteredPasscode = document.getElementById('admin-passcode').value;
        const errorDiv = document.getElementById('auth-error');

        if (this._vp(enteredPasscode)) {
            // Authentication successful
            this.isAdminAuthenticated = true;
            this.currentRole = 'admin';
            
            // Update UI to show admin status
            this.updateAdminUI();
            
            // Close modal
            document.querySelector('.modal-overlay').remove();
            
            // Show admin catalog page
            this.showPage('admin-catalog');
            
            // Show success message
            this.showToast('Admin access granted!', 'success');
            
        } else {
            // Authentication failed
            errorDiv.textContent = 'Invalid passcode. Please try again.';
            errorDiv.style.display = 'block';
            
            // Clear input
            document.getElementById('admin-passcode').value = '';
            document.getElementById('admin-passcode').focus();
            
            // Shake animation
            const modal = document.querySelector('.admin-auth-modal');
            modal.style.animation = 'shake 0.5s';
            setTimeout(() => {
                modal.style.animation = '';
            }, 500);
        }
    }

    updateAdminUI() {
        const adminBtn = document.getElementById('admin-access-btn');
        if (adminBtn && this.isAdminAuthenticated) {
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin (Authenticated)';
            adminBtn.style.background = '#28a745';
            adminBtn.style.borderColor = '#28a745';
            
            // Add logout on right-click
            adminBtn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showLogoutConfirmation();
            });
        }
    }

    showLogoutConfirmation() {
        if (confirm('Are you sure you want to logout from admin access?')) {
            this.logoutAdmin();
        }
    }

    logoutAdmin() {
        this.isAdminAuthenticated = false;
        this.currentRole = 'user';
        
        // Reset admin button
        const adminBtn = document.getElementById('admin-access-btn');
        if (adminBtn) {
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Admin';
            adminBtn.style.background = 'white';
            adminBtn.style.borderColor = 'white';
            
            // Remove context menu listener
            adminBtn.removeEventListener('contextmenu', this.showLogoutConfirmation);
        }
        
        // Redirect to main billing page
        this.showPage('new-bill');
        
        this.showToast('Admin logout successful', 'info');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon, bgColor;
        switch(type) {
            case 'success':
                icon = 'check-circle';
                bgColor = '#28a745';
                break;
            case 'error':
                icon = 'exclamation-circle';
                bgColor = '#dc3545';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                bgColor = '#ffc107';
                break;
            default:
                icon = 'info-circle';
                bgColor = '#007bff';
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            ${message}
        `;
        
        // Add styles
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            z-index: 2000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: bold;
            animation: slideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 3000);
    }

    showPage(pageId) {
        // Check admin access for admin pages and past bills
        if ((pageId.startsWith('admin-') || pageId === 'past-bills') && !this.isAdminAuthenticated) {
            this.requestAdminAccess();
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.classList.add('fade-in');
            
            // Load bills when showing past bills page
            if (pageId === 'past-bills') {
                loadBillsList();
            }
        }
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const btnPage = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (btnPage === pageId) {
                btn.classList.add('active');
            }
        });
        
        this.currentPage = pageId;
        
        // Page-specific initialization
        if (pageId === 'new-bill') {
            // Refresh bill number and date/time
            billingManager.initializeBillHeader();
        } else if (pageId === 'admin-catalog') {
            // Initialize catalog management
            if (typeof catalogManager !== 'undefined') {
                catalogManager.init();
            }
        }
    }


}

// Global Functions (called from HTML)
function showPage(pageId) {
    app.showPage(pageId);
}

// Billing Functions (called from HTML)
function resetQuantities() {
    billingManager.resetQuantities();
}

function refreshItems() {
    billingManager.refreshItems();
}



function saveBill() {
    billingManager.saveBill();
}

function saveAndPrintBill() {
    billingManager.saveAndPrintBill();
}

function closeItemModal() {
    billingManager.closeItemModal();
}

function goBackToTypeSelection() {
    billingManager.goBackToTypeSelection();
}



// Print Functions (called from HTML)
function validateAndPrint() {
    const customerName = document.getElementById('customer-name').value.trim();
    
    if (!customerName) {
        // Show error message
        const toast = document.createElement('div');
        toast.textContent = '⚠️ Please enter Customer Name before printing!';
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc3545;
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            font-size: 1.1rem;
            font-weight: bold;
        `;
        
        document.body.appendChild(toast);
        
        // Focus on customer name input
        document.getElementById('customer-name').focus();
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
        
        return false;
    }
    
    // If validation passes, print
    window.print();
}

function downloadPDF() {
    // Validate before downloading PDF
    validateAndPrint();
}

// Enhanced CSS for print view
function addPrintStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #333;
        }
        
        .store-details h2 {
            color: #ff6b35;
            margin-bottom: 0.5rem;
        }
        
        .store-details p {
            margin: 0.2rem 0;
            color: #666;
        }
        
        .bill-details {
            text-align: right;
        }
        
        .bill-details h3 {
            color: #ff6b35;
            margin-bottom: 0.5rem;
        }
        
        .invoice-items {
            margin: 2rem 0;
        }
        
        .column-section {
            margin-bottom: 2rem;
        }
        
        .column-section h4 {
            color: #ff6b35;
            border-bottom: 1px solid #ddd;
            padding-bottom: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
        }
        
        .invoice-table th,
        .invoice-table td {
            padding: 0.5rem;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        
        .invoice-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #555;
        }
        
        .invoice-totals {
            margin-top: 2rem;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            min-width: 300px;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        
        .total-row.grand-total {
            font-size: 1.2rem;
            font-weight: bold;
            color: #ff6b35;
            border-bottom: 3px double #ff6b35;
            border-top: 2px solid #ff6b35;
            margin-top: 0.5rem;
            padding-top: 1rem;
        }
        
        @media print {
            .invoice {
                font-size: 12px;
            }
            
            .invoice-header {
                margin-bottom: 1rem;
            }
            
            .column-section {
                page-break-inside: avoid;
                margin-bottom: 1rem;
            }
            
            .invoice-totals {
                margin-top: 1rem;
            }
        }
    `;
    document.head.appendChild(style);
}

// Performance optimization: Debounce function for search/filter
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add print styles
    addPrintStyles();
    
    // Initialize app
    window.app = new App();
    app.init();
    

});

// Add global error handler
window.addEventListener('error', (e) => {
    console.error('Application Error:', e.error);
    
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = 'An error occurred. Please refresh the page if problems persist.';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 1rem;
        border-radius: 5px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
});

// Global Functions for HTML access
function validateAdminAccess() {
    app.validateAdminAccess();
}

// Export for global access
window.showPage = showPage;
window.resetQuantities = resetQuantities;
window.refreshItems = refreshItems;
window.saveBill = saveBill;
window.saveAndPrintBill = saveAndPrintBill;
window.downloadPDF = downloadPDF;
window.validateAdminAccess = validateAdminAccess;
window.validateAndPrint = validateAndPrint;