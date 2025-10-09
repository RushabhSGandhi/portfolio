// Billing Functions and Logic
class BillingManager {
    constructor() {
        this.itemQuantities = {}; // Store item quantities by item ID
        this.allItems = [];
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
        
        // Generate bill number starting with 5000
        const billNo = this.generateCustomBillNumber();
        document.getElementById('bill-no').textContent = billNo;
    }

    generateCustomBillNumber() {
        const data = dataStore.getData();
        const today = new Date().toISOString().split('T')[0];
        
        // Reset counter if it's a new day
        if (data.settings.lastBillDate !== today) {
            data.settings.billCounter = 5000;
            data.settings.lastBillDate = today;
        }
        
        const billNo = data.settings.billCounter;
        data.settings.billCounter++;
        dataStore.saveData(data);
        return billNo.toString();
    }

    loadAndDisplayItems() {
        // Get simple items array directly
        this.allItems = dataStore.getSimpleItems();
        
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
        
        // Simple items - just name and rate
        row.innerHTML = `
            <td class="item-cell">
                <span class="item-name" id="item-name-${column}-${index}" data-item-name="${item.name}">
                    ${item.name}
                </span>
            </td>
            <td class="qty-cell">
                <input type="number" 
                       class="qty-input" 
                       id="qty-${column}-${index}"
                       value="" 
                       min="0" 
                       step="0.1" 
                       onchange="billingManager.updateItemQuantity('${column}', ${index}, this.value)"
                       onkeydown="billingManager.handleKeyNav(event, '${column}', ${index})"
                       placeholder="0">
            </td>
            <td class="rate-cell" id="rate-${column}-${index}">
                <input type="number" 
                       class="rate-input" 
                       id="rate-input-${column}-${index}"
                       value="${item.rate.toFixed(2)}" 
                       min="0" 
                       step="0.01" 
                       onchange="billingManager.updateItemRate('${column}', ${index}, this.value)"
                       placeholder="Rate">
            </td>
            <td class="total-cell" id="total-${column}-${index}">
                ₹0.00
            </td>
        `;
        
        return row;
    }

    updateVariantSelection(column, index, itemId) {
        const item = this.allItems.find(i => i.id === itemId);
        if (item) {
            // Update the rate display
            const rateCell = document.getElementById(`rate-${column}-${index}`);
            rateCell.textContent = `₹${item.default_rate.toFixed(2)}`;
            
            // Update the total if there's a quantity
            const qtyInput = document.getElementById(`qty-${column}-${index}`);
            if (qtyInput.value) {
                this.updateItemQuantity(column, index, qtyInput.value);
            }
        }
    }

    updateItemQuantity(column, index, quantity) {
        const qty = parseFloat(quantity) || 0;
        const itemName = document.getElementById(`item-name-${column}-${index}`);
        const itemNameText = itemName.getAttribute('data-item-name');
        
        if (itemNameText && qty > 0) {
            const item = this.columnItems[column][index];
            if (item) {
                // Get current rate from input field
                const rateInput = document.getElementById(`rate-input-${column}-${index}`);
                const currentRate = parseFloat(rateInput.value) || item.rate;
                
                const total = qty * currentRate;
                const totalCell = document.getElementById(`total-${column}-${index}`);
                totalCell.textContent = `₹${total.toFixed(2)}`;
                
                // Store quantity and current rate using item name as key
                this.itemQuantities[itemNameText] = { qty: qty, rate: currentRate };
            }
        } else {
            // Clear total if no quantity
            const totalCell = document.getElementById(`total-${column}-${index}`);
            totalCell.textContent = '₹0.00';
            
            // Remove from tracking if exists
            if (itemNameText && this.itemQuantities[itemNameText]) {
                delete this.itemQuantities[itemNameText];
            }
        }
        
        this.updateTotals();
    }

    updateItemRate(column, index, newRate) {
        const rate = parseFloat(newRate) || 0;
        const itemName = document.getElementById(`item-name-${column}-${index}`);
        const itemNameText = itemName.getAttribute('data-item-name');
        
        if (itemNameText && rate > 0) {
            const item = this.columnItems[column][index];
            const qtyInput = document.getElementById(`qty-${column}-${index}`);
            const qty = parseFloat(qtyInput.value) || 0;
            
            if (item) {
                // Update the item's rate
                item.rate = rate;
                
                // Mark as rate-edited for highlighting
                const rateInput = document.getElementById(`rate-input-${column}-${index}`);
                const itemRow = rateInput.closest('tr');
                
                // Check if rate is different from original
                const originalRate = this.allItems.find(originalItem => originalItem.name === itemNameText)?.rate || item.rate;
                if (Math.abs(rate - originalRate) > 0.01) {
                    itemRow.classList.add('rate-edited');
                    rateInput.classList.add('rate-edited');
                } else {
                    itemRow.classList.remove('rate-edited');
                    rateInput.classList.remove('rate-edited');
                }
                
                // Recalculate total if there's a quantity
                if (qty > 0) {
                    const total = qty * rate;
                    const totalCell = document.getElementById(`total-${column}-${index}`);
                    totalCell.textContent = `₹${total.toFixed(2)}`;
                    
                    // Update tracking with new rate
                    this.itemQuantities[itemNameText] = { qty: qty, rate: rate };
                }
            }
        }
        
        this.updateTotals();
    }

    refreshItems() {
        this.loadAndDisplayItems();
        this.updateTotals();
    }

    resetQuantities() {
        if (!confirm('Reset all quantities to 0?')) {
            return;
        }
        
        // Clear all item quantities
        this.itemQuantities = {};
        
        // Reset all quantities in all columns
        ['A', 'B', 'C'].forEach(column => {
            this.columnItems[column].forEach((item, index) => {
                // Update UI
                const qtyInput = document.getElementById(`qty-${column}-${index}`);
                if (qtyInput) {
                    qtyInput.value = '';
                }
                
                const totalCell = document.getElementById(`total-${column}-${index}`);
                if (totalCell) {
                    totalCell.textContent = '₹0.00';
                }
            });
        });
        
        this.updateTotals();
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
        document.getElementById('subtotal-a').textContent = `₹${columnATotal.toFixed(2)}`;
        document.getElementById('subtotal-ab').textContent = `₹${(columnATotal + columnBTotal).toFixed(2)}`;
        document.getElementById('subtotal-abc').textContent = `₹${(columnATotal + columnBTotal + columnCTotal).toFixed(2)}`;
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
        
        const roundOff = Math.round(subtotal) - subtotal;
        const grandTotal = subtotal + roundOff;
        
        // Update display
        document.getElementById('grand-total').textContent = `₹${grandTotal.toFixed(2)}`;
        
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
                    billLines.push({
                        itemName: itemName,
                        rate: itemData.rate,
                        qty: itemData.qty,
                        amount: itemData.qty * itemData.rate
                    });
                }
            });
            
            if (billLines.length === 0) {
                alert('Please add at least one item with quantity');
                return;
            }
            
            // Save to storage
            const savedBill = dataStore.saveBill(billData, billLines);
            
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
                                <td>${line.itemTypeName} - ${line.itemVariantName}</td>
                                <td>₹${line.rate.toFixed(2)}</td>
                                <td>${line.qty}</td>
                                <td>₹${line.amount.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>₹${bill.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Round Off:</span>
                        <span>₹${bill.round_off.toFixed(2)}</span>
                    </div>
                    <div class="total-row grand-total">
                        <span>Grand Total:</span>
                        <span>₹${bill.grand_total.toFixed(2)}</span>
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
                if (totalCell) totalCell.textContent = '₹0.00';
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
                            <span>₹${billData.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="total-row">
                            <span>Round Off:</span>
                            <span>₹${billData.roundOff.toFixed(2)}</span>
                        </div>
                        <div class="total-row grand-total">
                            <span><strong>Grand Total:</strong></span>
                            <span><strong>₹${billData.grandTotal.toFixed(2)}</strong></span>
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
                    <td>₹${line.rate.toFixed(2)}</td>
                    <td>${line.qty}</td>
                    <td>₹${line.amount.toFixed(2)}</td>
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