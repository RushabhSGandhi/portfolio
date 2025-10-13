// Bill Storage Service
const billStorageService = {
    async saveBill(billData) {
        try {
            if (!firebase.apps.length) {
                console.log('Firebase not initialized, cannot save bill');
                return null;
            }

            const db = firebase.firestore();
            const billRef = db.collection('stores/mangalmurti-traders/bills').doc();
            
            // Add metadata
            const billToSave = {
                ...billData,
                savedAt: firebase.firestore.FieldValue.serverTimestamp(),
                id: billRef.id
            };

            await billRef.set(billToSave);
            console.log('Bill saved successfully:', billRef.id);
            return billRef.id;
        } catch (error) {
            console.error('Error saving bill:', error);
            return null;
        }
    },

    async getAllBills() {
        try {
            if (!firebase.apps.length) {
                console.log('Firebase not initialized');
                return [];
            }

            const db = firebase.firestore();
            const billsSnapshot = await db.collection('stores/mangalmurti-traders/bills')
                .orderBy('savedAt', 'desc')
                .get();

            const bills = [];
            billsSnapshot.forEach(doc => {
                bills.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return bills;
        } catch (error) {
            console.error('Error fetching bills:', error);
            return [];
        }
    },

    async getBillById(billId) {
        try {
            if (!firebase.apps.length) {
                console.log('Firebase not initialized');
                return null;
            }

            const db = firebase.firestore();
            const billDoc = await db.collection('stores/mangalmurti-traders/bills')
                .doc(billId)
                .get();

            if (billDoc.exists) {
                return {
                    id: billDoc.id,
                    ...billDoc.data()
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching bill:', error);
            return null;
        }
    },

    async searchBills(searchTerm) {
        try {
            if (!firebase.apps.length) {
                return [];
            }

            const allBills = await this.getAllBills();
            const term = searchTerm.toLowerCase();

            return allBills.filter(bill => {
                // Format date as DD/MM/YYYY for searching
                let dateStr = '';
                if (bill.savedAt) {
                    const savedDate = new Date(bill.savedAt.seconds * 1000);
                    const day = String(savedDate.getDate()).padStart(2, '0');
                    const month = String(savedDate.getMonth() + 1).padStart(2, '0');
                    const year = savedDate.getFullYear();
                    dateStr = `${day}/${month}/${year}`;
                }

                // Convert grand total to string for searching
                const amountStr = bill.grandTotal ? bill.grandTotal.toString() : '';

                return (
                    (bill.customerName && bill.customerName.toLowerCase().includes(term)) ||
                    (bill.city && bill.city.toLowerCase().includes(term)) ||
                    (bill.billNo && bill.billNo.toString().includes(term)) ||
                    (bill.mobile && bill.mobile.includes(term)) ||
                    (amountStr && amountStr.includes(term)) ||
                    (dateStr && dateStr.includes(term))
                );
            });
        } catch (error) {
            console.error('Error searching bills:', error);
            return [];
        }
    },

    async deleteBill(billId) {
        try {
            if (!firebase.apps.length) {
                return false;
            }

            const db = firebase.firestore();
            await db.collection('stores/mangalmurti-traders/bills')
                .doc(billId)
                .delete();

            console.log('Bill deleted successfully:', billId);
            return true;
        } catch (error) {
            console.error('Error deleting bill:', error);
            return false;
        }
    }
};
