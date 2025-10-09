// Main Application Controller
class App {
    constructor() {
        this.currentPage = 'new-bill';
        this.currentRole = 'admin';
        this.isInitialized = false;
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
        

    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
            targetPage.classList.add('fade-in');
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
function downloadPDF() {
    // Simple PDF generation using browser's print to PDF
    window.print();
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

// Export for global access
window.showPage = showPage;
window.resetQuantities = resetQuantities;
window.refreshItems = refreshItems;
window.saveBill = saveBill;
window.saveAndPrintBill = saveAndPrintBill;
window.downloadPDF = downloadPDF;