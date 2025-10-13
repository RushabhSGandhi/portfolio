// Billing Functions and Logic

// Helper function to format numbers without unnecessary decimals
function formatNumber(value) {
    const num = parseFloat(value);
    if (isNaN(num)) {
        return '0';
    }
    // Remove unnecessary decimal (.0)
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

class BillingManager {
    constructor() {
        this.itemQuantities = {}; // Store item quantities by item ID
        this.allItems = [];
        this.originalRates = {}; // Store original rates by item name
        this.columnItems = { A: [], B: [], C: [] };
    }

    init() {
        this.initializeBillHeader();
        this.loadAndDisplayItems();
        this.setupKeyboardNavigation();
        this.updateTotals();
    }

    initializeBillHeader() {
        // Set current date and time combined
        const now = new Date();
        const dateStr = now.toLocaleDateString();
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById('bill-datetime').textContent = `${dateStr} ${timeStr}`;
        
        // Display current bill number (without incrementing)
        const billNo = this.getCurrentBillNumber();
        document.getElementById('bill-no').textContent = billNo;
    }

    getCurrentBillNumber() {
        const data = dataStore.getData();
        const today = new Date().toISOString().split('T')[0];
        
        // Reset counter if it's a new day
        if (data.settings.lastBillDate !== today) {
            data.settings.billCounter = 5000;
            data.settings.lastBillDate = today;
            dataStore.saveData(data);
        }
        
        // Just return the current counter without incrementing
        return data.settings.billCounter.toString();
    }
    
    incrementBillNumber() {
        const data = dataStore.getData();
        data.settings.billCounter++;
        dataStore.saveData(data);
    }

    loadAndDisplayItems() {
        // Get items from catalog (now dynamic)
        let allItems = dataStore.getCatalogItems();
        
        // Sort items by position
        allItems.sort((a, b) => {
            const posA = parseInt(a.position) || 999;
            const posB = parseInt(b.position) || 999;
            return posA - posB;
        });
        
        this.allItems = allItems;
        
        // Store original rates for comparison
        this.originalRates = {};
        this.allItems.forEach(item => {
            this.originalRates[item.name] = item.rate;
            // Store variant rates as well
            if (item.variants && Array.isArray(item.variants)) {
                item.variants.forEach(variant => {
                    this.originalRates[`${item.name} - ${variant.name}`] = variant.rate;
                });
            }
        });
        
        // Distribute items across three columns evenly
        const itemsPerColumn = Math.ceil(this.allItems.length / 3);
        
        this.columnItems.A = this.allItems.slice(0, itemsPerColumn);
        this.columnItems.B = this.allItems.slice(itemsPerColumn, itemsPerColumn * 2);
        this.columnItems.C = this.allItems.slice(itemsPerColumn * 2);
        
        // Render all items in each column
        this.renderColumnRows('A');
        this.renderColumnRows('B');
        this.renderColumnRows('C');
    }

    renderColumnRows(column) {
        const tbody = document.getElementById(`column-${column.toLowerCase()}-tbody`);
        tbody.innerHTML = '';
        
        this.columnItems[column].forEach((item, index) => {
            const row = this.createItemRow(item, index, column);
            tbody.appendChild(row);
        });
    }

    createItemRow(item, index, column) {
        const row = document.createElement('tr');
        row.className = 'item-row';
        row.id = `item-row-${column}-${index}`;
        
        // Check if item has variants
        const hasVariants = item.variants && item.variants.length > 0;
        
        let itemNameContent;
        if (hasVariants) {
            // Create dropdown with base item as first option, followed by variants
            const variantOptions = item.variants.map((variant, vIndex) => 
                `<option value="variant-${vIndex}" data-rate="${variant.rate}">${variant.name}</option>`
            ).join('');
            
            itemNameContent = `
                <div class="item-name-wrapper">
                    <select class="variant-select-inline" 
                            id="variant-select-${column}-${index}"
                            onchange="billingManager.updateVariantSelection('${column}', ${index}, this.value)"
                            data-item-name="${item.name}"
                            data-base-rate="${item.rate}">
                        <option value="base" data-rate="${item.rate}">${item.name}</option>
                        ${variantOptions}
                    </select>
                </div>
            `;
        } else {
            itemNameContent = `
                <span class="item-name" id="item-name-${column}-${index}" data-item-name="${item.name}" data-has-variants="${hasVariants}">
                    ${item.name}
                </span>
            `;
        }
        
        row.innerHTML = `
            <td class="item-cell">
                ${itemNameContent}
            </td>
            <td class="qty-cell">
                <input type="number" 
                       class="qty-input" 
                       id="qty-${column}-${index}"
                       value="" 
                       min="0" 
                       step="1" 
                       onchange="billingManager.updateItemQuantity('${column}', ${index}, this.value)"
                       onkeydown="billingManager.handleKeyNav(event, '${column}', ${index})"
                       placeholder="">
            </td>
            <td class="rate-cell" id="rate-${column}-${index}">
                <input type="number" 
                       class="rate-input" 
                       id="rate-input-${column}-${index}"
                       value="${formatNumber(item.rate)}" 
                       min="0" 
                       step="0.01" 
                       onchange="billingManager.updateItemRate('${column}', ${index}, this.value)"
                       placeholder="Rate">
            </td>
            <td class="total-cell" id="total-${column}-${index}">
                 
            </td>
        `;
        
        return row;
    }

    updateVariantSelection(column, index, selectedValue) {
        const item = this.columnItems[column][index];
        if (!item || !item.variants) return;
        
        const rateInput = document.getElementById(`rate-input-${column}-${index}`);
        
        if (selectedValue === 'base') {
            // Base item selected, use item's own rate
            rateInput.value = formatNumber(item.rate);
        } else if (selectedValue.startsWith('variant-')) {
            // Variant selected
            const variantIndex = parseInt(selectedValue.replace('variant-', ''));
            const variant = item.variants[variantIndex];
            if (variant) {
                rateInput.value = formatNumber(variant.rate);
            }
        }
        
        // Trigger rate update to check highlighting
        this.updateItemRate(column, index, rateInput.value);
        
        // Get quantity and update if exists
        const qtyInput = document.getElementById(`qty-${column}-${index}`);
        const qty = parseFloat(qtyInput.value) || 0;
        
        if (qty > 0) {
            // Trigger quantity update to recalculate
            this.updateItemQuantity(column, index, qty);
        }
    }

    updateItemQuantity(column, index, quantity) {
        const qty = parseFloat(quantity) || 0;
        const item = this.columnItems[column][index];
        const row = document.getElementById(`item-row-${column}-${index}`);
        
        // Get item name - check if it has variants (dropdown) or not (span)
        const variantSelect = document.getElementById(`variant-select-${column}-${index}`);
        const itemNameSpan = document.getElementById(`item-name-${column}-${index}`);
        
        let itemNameText;
        let hasVariants = false;
        
        if (variantSelect) {
            // Item has variants - get name from dropdown data attribute
            itemNameText = variantSelect.getAttribute('data-item-name');
            hasVariants = true;
        } else if (itemNameSpan) {
            // Regular item - get name from span
            itemNameText = itemNameSpan.getAttribute('data-item-name');
            hasVariants = false;
        } else {
            return;
        }
        
        if (itemNameText && qty > 0) {
            if (item) {
                let currentRate;
                let variantName = null;
                
                // Get rate from the rate input
                const rateInput = document.getElementById(`rate-input-${column}-${index}`);
                
                // Check if item has variants and which one is selected
                if (hasVariants && variantSelect) {
                    const selectedValue = variantSelect.value;
                    
                    if (selectedValue === 'base') {
                        // Base item selected
                        variantName = null; // No variant, just the base item
                        currentRate = parseFloat(rateInput.value);
                        if (isNaN(currentRate)) {
                            currentRate = item.rate;
                        }
                    } else if (selectedValue.startsWith('variant-')) {
                        // Variant selected
                        const variantIndex = parseInt(selectedValue.replace('variant-', ''));
                        const variant = item.variants[variantIndex];
                        if (variant) {
                            variantName = variant.name;
                            currentRate = parseFloat(rateInput.value);
                            if (isNaN(currentRate)) {
                                currentRate = variant.rate;
                            }
                        } else {
                            // Fallback if variant not found
                            currentRate = parseFloat(rateInput.value) || item.rate;
                        }
                    } else {
                        // Fallback for unexpected value
                        currentRate = parseFloat(rateInput.value) || item.rate;
                    }
                } else {
                    // Regular item without variants
                    currentRate = parseFloat(rateInput.value);
                    if (isNaN(currentRate)) {
                        currentRate = item.rate;
                    }
                }
                
                // Ensure currentRate is valid
                if (isNaN(currentRate) || currentRate === undefined) {
                    currentRate = item.rate || 0;
                }
                
                const total = qty * currentRate;
                const totalCell = document.getElementById(`total-${column}-${index}`);
                totalCell.textContent = ` ${formatNumber(total)}`;
                
                // Check if rate was manually changed from original
                // Use variant key if a variant is selected
                let variantKey = itemNameText;
                if (variantName) {
                    variantKey = `${itemNameText} - ${variantName}`;
                }
                const originalRate = this.originalRates[variantKey] || item.rate;
                const rateChanged = Math.abs(currentRate - originalRate) > 0.01;
                
                // Add red highlighting to total if rate was manually changed
                if (rateChanged) {
                    totalCell.classList.add('rate-changed');
                    const rateInputElem = document.getElementById(`rate-input-${column}-${index}`);
                    if (rateInputElem) rateInputElem.classList.add('rate-edited');
                    if (row) row.classList.add('rate-edited');
                } else {
                    totalCell.classList.remove('rate-changed');
                    const rateInputElem = document.getElementById(`rate-input-${column}-${index}`);
                    if (rateInputElem) rateInputElem.classList.remove('rate-edited');
                    if (row) row.classList.remove('rate-edited');
                }
                
                // Mark row as having quantity
                if (row) row.classList.add('has-quantity');
                
                // Store quantity and current rate using item name as key
                const itemData = { qty: qty, rate: currentRate };
                if (variantName) {
                    itemData.variantName = variantName;
                }
                this.itemQuantities[itemNameText] = itemData;
            }
        } else {
            // Clear total if no quantity
            const totalCell = document.getElementById(`total-${column}-${index}`);
            totalCell.textContent = ' 0.00';
            totalCell.classList.remove('rate-changed');
            
            // Mark row as having no quantity
            if (row) row.classList.remove('has-quantity');
            
            // Remove from tracking if exists
            if (itemNameText && this.itemQuantities[itemNameText]) {
                delete this.itemQuantities[itemNameText];
            }
        }
        
        this.updateTotals();
    }

    updateItemRate(column, index, newRate) {
        const rate = parseFloat(newRate) || 0;
        
        // Try to get item name from variant select or regular span
        const variantSelect = document.getElementById(`variant-select-${column}-${index}`);
        const itemNameSpan = document.getElementById(`item-name-${column}-${index}`);
        
        let itemNameText;
        if (variantSelect) {
            itemNameText = variantSelect.getAttribute('data-item-name');
        } else if (itemNameSpan) {
            itemNameText = itemNameSpan.getAttribute('data-item-name');
        }
        
        if (!itemNameText) {
            console.error('Could not find item name');
            return;
        }
        
        const item = this.columnItems[column][index];
        if (!item) {
            console.error('Could not find item');
            return;
        }
        
        // Get UI elements
        const rateInput = document.getElementById(`rate-input-${column}-${index}`);
        const itemRow = rateInput ? rateInput.closest('tr') : null;
        const totalCell = document.getElementById(`total-${column}-${index}`);
        const qtyInput = document.getElementById(`qty-${column}-${index}`);
        const qty = parseFloat(qtyInput.value) || 0;
        
        // Check if a variant is selected
        const hasVariants = item.variants && item.variants.length > 0;
        let variantKey = itemNameText; // Default to base item name
        
        if (hasVariants && variantSelect) {
            const selectedValue = variantSelect.value;
            if (selectedValue.startsWith('variant-')) {
                const variantIndex = parseInt(selectedValue.replace('variant-', ''));
                const variant = item.variants[variantIndex];
                if (variant) {
                    variantKey = `${itemNameText} - ${variant.name}`;
                }
            }
        }
        
        // Get original rate from stored rates (use variant key if variant is selected)
        const originalRate = this.originalRates[variantKey] || item.rate;
        const rateChanged = Math.abs(rate - originalRate) > 0.01;
        
        console.log('Rate update:', { itemNameText, variantKey, rate, originalRate, rateChanged });
        
        // DO NOT modify item.rate - it should remain the original catalog rate
        // The rate input field holds the current rate value
        
        // Apply highlighting to rate input and row
        if (rateInput && itemRow) {
            if (rateChanged) {
                itemRow.classList.add('rate-edited');
                rateInput.classList.add('rate-edited');
            } else {
                itemRow.classList.remove('rate-edited');
                rateInput.classList.remove('rate-edited');
            }
        }
        
        // Recalculate total if there's a quantity
        if (qty > 0) {
            const total = qty * rate;
            if (totalCell) {
                totalCell.textContent = ` ${formatNumber(total)}`;
                
                // Add red highlighting to total if rate was manually changed
                if (rateChanged) {
                    totalCell.classList.add('rate-changed');
                } else {
                    totalCell.classList.remove('rate-changed');
                }
            }
            
            // Update tracking with new rate
            this.itemQuantities[itemNameText] = { qty: qty, rate: rate };
        } else {
            // No quantity, remove highlighting from total
            if (totalCell) {
                totalCell.classList.remove('rate-changed');
            }
        }
        
        this.updateTotals();
    }

    refreshItems() {
        // Save current rates and quantities before refresh
        const savedRates = {};
        const savedQuantities = { ...this.itemQuantities };
        
        // Save all manually edited rates
        ['A', 'B', 'C'].forEach(column => {
            this.columnItems[column].forEach((item, index) => {
                const rateInput = document.getElementById(`rate-input-${column}-${index}`);
                if (rateInput) {
                    const currentRate = parseFloat(rateInput.value);
                    const originalRate = this.originalRates[item.name];
                    // Only save if it's been manually changed
                    if (Math.abs(currentRate - originalRate) > 0.01) {
                        savedRates[item.name] = currentRate;
                    }
                }
            });
        });
        
        this.loadAndDisplayItems();
        
        // Restore saved rates and quantities
        ['A', 'B', 'C'].forEach(column => {
            this.columnItems[column].forEach((item, index) => {
                // Restore manually edited rate
                if (savedRates[item.name]) {
                    const rateInput = document.getElementById(`rate-input-${column}-${index}`);
                    if (rateInput) {
                        rateInput.value = formatNumber(savedRates[item.name]);
                        item.rate = savedRates[item.name];
                        
                        // Apply highlighting
                        const itemRow = rateInput.closest('tr');
                        if (itemRow) itemRow.classList.add('rate-edited');
                        rateInput.classList.add('rate-edited');
                    }
                }
                
                // Restore quantity
                if (savedQuantities[item.name]) {
                    const qtyInput = document.getElementById(`qty-${column}-${index}`);
                    if (qtyInput) {
                        qtyInput.value = savedQuantities[item.name].qty;
                        this.updateItemQuantity(column, index, savedQuantities[item.name].qty);
                    }
                }
            });
        });
        
        this.updateTotals();
    }

    resetQuantities() {
        if (!confirm('Clear all quantities to 0?')) {
            return;
        }
        
        // Clear all item quantities
        this.itemQuantities = {};
        
        // Reset all quantities in all columns
        ['A', 'B', 'C'].forEach(column => {
            this.columnItems[column].forEach((item, index) => {
                // Reset quantity only
                const qtyInput = document.getElementById(`qty-${column}-${index}`);
                if (qtyInput) {
                    qtyInput.value = '';
                }
                
                // Reset total
                const totalCell = document.getElementById(`total-${column}-${index}`);
                if (totalCell) {
                    totalCell.textContent = ' 0.00';
                }
            });
        });
        
        // Update totals
        this.updateTotals();
        
        // Show success message
        if (typeof app !== 'undefined' && app.showToast) {
            app.showToast('✓ Quantities cleared', 'success');
        }
    }

    calculateColumnSubtotal(column) {
        let subtotal = 0;
        const columnItemsList = this.columnItems[column];
        
        columnItemsList.forEach(item => {
            if (this.itemQuantities[item.name]) {
                const itemData = this.itemQuantities[item.name];
                subtotal += itemData.qty * itemData.rate;
            }
        });
        
        return subtotal;
    }

    updateColumnSubtotals() {
        // Calculate individual column totals
        const columnATotal = this.calculateColumnSubtotal('A');
        const columnBTotal = this.calculateColumnSubtotal('B');
        const columnCTotal = this.calculateColumnSubtotal('C');
        
        // Update subtotal displays (cumulative)
        document.getElementById('subtotal-a').textContent = ` ${formatNumber(columnATotal)}`;
        document.getElementById('subtotal-ab').textContent = ` ${formatNumber(columnATotal + columnBTotal)}`;
        document.getElementById('subtotal-abc').textContent = ` ${formatNumber(columnATotal + columnBTotal + columnCTotal)}`;
    }

    updateTotals() {
        let subtotal = 0;
        
        // Calculate subtotal from all item quantities
        Object.keys(this.itemQuantities).forEach(itemName => {
            const itemData = this.itemQuantities[itemName];
            if (itemData) {
                subtotal += itemData.qty * itemData.rate;
            }
        });
        
        // Update column subtotals
        this.updateColumnSubtotals();
    }



    saveAndPrintBill() {
        if (!this.validateBill()) {
            return;
        }
        
        try {
            // Prepare bill data
            const billData = {
                billNo: document.getElementById('bill-no').textContent,
                cashierName: document.getElementById('cashier-name').value,
                customerName: document.getElementById('customer-name').value,
                city: document.getElementById('city-name').value,
                storeName: 'Mangalmurti Traders', // Fixed store name
                storeAddress: 'Koradgaon Road, Pathardi',
                subtotal: this.calculateSubtotal(),
                roundOff: this.calculateRoundOff(),
                grandTotal: this.calculateGrandTotal()
            };
            
            // Prepare bill lines from all selected items
            const billLines = [];
            Object.keys(this.itemQuantities).forEach(itemName => {
                const itemData = this.itemQuantities[itemName];
                if (itemData && itemData.qty > 0) {
                    // Include variant name if present
                    const itemDisplayName = itemData.variantName 
                        ? `${itemName} (${itemData.variantName})`
                        : itemName;
                    
                    billLines.push({
                        itemName: itemDisplayName,
                        rate: itemData.rate,
                        qty: itemData.qty,
                        amount: itemData.qty * itemData.rate,
                        variantName: itemData.variantName || ''
                    });
                }
            });
            
            if (billLines.length === 0) {
                alert('Please add at least one item with quantity');
                return;
            }
            
            // Save to storage
            const savedBill = dataStore.saveBill(billData, billLines);
            
            // Increment bill number for next bill
            this.incrementBillNumber();
            
            // Generate and print directly
            this.generateAndPrintBill(savedBill, billLines);
            
            // Reset form for next bill
            this.resetForNewBill();
            
        } catch (error) {
            this.showError('Error saving bill: ' + error.message);
        }
    }

    generateAndPrintBill(bill, billLines) {
        // Create a temporary print window
        const printWindow = window.open('', '_blank');
        const printContent = this.generatePrintContent(bill, billLines);
        
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Print automatically
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
        
        this.showSuccess('Bill saved and printed successfully!');
    }

    generatePrintContent(bill, billLines) {
        // Group lines by column for display
        const columnLines = {
            A: billLines.filter(line => line.columnTag === 'A'),
            B: billLines.filter(line => line.columnTag === 'B'),
            C: billLines.filter(line => line.columnTag === 'C')
        };
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bill ${bill.bill_no}</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        margin: 20px; 
                        font-size: 14px; 
                    }
                    .invoice-header { 
                        display: flex; 
                        justify-content: space-between; 
                        margin-bottom: 20px; 
                        border-bottom: 2px solid #333; 
                        padding-bottom: 10px; 
                    }
                    .store-details h2 { 
                        color: #ff6b35; 
                        margin: 0; 
                    }
                    .bill-details { 
                        text-align: right; 
                    }
                    .customer-info { 
                        margin: 15px 0; 
                        padding: 10px; 
                        background: #f9f9f9; 
                    }
                    .invoice-table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 15px 0; 
                    }
                    .invoice-table th, .invoice-table td { 
                        border: 1px solid #ddd; 
                        padding: 8px; 
                        text-align: left; 
                    }
                    .invoice-table th { 
                        background: #f5f5f5; 
                    }
                    .totals { 
                        float: right; 
                        width: 300px; 
                        margin-top: 20px; 
                    }
                    .total-row { 
                        display: flex; 
                        justify-content: space-between; 
                        padding: 5px 0; 
                        border-bottom: 1px solid #eee; 
                    }
                    .grand-total { 
                        font-size: 18px; 
                        font-weight: bold; 
                        color: #ff6b35; 
                        border-top: 2px solid #ff6b35; 
                        padding-top: 10px; 
                    }
                    .footer { 
                        text-align: center; 
                        margin-top: 30px; 
                        color: #666; 
                    }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <div class="store-details">
                        <h2>${bill.store_name}</h2>
                        <p>${bill.store_address}</p>
                        <p>GSTIN: ${bill.store_gstin}</p>
                    </div>
                    <div class="bill-details">
                        <h3>BILL</h3>
                        <p><strong>Bill No:</strong> ${bill.bill_no}</p>
                        <p><strong>Date:</strong> ${new Date(bill.created_at).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${new Date(bill.created_at).toLocaleTimeString()}</p>
                    </div>
                </div>
                
                <div class="customer-info">
                    <p><strong>Customer:</strong> ${bill.customerName || 'Walk-in Customer'}</p>
                    <p><strong>City:</strong> ${bill.city || '-'}</p>
                    <p><strong>Cashier:</strong> ${bill.cashier_name || '-'}</p>
                </div>
                
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Rate</th>
                            <th>Qty</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${billLines.map(line => `
                            <tr>
                                <td>${line.itemName}</td>
                                <td> ${formatNumber(line.rate)}</td>
                                <td>${line.qty}</td>
                                <td> ${formatNumber(line.amount)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span> ${formatNumber(bill.subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Round Off:</span>
                        <span> ${formatNumber(bill.round_off)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Grand Total:</span>
                        <span> ${formatNumber(bill.grand_total)}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you for shopping with us! Have a Happy Diwali! 🪔</p>
                </div>
            </body>
            </html>
        `;
    }

    resetForNewBill() {
        // Clear all item quantities
        this.itemQuantities = {};
        
        // Reset all quantities and selections in UI
        ['A', 'B', 'C'].forEach(column => {
            this.columnItems[column].forEach((item, index) => {
                // Update UI
                const qtyInput = document.getElementById(`qty-${column}-${index}`);
                if (qtyInput) qtyInput.value = '';
                
                const totalCell = document.getElementById(`total-${column}-${index}`);
                if (totalCell) totalCell.textContent = ' 0.00';
            });
        });
        
        // Clear customer info but keep cashier
        document.getElementById('customer-name').value = '';
        document.getElementById('city-name').value = '';
        
        // Generate new bill number
        this.initializeBillHeader();
        
        // Update totals
        this.updateTotals();
    }

    validateBill() {
        // Check if customer name is provided
        const customerName = document.getElementById('customer-name').value.trim();
        if (!customerName) {
            alert('Customer name is required');
            document.getElementById('customer-name').focus();
            return false;
        }
        
        // Check if at least one item has quantity > 0
        const hasItems = Object.keys(this.itemQuantities).length > 0;
        
        if (!hasItems) {
            alert('Please add quantity to at least one item');
            return false;
        }
        
        return true;
    }

    calculateSubtotal() {
        let subtotal = 0;
        Object.keys(this.itemQuantities).forEach(itemName => {
            const itemData = this.itemQuantities[itemName];
            if (itemData) {
                subtotal += itemData.qty * itemData.rate;
            }
        });
        return subtotal;
    }

    calculateRoundOff() {
        const subtotal = this.calculateSubtotal();
        return Math.round(subtotal) - subtotal;
    }

    calculateGrandTotal() {
        return this.calculateSubtotal() + this.calculateRoundOff();
    }

    generatePrintView(bill, billLines) {
        const invoiceContent = document.getElementById('invoice-content');
        
        invoiceContent.innerHTML = `
            <div class="invoice-header">
                <div class="store-details">
                    <h2>${billData.storeName}</h2>
                    <p>${billData.storeAddress}</p>
                </div>
                <div class="bill-details">
                    <h3>BILL</h3>
                    <p><strong>Bill No:</strong> ${billData.billNo}</p>
                    <p><strong>Date & Time:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    ${billData.cashierName ? `<p><strong>Cashier:</strong> ${billData.cashierName}</p>` : ''}
                    ${billData.customerName ? `<p><strong>Customer:</strong> ${billData.customerName}</p>` : ''}
                    ${billData.city ? `<p><strong>City:</strong> ${billData.city}</p>` : ''}
                </div>
            </div>
            
            <div class="invoice-body">
                ${this.generateItemsTable(billLines)}
                
                <div class="invoice-totals">
                    <div class="totals-table">
                        <div class="total-row">
                            <span>Subtotal:</span>
                            <span> ${formatNumber(billData.subtotal)}</span>
                        </div>
                        <div class="total-row">
                            <span>Round Off:</span>
                            <span> ${formatNumber(billData.roundOff)}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span><strong>Grand Total:</strong></span>
                            <span><strong> ${formatNumber(billData.grandTotal)}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="invoice-footer">
                <p style="text-align: center; margin-top: 2rem; color: #666;">
                    Thank you for shopping with us! Have a Happy Diwali! 🪔
                </p>
            </div>
        `;
    }

    generateItemsTable(billLines) {
        let html = `
            <div class="invoice-items">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Rate</th>
                            <th>Qty</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        billLines.forEach(line => {
            html += `
                <tr>
                    <td>${line.itemName}</td>
                    <td> ${formatNumber(line.rate)}</td>
                    <td>${line.qty}</td>
                    <td> ${formatNumber(line.amount)}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        return html;
    }

    // Keyboard Navigation
    setupKeyboardNavigation() {
        // Nothing special needed for the new layout
        // Tab navigation works naturally with the input fields
    }

    handleKeyNav(event, column, rowIndex) {
        if (event.key === 'Enter') {
            event.preventDefault();
            
            // Try to find next row in same column
            const nextRowInput = document.getElementById(`qty-${column}-${rowIndex + 1}`);
            if (nextRowInput) {
                nextRowInput.focus();
                nextRowInput.select();
            } else {
                // Move to next column's first row
                const nextColumn = column === 'A' ? 'B' : (column === 'B' ? 'C' : 'A');
                const nextColumnInput = document.getElementById(`qty-${nextColumn}-0`);
                if (nextColumnInput) {
                    nextColumnInput.focus();
                    nextColumnInput.select();
                }
            }
        }
    }

    // UI Helper Functions
    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 1rem;
            border-radius: 5px;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
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
        }, 4000);
    }
}

// Initialize billing manager
window.billingManager = new BillingManager();

