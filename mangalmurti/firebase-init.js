// Firebase Configuration
// Config is now loaded from config.js (encoded for basic obfuscation)

// Get Firebase config from encoded source
function getFirebaseConfig() {
    if (window.APP_CONFIG && window.APP_CONFIG.firebase) {
        return window.APP_CONFIG.firebase.get();
    }
    return null;
}

// Auto-initialize Firebase if config is valid
document.addEventListener('DOMContentLoaded', async () => {
    const FIREBASE_CONFIG = getFirebaseConfig();
    
    // Check if config is properly loaded
    if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
        console.log('Initializing Firebase...');
        
        try {
            // Initialize Firebase integration
            const success = await dataStore.initializeFirebase(FIREBASE_CONFIG);
            
            if (success) {
                console.log('Firebase initialized and connected successfully');
                // Silent initialization - no toast messages
            }
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            console.log('Using offline mode with localStorage');
        }
    } else {
        console.log('Firebase config not available - using localStorage only');
    }
});

// Add Firebase status indicator to UI (DISABLED)
function addFirebaseStatusIndicator() {
    // Status indicator disabled - silent operation
    console.log('Firebase status: Connected');
}

function updateFirebaseStatusIndicator() {
    // Disabled - no visual updates
    return;
}