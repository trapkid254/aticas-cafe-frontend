// API Configuration
const API_CONFIG = {
    // Production backend URL
    BASE_URL: 'https://aticas-backend.onrender.com',
    
    // Development backend URL (for local testing)
    // BASE_URL: 'http://localhost:3000',
    
    // API endpoints
    ENDPOINTS: {
        MENU: '/api/menu',
        MEALS: '/api/meals',
        CART: '/api/cart',
        ORDERS: '/api/orders',
        MPESA: '/api/mpesa/payment',
        ADMINS: '/api/admins',
        EMPLOYEES: '/api/employees'
    }
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
    return API_CONFIG.BASE_URL + endpoint;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_CONFIG, getApiUrl };
} 