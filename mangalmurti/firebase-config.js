// Firebase Configuration and Service Layer
class FirebaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.initialized = false;
        this.isOnline = navigator.onLine;
        this.currentUser = null;
        
        // Setup online/offline monitoring
        this.setupNetworkMonitoring();
    }

    // Initialize Firebase with your config
    async init(config) {
        try {
            // Initialize Firebase
            firebase.initializeApp(config);
            
            // Initialize services
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // Enable offline persistence
            await this.db.enablePersistence({
                synchronizeTabs: true
            }).catch((err) => {
                console.warn('Firebase persistence failed:', err);
            });
            
            // Setup auth state listener
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.onAuthStateChanged(user);
            });
            
            this.initialized = true;
            console.log('Firebase initialized successfully!');
            
            return true;
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            return false;
        }
    }

    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Network: Online - Syncing data...');
            // Removed toast notification
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Network: Offline - Changes saved locally');
            // Removed toast notification
        });
    }

    showNetworkStatus(message) {
        // Disabled network status toasts
        console.log(message);
    }

    onAuthStateChanged(user) {
        if (user) {
            console.log('User authenticated:', user.email);
            // Notify app of auth state change
            if (typeof app !== 'undefined') {
                app.onFirebaseAuthChanged(user);
            }
        } else {
            console.log('User logged out');
            if (typeof app !== 'undefined') {
                app.onFirebaseAuthChanged(null);
            }
        }
    }

    // Authentication Methods
    async signInAnonymously() {
        try {
            const result = await this.auth.signInAnonymously();
            return result.user;
        } catch (error) {
            console.error('Anonymous sign-in failed:', error);
            throw error;
        }
    }

    async signInWithEmail(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('Email sign-in failed:', error);
            throw error;
        }
    }

    async createUserWithEmail(email, password) {
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('User creation failed:', error);
            throw error;
        }
    }

    async signOut() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Sign-out failed:', error);
            throw error;
        }
    }

    // Firestore Operations
    getStoreCollection() {
        if (!this.initialized) throw new Error('Firebase not initialized');
        return this.db.collection('stores').doc('mangalmurti-traders');
    }

    getCatalogCollection() {
        return this.getStoreCollection().collection('catalog');
    }

    getBillsCollection() {
        return this.getStoreCollection().collection('bills');
    }

    getSettingsDoc() {
        return this.getStoreCollection().collection('settings').doc('main');
    }

    // Catalog Operations
    async getCatalogItems() {
        try {
            const snapshot = await this.getCatalogCollection()
                .orderBy('name')
                .get();
            
            const items = [];
            snapshot.forEach(doc => {
                items.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return items;
        } catch (error) {
            console.error('Error fetching catalog:', error);
            throw error;
        }
    }

    async addCatalogItem(item) {
        try {
            const docRef = await this.getCatalogCollection().add({
                ...item,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: this.currentUser?.uid || 'anonymous'
            });
            
            return docRef.id;
        } catch (error) {
            console.error('Error adding catalog item:', error);
            throw error;
        }
    }

    async updateCatalogItem(itemId, updates) {
        try {
            await this.getCatalogCollection().doc(itemId).update({
                ...updates,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_by: this.currentUser?.uid || 'anonymous'
            });
        } catch (error) {
            console.error('Error updating catalog item:', error);
            throw error;
        }
    }

    async deleteCatalogItem(itemId) {
        try {
            await this.getCatalogCollection().doc(itemId).delete();
        } catch (error) {
            console.error('Error deleting catalog item:', error);
            throw error;
        }
    }

    // Real-time listeners
    onCatalogChanges(callback) {
        return this.getCatalogCollection()
            .orderBy('name')
            .onSnapshot((snapshot) => {
                const items = [];
                snapshot.forEach(doc => {
                    items.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(items);
            }, (error) => {
                console.error('Catalog listener error:', error);
            });
    }

    // Settings Operations
    async getSettings() {
        try {
            const doc = await this.getSettingsDoc().get();
            if (doc.exists) {
                return doc.data();
            } else {
                // Create default settings
                const defaultSettings = {
                    storeName: 'Mangalmurti Traders',
                    storeAddress: 'Koradgaon Road, Pathardi',
                    billCounter: 5000,
                    lastBillDate: new Date().toISOString().split('T')[0]
                };
                await this.getSettingsDoc().set(defaultSettings);
                return defaultSettings;
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            throw error;
        }
    }

    async updateSettings(settings) {
        try {
            await this.getSettingsDoc().update({
                ...settings,
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating settings:', error);
            throw error;
        }
    }

    // Bill Operations
    async saveBill(billData, billLines) {
        try {
            const batch = this.db.batch();
            
            // Add bill document
            const billRef = this.getBillsCollection().doc();
            batch.set(billRef, {
                ...billData,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: this.currentUser?.uid || 'anonymous'
            });
            
            // Add bill lines as subcollection
            billLines.forEach((line, index) => {
                const lineRef = billRef.collection('lines').doc(`line_${index}`);
                batch.set(lineRef, line);
            });
            
            await batch.commit();
            return billRef.id;
        } catch (error) {
            console.error('Error saving bill:', error);
            throw error;
        }
    }

    // Migration helper
    async migrateCatalogFromLocalStorage() {
        try {
            const localData = JSON.parse(localStorage.getItem('diwali-billing-data') || '{}');
            if (localData.catalogItems && localData.catalogItems.length > 0) {
                console.log(`Migrating ${localData.catalogItems.length} items to Firebase...`);
                
                const batch = this.db.batch();
                localData.catalogItems.forEach(item => {
                    const docRef = this.getCatalogCollection().doc();
                    batch.set(docRef, {
                        name: item.name,
                        rate: item.rate,
                        created_at: firebase.firestore.FieldValue.serverTimestamp(),
                        updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                        migrated: true
                    });
                });
                
                await batch.commit();
                console.log('Migration completed successfully!');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }

    // Utility methods
    isInitialized() {
        return this.initialized;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isOnlineMode() {
        return this.isOnline && this.initialized;
    }
}

// Initialize Firebase service
window.firebaseService = new FirebaseService();