// This script is the central hub for authentication.
// It manages the auth token and user state for the entire application.

let currentUser = null;

// --- Token Management ---
function saveToken(token) {
    localStorage.setItem('authToken', token);
}

function getToken() {
    return localStorage.getItem('authToken');
}

function removeToken() {
    localStorage.removeItem('authToken');
}

// --- User State Management ---
function setCurrentUser(user) {
    currentUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

function getCurrentUser() {
    if (currentUser) {
        return currentUser;
    }
    try {
        const user = sessionStorage.getItem('currentUser');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
}

// --- API Helpers with Authorization Header ---
async function apiPost(endpoint, data) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
    });

    const responseData = await res.json();
    if (!res.ok) {
        throw new Error(responseData.message || 'An unknown error occurred');
    }
    return responseData;
}

async function apiGet(endpoint) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(API_BASE_URL + endpoint, { headers });
    const responseData = await res.json();
    if (!res.ok) {
        throw new Error(responseData.message || 'An unknown error occurred');
    }
    return responseData;
}

// --- Core Auth Functions ---
async function handleLogin(event) {
    event.preventDefault();
    const phone = document.getElementById('phone').value;
    const password = document.getElementById('password').value;

    try {
        const response = await apiPost('/api/login', { phone, password });
        saveToken(response.token);
        setCurrentUser(response.user);
        showPopup('Login successful!', 'success');
        const redirectUrl = sessionStorage.getItem('redirectUrl') || 'index.html';
        sessionStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl;
    } catch (error) {
        removeToken();
        showPopup(error.message || 'Invalid credentials.', 'error');
    }
}

function handleLogout() {
    removeToken();
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    updateAuthUI();
    showPopup('Logged out successfully.', 'success');
    window.location.href = 'index.html';
}

// --- UI and Initialization ---
function updateAuthUI() {
    const user = getCurrentUser();
    const loginBtnContainer = document.getElementById('loginBtnContainer');

    if (loginBtnContainer) {
        if (user) {
            loginBtnContainer.innerHTML = `
                <span class="user-greeting">Hi, ${user.name}</span>
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            `;
        } else {
            loginBtnContainer.innerHTML = `<a href="login.html" class="login-btn">Login</a>`;
        }
    }
    
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
}

async function initAuth() {
    const token = getToken();
    if (token) {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        } else {
            // If there's a token but no user in session, it's safer to log out.
            handleLogout();
        }
    }
    updateAuthUI();
}

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// A generic popup function, assuming one is not defined elsewhere
function showPopup(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] POPUP: ${message}`);
    // Replace this with your actual notification system if you have one.
    alert(message);
}