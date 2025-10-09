// Data Models and Storage Layer
class DataStore {
    constructor() {
        this.storageKey = 'diwali-billing-data';
        this.initializeData();
    }

    initializeData() {
        if (!localStorage.getItem(this.storageKey)) {
            const initialData = {
                settings: {
                    storeName: 'Mangalmurti Traders',
                    storeAddress: 'Koradgaon Road, Pathardi',
                    billCounter: 5000,
                    lastBillDate: new Date().toISOString().split('T')[0]
                }
            };
            this.saveData(initialData);
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






    // Get simple items array - no types, no IDs
    getSimpleItems() {
        return [
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
    }
}

// Initialize global data store
window.dataStore = new DataStore();