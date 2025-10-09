// Data Models and Storage Layer
class DataStore {
    constructor() {
        this.storageKey = 'diwali-billing-data';
        this.useFirebase = false;
        this.catalogListener = null;
        this.initializeData();
    }

    // Initialize Firebase integration
    async initializeFirebase(config) {
        try {
            const success = await firebaseService.init(config);
            if (success) {
                this.useFirebase = true;
                console.log('DataStore: Firebase integration enabled');
                
                // Migrate local data to Firebase if needed
                await this.migrateToFirebase();
                
                // Setup real-time listeners
                this.setupRealtimeListeners();
                
                return true;
            }
        } catch (error) {
            console.error('Firebase initialization failed, using localStorage fallback:', error);
            this.useFirebase = false;
        }
        return false;
    }

    async migrateToFirebase() {
        try {
            // Check if Firebase catalog is empty
            const firebaseCatalog = await firebaseService.getCatalogItems();
            if (firebaseCatalog.length === 0) {
                // Migrate from localStorage
                const migrated = await firebaseService.migrateCatalogFromLocalStorage();
                if (migrated) {
                    console.log('Local catalog migrated to Firebase successfully!');
                }
            }
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    setupRealtimeListeners() {
        // Listen for catalog changes
        this.catalogListener = firebaseService.onCatalogChanges((items) => {
            console.log('Catalog updated from Firebase:', items.length, 'items');
            
            // Update local cache
            const data = this.getData();
            data.catalogItems = items;
            this.saveData(data);
            
            // Notify billing manager to refresh
            if (typeof billingManager !== 'undefined') {
                billingManager.refreshItems();
            }
            
            // Notify catalog manager to refresh
            if (typeof catalogManager !== 'undefined' && catalogManager.isInitialized) {
                catalogManager.loadCatalogItems();
            }
        });
    }

    // Enhanced method to handle both Firebase and localStorage
    async getCatalogItemsAsync() {
        if (this.useFirebase && firebaseService.isOnlineMode()) {
            try {
                return await firebaseService.getCatalogItems();
            } catch (error) {
                console.error('Firebase fetch failed, using local cache:', error);
                return this.getCatalogItems();
            }
        }
        return this.getCatalogItems();
    }

    initializeData() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                settings: {
                    storeName: 'Mangalmurti Traders',
                    storeAddress: 'Koradgaon Road, Pathardi',
                    billCounter: 5000,
                    lastBillDate: new Date().toISOString().split('T')[0]
                },
                bills: [],
                billLines: [],
                catalogItems: this.getDefaultCatalogItems()
            };
            this.saveData(initialData);
        } else {
            // Migration: If catalogItems don't exist, add them
            const data = this.getData();
            if (!data.catalogItems) {
                data.catalogItems = this.getDefaultCatalogItems();
                this.saveData(data);
            }
            if (!data.bills) {
                data.bills = [];
                this.saveData(data);
            }
            if (!data.billLines) {
                data.billLines = [];
                this.saveData(data);
            }
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.storageKey));
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }



    // Bills CRUD
    getBills() {
        return this.getData().bills;
    }

    generateBillNumber() {
        const data = this.getData();
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // Reset counter if it's a new day
        if (data.settings.lastBillDate !== new Date().toISOString().split('T')[0]) {
            data.settings.billCounter = 1;
            data.settings.lastBillDate = new Date().toISOString().split('T')[0];
        }
        
        const billNo = `DWL-${today}-${String(data.settings.billCounter).padStart(4, '0')}`;
        data.settings.billCounter++;
        this.saveData(data);
        return billNo;
    }

    saveBill(billData, billLines) {
        const data = this.getData();
        
        const newBill = {
            id: this.generateId('bill'),
            bill_no: billData.billNo,
            created_at: new Date().toISOString(),
            cashier_name: billData.cashierName || '',
            subtotal: billData.subtotal,
            grand_total: billData.grandTotal,
            round_off: billData.roundOff,
            store_name: billData.storeName,
            store_address: billData.storeAddress,
            store_gstin: billData.storeGSTIN
        };

        data.bills.push(newBill);

        // Save bill lines
        billLines.forEach(line => {
            const billLine = {
                id: this.generateId('billline'),
                bill_id: newBill.id,
                column_tag: line.columnTag,
                item_type_name: line.itemTypeName,
                item_variant_name: line.itemVariantName,
                rate: line.rate,
                rate_overridden: line.rateOverridden,
                qty: line.qty,
                amount: line.amount
            };
            data.billLines.push(billLine);
        });

        this.saveData(data);
        return newBill;
    }

    getBill(id) {
        return this.getData().bills.find(b => b.id === id);
    }

    getBillLines(billId) {
        return this.getData().billLines.filter(bl => bl.bill_id === billId);
    }

    // Utility methods
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Export/Import functionality
    exportData() {
        return this.getData();
    }






    // Catalog Management Methods (Firebase + localStorage hybrid)
    getCatalogItems() {
        const data = this.getData();
        return data.catalogItems || [];
    }

    async addCatalogItem(item) {
        if (this.useFirebase && firebaseService.isOnlineMode()) {
            try {
                const firebaseId = await firebaseService.addCatalogItem(item);
                // Firebase listener will update local cache automatically
                return firebaseId;
            } catch (error) {
                console.error('Firebase add failed, saving locally:', error);
                // Fallback to localStorage
                this.addCatalogItemLocal(item);
                throw error;
            }
        } else {
            // Offline or Firebase disabled
            this.addCatalogItemLocal(item);
        }
    }

    addCatalogItemLocal(item) {
        const data = this.getData();
        if (!data.catalogItems) {
            data.catalogItems = [];
        }
        data.catalogItems.push(item);
        this.saveData(data);
    }

    async updateCatalogItem(identifier, updatedItem) {
        if (this.useFirebase && firebaseService.isOnlineMode()) {
            try {
                // If identifier is a number, it's an index (legacy)
                if (typeof identifier === 'number') {
                    const items = this.getCatalogItems();
                    const item = items[identifier];
                    if (item && item.id) {
                        await firebaseService.updateCatalogItem(item.id, updatedItem);
                        return;
                    }
                } else {
                    // It's a Firebase document ID
                    await firebaseService.updateCatalogItem(identifier, updatedItem);
                    return;
                }
            } catch (error) {
                console.error('Firebase update failed, updating locally:', error);
            }
        }
        
        // Fallback to localStorage
        this.updateCatalogItemLocal(identifier, updatedItem);
    }

    updateCatalogItemLocal(index, updatedItem) {
        const data = this.getData();
        if (data.catalogItems && data.catalogItems[index]) {
            data.catalogItems[index] = updatedItem;
            this.saveData(data);
        }
    }

    async deleteCatalogItem(identifier) {
        if (this.useFirebase && firebaseService.isOnlineMode()) {
            try {
                // If identifier is a number, it's an index (legacy)
                if (typeof identifier === 'number') {
                    const items = this.getCatalogItems();
                    const item = items[identifier];
                    if (item && item.id) {
                        await firebaseService.deleteCatalogItem(item.id);
                        return;
                    }
                } else {
                    // It's a Firebase document ID
                    await firebaseService.deleteCatalogItem(identifier);
                    return;
                }
            } catch (error) {
                console.error('Firebase delete failed, deleting locally:', error);
            }
        }
        
        // Fallback to localStorage
        this.deleteCatalogItemLocal(identifier);
    }

    deleteCatalogItemLocal(index) {
        const data = this.getData();
        if (data.catalogItems && data.catalogItems[index]) {
            data.catalogItems.splice(index, 1);
            this.saveData(data);
        }
    }

    setCatalogItems(items) {
        const data = this.getData();
        data.catalogItems = items;
        this.saveData(data);
    }

    // Check if Firebase is being used
    isUsingFirebase() {
        return this.useFirebase && firebaseService.isInitialized();
    }

    // Get connection status
    getConnectionStatus() {
        if (!this.useFirebase) return 'localStorage';
        if (!firebaseService.isOnlineMode()) return 'offline';
        return 'online';
    }

    // Get simple items array - now from dynamic catalog
    getSimpleItems() {
        return this.getCatalogItems();
    }

    // Get default catalog items (moved from hardcoded array)
    getDefaultCatalogItems() {
        const defaultItems = [
            // Column 1 Items
            { name: 'श्रीफळ', rate: 50.00 },
            { name: 'साखर', rate: 45.00 },
            { name: 'पिठी साखर', rate: 55.00 },
            { name: 'गरा', rate: 65.00 },
            { name: 'मैदा', rate: 35.00 },
            { name: 'बेसन', rate: 85.00 },
            { name: 'शेंगदाणे', rate: 120.00 },
            { name: 'शाबुदाना', rate: 80.00 },
            { name: 'हरबरा दाळ', rate: 90.00 },
            { name: 'तूर दाळ', rate: 110.00 },
            { name: 'मुग दाळ', rate: 130.00 },
            { name: 'मसूर दाळ', rate: 100.00 },
            { name: 'उडीत दाळ', rate: 85.00 },
            { name: 'मटकी दाळ', rate: 95.00 },
            { name: 'Kalimunch', rate: 75.00 },
            { name: 'खोबरे', rate: 150.00 },
            { name: 'सोयाबीन', rate: 70.00 },
            { name: 'खडीसाखर', rate: 40.00 },
            { name: 'मठ', rate: 60.00 },
            { name: 'वाटाणे', rate: 80.00 },
            { name: 'खारीक', rate: 45.00 },
            { name: 'हुलगे', rate: 35.00 },
            { name: 'काजु', rate: 800.00 },
            { name: 'बदाम', rate: 600.00 },
            { name: 'गुळ', rate: 55.00 },
            { name: 'पोहे', rate: 30.00 },
            { name: 'मका पोहे', rate: 35.00 },
            { name: 'क्रांती पोहे', rate: 40.00 },
            { name: 'भाजके पोहे', rate: 45.00 },
            { name: 'पातळ पोहे', rate: 25.00 },
            { name: 'सोलापूरी पोहे', rate: 50.00 },
            { name: 'भडंग', rate: 20.00 },
            { name: 'मुरमुरे', rate: 15.00 },
            { name: 'SAI FARSAN', rate: 40.00 },
            { name: 'तुप (डाळडा)', rate: 180.00 },
            { name: 'Tata', rate: 25.00 },
            { name: 'मीठ (नमक)', rate: 20.00 },
            { name: 'जामून पाकीट', rate: 30.00 },
            { name: 'अनारसे पीठ', rate: 65.00 },
            { name: 'चकली पीठ', rate: 55.00 },
            { name: 'खडा मसाला', rate: 75.00 },
            { name: 'गरम मसाला', rate: 80.00 },

            // Column 2 Items  
            { name: 'प्रवीण मसाला', rate: 35.00 },
            { name: 'चकली मसाला', rate: 40.00 },
            { name: 'चिवडा मसाला', rate: 45.00 },
            { name: 'शेव मसाला', rate: 50.00 },
            { name: 'खसखस', rate: 200.00 },
            { name: 'ओवा', rate: 85.00 },
            { name: 'सुंठ', rate: 90.00 },
            { name: 'विलायची', rate: 1200.00 },
            { name: 'जिरे', rate: 150.00 },
            { name: 'हळद', rate: 60.00 },
            { name: 'खाता सोडा', rate: 25.00 },
            { name: 'बडीसोप', rate: 30.00 },
            { name: 'धनादाळ', rate: 70.00 },
            { name: 'मनुके', rate: 300.00 },
            { name: 'दाळ्या', rate: 40.00 },
            { name: 'धने', rate: 80.00 },
            { name: 'मोहरी', rate: 95.00 },
            { name: 'हिंग', rate: 500.00 },
            { name: 'मिरची', rate: 120.00 },
            { name: 'सुपारी', rate: 250.00 },
            { name: 'जायफळ', rate: 800.00 },
            { name: 'हवरी', rate: 180.00 },
            { name: 'जवस', rate: 220.00 },
            { name: 'काळळे', rate: 160.00 },
            { name: 'पापड', rate: 45.00 },
            { name: 'लोणचे', rate: 80.00 },
            { name: 'निरमा पावडर', rate: 35.00 },
            { name: 'कपड्यांची साबण', rate: 25.00 },
            { name: 'भांड्यांची साबण', rate: 20.00 },
            { name: 'पितांबरी', rate: 15.00 },
            { name: 'नीळ', rate: 10.00 },
            { name: 'हारपीक', rate: 55.00 },
            { name: 'फिनेल', rate: 75.00 },
            { name: 'खोबऱ्याच तेल', rate: 200.00 },
            { name: 'शिकेकाई पावडर', rate: 45.00 },
            { name: 'बल्ब', rate: 85.00 },
            { name: 'तुप (गावरान)', rate: 250.00 },
            { name: 'खायचा रंग', rate: 15.00 },
            { name: 'बिस्कीट', rate: 25.00 },
            { name: 'मेणबत्ती', rate: 30.00 },
            { name: 'हैअँडवॉश', rate: 65.00 },
            { name: 'अंगाची साबण', rate: 35.00 },

            // Column 3 Items
            { name: 'सुगंधी साबण', rate: 45.00 },
            { name: 'अत्तर', rate: 120.00 },
            { name: 'उटणे', rate: 25.00 },
            { name: 'सुगंधी तेल', rate: 85.00 },
            { name: 'पावडर डब्बी', rate: 55.00 },
            { name: 'फेर अँड लव्हली', rate: 40.00 },
            { name: 'कोलगेट', rate: 65.00 },
            { name: 'मेहेंदी कोन', rate: 15.00 },
            { name: 'मेन पणती', rate: 20.00 },
            { name: 'माचीस बॉक्स', rate: 8.00 },
            { name: 'अगरबत्ती', rate: 25.00 },
            { name: 'धुपबत्ती', rate: 30.00 },
            { name: 'रांगोळी', rate: 15.00 },
            { name: 'रंगीत रांगोळी', rate: 20.00 },
            { name: 'गुलाल', rate: 35.00 },
            { name: 'शेंदूर', rate: 40.00 },
            { name: 'कापूर', rate: 50.00 },
            { name: 'शाम्पू', rate: 75.00 },
            { name: 'स्प्रे', rate: 95.00 },
            { name: 'नेलपेंट', rate: 60.00 },
            { name: 'गोड तेल', rate: 180.00 }
        ];

        // Add IDs and timestamps to default items
        return defaultItems.map((item, index) => ({
            id: `default_item_${index}`,
            ...item,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }));
    }
}

// Initialize global data store
window.dataStore = new DataStore();