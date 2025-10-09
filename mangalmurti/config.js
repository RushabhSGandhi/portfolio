// Configuration file
// To deploy: Replace these values with your actual Firebase config
// For better security, consider using environment variables or a backend proxy

const CONFIG = {
    // Firebase configuration - encoded for slight obfuscation
    firebase: {
        // Decode base64 encoded config on initialization
        _encoded: 'eyJhcGlLZXkiOiJBSWFTeUFYdnFVZ3FPQVNNVU5jSG1aUHZCRHBZX251QkRObUtBRSIsImF1dGhEb21haW4iOiJhc2RmZy1kODE2Yy5maXJlYmFzZWFwcC5jb20iLCJwcm9qZWN0SWQiOiJhc2RmZy1kODE2YyIsInN0b3JhZ2VCdWNrZXQiOiJhc2RmZy1kODE2Yy5maXJlYmFzZXN0b3JhZ2UuYXBwIiwibWVzc2FnaW5nU2VuZGVySWQiOiI0Mjk4NDUxOTY5MzciLCJhcHBJZCI6IjE6NDI5ODQ1MTk2OTM3OndlYjo0OGYyMDJmOGE5MTkxYjgyZDRkNjU4IiwibWVhc3VyZW1lbnRJZCI6IkctR1BCOFZITE4xRyJ9',
        
        // Decode function
        _decode() {
            try {
                const decoded = atob(this._encoded);
                return JSON.parse(decoded);
            } catch(e) {
                console.error('Config decode error');
                return null;
            }
        },
        
        // Get config
        get() {
            return this._decode();
        }
    },
    
    // Application settings
    app: {
        storeName: 'Mangalmurti Traders',
        storeAddress: 'Koradgaon Road, Pathardi',
        initialBillNumber: 5000
    }
};

// Make config globally available
window.APP_CONFIG = CONFIG;
