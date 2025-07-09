// Utility functions for error handling and common operations

// Global error handler for fetch requests
async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// Show user-friendly error messages
function showError(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'toast show error';
        setTimeout(() => {
            toast.className = 'toast';
        }, duration);
    } else {
        // Fallback to alert if toast not available
        alert(message);
    }
}

// Show success messages
function showSuccess(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = 'toast show success';
        setTimeout(() => {
            toast.className = 'toast';
        }, duration);
    }
}

// Validate phone number format
function validatePhoneNumber(phone) {
    const phoneRegex = /^7\d{8}$/;
    return phoneRegex.test(phone);
}

// Format phone number for API
function formatPhoneNumber(phone) {
    if (phone.startsWith('254')) {
        return phone;
    }
    if (phone.startsWith('7')) {
        return '254' + phone;
    }
    return phone;
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// Check if user is admin
function isAdmin() {
    return localStorage.getItem('isAdmin') === 'true';
}

// Get user token
function getUserToken() {
    return localStorage.getItem('userToken');
}

// Get user ID
function getUserId() {
    return localStorage.getItem('userId');
}

// Logout user
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        safeFetch,
        showError,
        showSuccess,
        validatePhoneNumber,
        formatPhoneNumber,
        isLoggedIn,
        isAdmin,
        getUserToken,
        getUserId,
        logout
    };
} 