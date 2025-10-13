// Catalog Management System
class CatalogManager {
    constructor() {
        this.currentEditingItem = null;
        this.isInitialized = false;
        this.tempVariants = []; // Temporary storage for variants while adding new item
        this.editVariants = []; // Temporary storage for variants while editing item
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.loadCatalogItems();
        this.isInitialized = true;
        console.log('Catalog Manager initialized successfully!');
    }

    setupEventListeners() {
        // Add item form submission
        const addForm = document.getElementById('add-item-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewItem();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('catalog-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.filterCatalog(e.target.value);
            }, 300));
        }

        // Import/Export buttons
        const exportBtn = document.getElementById('export-catalog');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportCatalog());
        }

        const importBtn = document.getElementById('import-catalog');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.importCatalog());
        }
    }

    loadCatalogItems() {
        const items = dataStore.getCatalogItems();
        this.renderCatalogTable(items);
        this.updateCatalogStats(items);
    }

    renderCatalogTable(items) {
        const tbody = document.getElementById('catalog-items-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-state">
                        <i class="fas fa-box-open"></i>
                        <p>No items in catalog. Add your first item below!</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort items by position
        const sortedItems = [...items].sort((a, b) => {
            const posA = parseInt(a.position) || 999;
            const posB = parseInt(b.position) || 999;
            return posA - posB;
        });

        sortedItems.forEach((item) => {
            // Find the original index of this item in the unsorted array
            const originalIndex = items.findIndex(i => i.name === item.name);
            
            // Add main item row
            const row = this.createCatalogRow(item, originalIndex, false);
            tbody.appendChild(row);
            
            // Add variant rows if they exist
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach((variant) => {
                    const variantRow = this.createVariantRow(item, variant, originalIndex);
                    tbody.appendChild(variantRow);
                });
            }
        });
    }

    createCatalogRow(item, index, isVariant = false) {
        const row = document.createElement('tr');
        row.className = 'catalog-row';
        
        row.innerHTML = `
            <td class="item-position-cell">
                <input type="number" class="position-input" value="${item.position || 1}" 
                       min="1" step="1" onchange="catalogManager.updatePositionByIndex(${index}, this.value)">
            </td>
            <td class="item-name-cell">
                <span class="item-name" data-item-id="${item.id || index}">${item.name}</span>
            </td>
            <td class="item-rate-cell">
                <span class="item-rate">${parseFloat(item.rate).toFixed(1)}</span>
            </td>
            <td class="item-actions-cell">
                <button class="btn-icon edit-btn" onclick="catalogManager.editItem(${index})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-btn" onclick="catalogManager.deleteItem(${index})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        return row;
    }
    
    createVariantRow(parentItem, variant, parentIndex) {
        const row = document.createElement('tr');
        row.className = 'catalog-row variant-row';
        
        row.innerHTML = `
            <td class="item-position-cell">
                <span style="color: #ccc; font-size: 0.7rem;">└</span>
            </td>
            <td class="item-name-cell" style="padding-left: 2rem;">
                <span class="item-name" style="font-weight: 500; color: #555; font-size: 0.85rem;">${variant.name}</span>
            </td>
            <td class="item-rate-cell">
                <span class="item-rate" style="color: #28a745; font-weight: 600;">${parseFloat(variant.rate).toFixed(1)}</span>
            </td>
            <td class="item-actions-cell">
                <span style="color: #ccc; font-size: 0.75rem;">variant</span>
            </td>
        `;
        return row;
    }

    async addNewItem() {
        const nameInput = document.getElementById('new-item-name');
        const rateInput = document.getElementById('new-item-rate');
        const positionInput = document.getElementById('new-item-position');
        const hasVariantsCheckbox = document.getElementById('has-variants-checkbox');

        const name = nameInput.value.trim();
        const rate = parseFloat(rateInput.value);
        const position = parseInt(positionInput.value) || 1;
        const hasVariants = hasVariantsCheckbox.checked;

        // Validation
        if (!name) {
            this.showError('Item name is required');
            nameInput.focus();
            return;
        }

        // Rate is always required (it's the base item's rate)
        if (isNaN(rate) || rate <= 0) {
            this.showError('Please enter a valid rate greater than 0');
            rateInput.focus();
            return;
        }

        // Check for duplicate names
        const existingItems = dataStore.getCatalogItems();
        if (existingItems.some(item => item.name.toLowerCase() === name.toLowerCase())) {
            this.showError('An item with this name already exists');
            nameInput.focus();
            return;
        }

        // Add item to catalog
        const newItem = {
            name: name,
            rate: rate, // Base item rate (always required)
            position: position
        };

        // Add variants if checkbox is checked
        if (hasVariants && this.tempVariants.length > 0) {
            newItem.variants = [...this.tempVariants];
        }

        try {
            // Show loading state
            const submitBtn = document.querySelector('#add-item-form button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            submitBtn.disabled = true;

            await dataStore.addCatalogItem(newItem);

            // Clear form
            nameInput.value = '';
            rateInput.value = '';
            positionInput.value = '1';
            hasVariantsCheckbox.checked = false;
            this.tempVariants = [];
            document.getElementById('variants-section').style.display = 'none';
            document.getElementById('variants-list').innerHTML = '';
            nameInput.focus();

            // Restore button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            // If not using Firebase real-time updates, refresh manually
            if (!dataStore.isUsingFirebase()) {
                this.loadCatalogItems();
                
                // Update billing manager
                if (typeof billingManager !== 'undefined') {
                    billingManager.refreshItems();
                }
            }

            this.showSuccess(`Item "${name}" added successfully!`);
            
        } catch (error) {
            console.error('Error adding item:', error);
            this.showError('Failed to add item. Please try again.');
            
            // Restore button
            const submitBtn = document.querySelector('#add-item-form button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Item';
            submitBtn.disabled = false;
        }
    }

    editItem(index) {
        const items = dataStore.getCatalogItems();
        const item = items[index];
        
        if (!item) return;

        this.currentEditingItem = { ...item, index };
        
        // Initialize edit variants from existing item
        this.editVariants = item.variants ? [...item.variants] : [];
        
        this.showEditModal(item);
    }

    showEditModal(item) {
        const hasVariants = item.variants && item.variants.length > 0;
        
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content edit-item-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Item</h3>
                    <button class="close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="edit-item-form">
                        <div class="form-group">
                            <label for="edit-item-name">Item Name:</label>
                            <input type="text" id="edit-item-name" value="${item.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="edit-item-rate">Base Rate:</label>
                            <input type="number" id="edit-item-rate" value="${item.rate}" step="0.1" min="0" required>
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="edit-has-variants-checkbox" onchange="toggleEditVariantsSection()" ${hasVariants ? 'checked' : ''}> 
                                Has variants (dropdown)
                            </label>
                        </div>
                        
                        <!-- Variants Section -->
                        <div id="edit-variants-section" style="display: ${hasVariants ? 'block' : 'none'}; margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
                            <h4 style="margin-top: 0; font-size: 0.95rem;">
                                <i class="fas fa-list"></i> Variants (Options)
                            </h4>
                            <div id="edit-variants-list"></div>
                            <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                                <input type="text" id="edit-variant-name-input" placeholder="Option name (e.g., Lux)" style="flex: 2; min-width: 200px; padding: 0.5rem; font-size: 0.95rem;">
                                <input type="number" id="edit-variant-rate-input" placeholder="Rate" step="0.1" min="0" style="width: 120px; padding: 0.5rem; font-size: 0.95rem;">
                                <button type="button" onclick="addEditVariant()" class="btn btn-sm" style="padding: 0.4rem 0.8rem; white-space: nowrap;">
                                    <i class="fas fa-plus"></i> Add Variant
                                </button>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Render existing variants if any
        if (hasVariants) {
            renderEditVariantsList();
        }

        // Setup form handler
        const editForm = document.getElementById('edit-item-form');
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditedItem();
        });

        // Focus on name input
        document.getElementById('edit-item-name').focus();
    }

    async saveEditedItem() {
        const nameInput = document.getElementById('edit-item-name');
        const rateInput = document.getElementById('edit-item-rate');
        const hasVariantsCheckbox = document.getElementById('edit-has-variants-checkbox');

        const name = nameInput.value.trim();
        const rate = parseFloat(rateInput.value);
        const hasVariants = hasVariantsCheckbox.checked;

        // Validation
        if (!name) {
            this.showError('Item name is required');
            return;
        }

        // Rate is always required (it's the base item's rate)
        if (isNaN(rate) || rate <= 0) {
            this.showError('Please enter a valid rate greater than 0');
            return;
        }

        // Check for duplicate names (excluding current item)
        const existingItems = dataStore.getCatalogItems();
        const duplicateItem = existingItems.find((item, index) => 
            item.name.toLowerCase() === name.toLowerCase() && 
            index !== this.currentEditingItem.index
        );

        if (duplicateItem) {
            this.showError('An item with this name already exists');
            return;
        }

        try {
            // Show loading state
            const saveBtn = document.querySelector('#edit-item-form button[type="submit"]');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;

            // Update item
            const updatedItem = {
                name: name,
                rate: rate, // Base item rate (always required)
                position: this.currentEditingItem.position || 1
            };
            
            // Add variants if checkbox is checked and there are variants
            if (hasVariants && this.editVariants.length > 0) {
                updatedItem.variants = [...this.editVariants];
            } else {
                // Remove variants if checkbox is unchecked or no variants
                updatedItem.variants = [];
            }

            // Use Firebase ID if available, otherwise use index
            const identifier = this.currentEditingItem.id || this.currentEditingItem.index;
            await dataStore.updateCatalogItem(identifier, updatedItem);

            // Close modal
            document.querySelector('.modal-overlay').remove();

            // If not using Firebase real-time updates, refresh manually
            if (!dataStore.isUsingFirebase()) {
                this.loadCatalogItems();
                
                // Update billing manager
                if (typeof billingManager !== 'undefined') {
                    billingManager.refreshItems();
                }
            }

            this.showSuccess(`Item "${name}" updated successfully!`);
            this.currentEditingItem = null;
            this.editVariants = [];
            
        } catch (error) {
            console.error('Error updating item:', error);
            this.showError('Failed to update item. Please try again.');
            
            // Restore button
            const saveBtn = document.querySelector('#edit-item-form button[type="submit"]');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            saveBtn.disabled = false;
        }
    }

    async updatePositionByIndex(index, newPosition) {
        const items = dataStore.getCatalogItems();
        const item = items[index];
        
        if (!item) return;

        const newPos = parseInt(newPosition);
        
        if (isNaN(newPos) || newPos < 1) {
            this.showError('Position must be a number greater than 0');
            this.loadCatalogItems(); // Reload to reset the input
            return;
        }
        
        try {
            // Simply update this item's position
            const updatedItem = {
                ...item,
                position: newPos
            };
            
            await dataStore.updateCatalogItem(index, updatedItem);
            
            // Refresh display
            this.loadCatalogItems();
            
            // Update billing manager
            if (typeof billingManager !== 'undefined') {
                billingManager.refreshItems();
            }
            
        } catch (error) {
            console.error('Error updating position:', error);
            this.showError('Failed to update position. Please try again.');
            this.loadCatalogItems();
        }
    }

    async deleteItem(index) {
        const items = dataStore.getCatalogItems();
        const item = items[index];
        
        if (!item) return;

        if (confirm(`Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`)) {
            try {
                // Use Firebase ID if available, otherwise use index
                const identifier = item.id || index;
                await dataStore.deleteCatalogItem(identifier);
                
                // If not using Firebase real-time updates, refresh manually
                if (!dataStore.isUsingFirebase()) {
                    this.loadCatalogItems();

                    // Update billing manager
                    if (typeof billingManager !== 'undefined') {
                        billingManager.refreshItems();
                    }
                }

                this.showSuccess(`Item "${item.name}" deleted successfully!`);
                
            } catch (error) {
                console.error('Error deleting item:', error);
                this.showError('Failed to delete item. Please try again.');
            }
        }
    }

    duplicateItem(index) {
        const items = dataStore.getCatalogItems();
        const item = items[index];
        
        if (!item) return;

        const duplicatedItem = {
            id: this.generateItemId(),
            name: `${item.name} (Copy)`,
            rate: item.rate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        dataStore.addCatalogItem(duplicatedItem);

        // Refresh display
        this.loadCatalogItems();

        // Update billing manager
        if (typeof billingManager !== 'undefined') {
            billingManager.refreshItems();
        }

        this.showSuccess(`Item duplicated as "${duplicatedItem.name}"!`);
    }

    filterCatalog(searchTerm) {
        const items = dataStore.getCatalogItems();
        const filteredItems = items.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderCatalogTable(filteredItems);
        this.updateCatalogStats(filteredItems, searchTerm);
    }

    updateCatalogStats(items, searchTerm = '') {
        const statsDiv = document.getElementById('catalog-stats');
        if (!statsDiv) return;

        const totalItems = items.length;
        const avgRate = totalItems > 0 ? 
            (items.reduce((sum, item) => sum + parseFloat(item.rate), 0) / totalItems).toFixed(1) : 
            '0.00';

        const statsText = searchTerm ? 
            `Showing ${totalItems} items matching "${searchTerm}"` : 
            `Total Items: ${totalItems} | Average Rate:  ${avgRate}`;

        statsDiv.innerHTML = `
            <i class="fas fa-chart-bar"></i>
            <span>${statsText}</span>
        `;
    }

    exportCatalog() {
        const items = dataStore.getCatalogItems();
        const dataStr = JSON.stringify(items, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `catalog_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        this.showSuccess('Catalog exported successfully!');
    }

    importCatalog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (Array.isArray(importedData)) {
                        if (confirm(`Import ${importedData.length} items? This will replace your current catalog.`)) {
                            dataStore.setCatalogItems(importedData);
                            this.loadCatalogItems();
                            
                            // Update billing manager
                            if (typeof billingManager !== 'undefined') {
                                billingManager.refreshItems();
                            }
                            
                            this.showSuccess(`Successfully imported ${importedData.length} items!`);
                        }
                    } else {
                        this.showError('Invalid file format. Please select a valid catalog backup file.');
                    }
                } catch (error) {
                    this.showError('Error reading file. Please ensure it\'s a valid JSON file.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    generateItemId() {
        return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Utility methods
    showSuccess(message) {
        app.showToast(message, 'success');
    }

    showError(message) {
        app.showToast(message, 'error');
    }
}

// Global functions for HTML access
function addNewItem() {
    catalogManager.addNewItem();
}

function editItem(index) {
    catalogManager.editItem(index);
}

function deleteItem(index) {
    catalogManager.deleteItem(index);
}

function duplicateItem(index) {
    catalogManager.duplicateItem(index);
}

// Variant management functions
function toggleVariantsSection() {
    const checkbox = document.getElementById('has-variants-checkbox');
    const variantsSection = document.getElementById('variants-section');
    
    if (checkbox.checked) {
        variantsSection.style.display = 'block';
    } else {
        variantsSection.style.display = 'none';
        catalogManager.tempVariants = [];
        document.getElementById('variants-list').innerHTML = '';
    }
}

function addVariant() {
    const nameInput = document.getElementById('variant-name-input');
    const rateInput = document.getElementById('variant-rate-input');
    
    const name = nameInput.value.trim();
    const rate = parseFloat(rateInput.value);
    
    if (!name) {
        app.showToast('Please enter variant name', 'error');
        return;
    }
    
    if (isNaN(rate) || rate <= 0) {
        app.showToast('Please enter a valid rate', 'error');
        return;
    }
    
    // Add to temp variants
    catalogManager.tempVariants.push({ name, rate });
    
    // Clear inputs
    nameInput.value = '';
    rateInput.value = '';
    nameInput.focus();
    
    // Render variants list
    renderVariantsList();
}

function removeVariant(index) {
    catalogManager.tempVariants.splice(index, 1);
    renderVariantsList();
}

function renderVariantsList() {
    const variantsList = document.getElementById('variants-list');
    
    if (catalogManager.tempVariants.length === 0) {
        variantsList.innerHTML = '<p style="color: #999; font-size: 0.85rem; margin: 0.5rem 0;">No variants added yet</p>';
        return;
    }
    
    variantsList.innerHTML = catalogManager.tempVariants.map((variant, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; background: white; border-radius: 3px; margin-bottom: 0.3rem;">
            <span style="flex: 1; font-size: 0.9rem;">${variant.name}</span>
            <span style="font-weight: 600; color: #28a745; min-width: 80px; text-align: right;">${variant.rate.toFixed(1)}</span>
            <button type="button" onclick="removeVariant(${index})" class="btn btn-sm" style="padding: 0.2rem 0.5rem; background: #dc3545; color: white;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Edit mode variant functions
function toggleEditVariantsSection() {
    const checkbox = document.getElementById('edit-has-variants-checkbox');
    const variantsSection = document.getElementById('edit-variants-section');
    
    if (checkbox.checked) {
        variantsSection.style.display = 'block';
    } else {
        variantsSection.style.display = 'none';
        // Don't clear variants here, user might toggle back
    }
}

function addEditVariant() {
    const nameInput = document.getElementById('edit-variant-name-input');
    const rateInput = document.getElementById('edit-variant-rate-input');
    
    const name = nameInput.value.trim();
    const rate = parseFloat(rateInput.value);
    
    if (!name) {
        app.showToast('Please enter variant name', 'error');
        return;
    }
    
    if (isNaN(rate) || rate <= 0) {
        app.showToast('Please enter a valid rate', 'error');
        return;
    }
    
    // Add to edit variants
    catalogManager.editVariants.push({ name, rate });
    
    // Clear inputs
    nameInput.value = '';
    rateInput.value = '';
    nameInput.focus();
    
    // Render variants list
    renderEditVariantsList();
}

function removeEditVariant(index) {
    catalogManager.editVariants.splice(index, 1);
    renderEditVariantsList();
}

function renderEditVariantsList() {
    const variantsList = document.getElementById('edit-variants-list');
    
    if (catalogManager.editVariants.length === 0) {
        variantsList.innerHTML = '<p style="color: #999; font-size: 0.85rem; margin: 0.5rem 0;">No variants added yet</p>';
        return;
    }
    
    variantsList.innerHTML = catalogManager.editVariants.map((variant, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: white; border-radius: 3px; margin-bottom: 0.5rem; border: 1px solid #e0e0e0;">
            <div style="flex: 2; min-width: 0;">
                <label style="display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.2rem;">Variant Name</label>
                <input type="text" value="${variant.name}" 
                       onchange="updateEditVariantName(${index}, this.value)"
                       style="width: 100%; font-size: 0.9rem; padding: 0.4rem 0.5rem; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;"
                       placeholder="Variant name">
            </div>
            <div style="min-width: 90px; max-width: 90px;">
                <label style="display: block; font-size: 0.75rem; color: #666; margin-bottom: 0.2rem;">Rate</label>
                <input type="number" value="${variant.rate}" step="0.1" min="0"
                       onchange="updateEditVariantRate(${index}, this.value)"
                       style="width: 100%; font-weight: 600; color: #28a745; padding: 0.4rem 0.5rem; border: 1px solid #ddd; border-radius: 3px; box-sizing: border-box;"
                       placeholder="Rate">
            </div>
            <button type="button" onclick="removeEditVariant(${index})" class="btn btn-sm" 
                    style="padding: 0.5rem 0.6rem; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; margin-top: 1.2rem;"
                    title="Remove variant">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Update variant name during edit
function updateEditVariantName(index, newName) {
    const name = newName.trim();
    if (!name) {
        app.showToast('Variant name cannot be empty', 'error');
        renderEditVariantsList(); // Re-render to reset the input
        return;
    }
    catalogManager.editVariants[index].name = name;
}

// Update variant rate during edit
function updateEditVariantRate(index, newRate) {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
        app.showToast('Please enter a valid rate greater than 0', 'error');
        renderEditVariantsList(); // Re-render to reset the input
        return;
    }
    catalogManager.editVariants[index].rate = rate;
}

// Initialize catalog manager
window.catalogManager = new CatalogManager();

// Export functions for global access
window.addNewItem = addNewItem;
window.editItem = editItem;
window.deleteItem = deleteItem;
window.duplicateItem = duplicateItem;
window.toggleVariantsSection = toggleVariantsSection;
window.addVariant = addVariant;
window.removeVariant = removeVariant;
window.renderVariantsList = renderVariantsList;
window.toggleEditVariantsSection = toggleEditVariantsSection;
window.addEditVariant = addEditVariant;
window.removeEditVariant = removeEditVariant;
window.renderEditVariantsList = renderEditVariantsList;
window.updateEditVariantName = updateEditVariantName;
window.updateEditVariantRate = updateEditVariantRate;
window.addEditVariant = addEditVariant;
window.removeEditVariant = removeEditVariant;
window.renderEditVariantsList = renderEditVariantsList;


