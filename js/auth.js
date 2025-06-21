// Initialize localStorage if not exists
function initializeLocalStorage() {
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', null);
    }
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('currentUser') !== null && localStorage.getItem('currentUser') !== 'null';
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user && user !== 'null' ? JSON.parse(user) : null;
}

// Helper functions for API
async function apiGet(endpoint) {
    const res = await fetch(API_BASE + endpoint);
    return res.json();
}
async function apiPost(endpoint, data) {
    const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}
async function apiPut(endpoint, data) {
    const res = await fetch(API_BASE + endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Save user to server
async function saveUser(user) {
    try {
        await apiPost('/api/users', user);
        return true;
    } catch (error) {
        console.error('Error saving user:', error);
        return false;
    }
}

// Update current user on server (overwrite all currentUser data)
async function updateCurrentUser(user) {
    try {
        await apiPut('/api/currentUser', [user]);
        return true;
    } catch (error) {
        console.error('Error updating current user:', error);
        return false;
    }
}

// Get the login form
const loginForm = document.getElementById('loginForm');

// Get the redirect URL from sessionStorage if it exists
const redirectUrl = sessionStorage.getItem('redirectUrl') || 'index.html';

// Show popup notification
function showPopup(message, type = 'info') {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <div class="notification-progress"></div>
    `;

    // Add to container
    container.appendChild(notification);

    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Handle login button click
function handleLogin(event) {
    if (event) event.preventDefault();
    window.location.href = 'login.html';
}

// Handle logout
function handleLogout() {
    try {
        localStorage.removeItem('currentUser');
        showPopup('Logged out successfully', 'success');
        updateLoginButton();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Error during logout:', error);
        showPopup('Error during logout', 'error');
    }
}

// Update login button based on auth state
function updateLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (!loginBtn) return;

    const isLoggedIn = localStorage.getItem('currentUser') !== null && localStorage.getItem('currentUser') !== 'null';
    const currentUser = isLoggedIn ? JSON.parse(localStorage.getItem('currentUser')) : null;
    
    if (isLoggedIn && currentUser) {
        loginBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span>Logout</span>';
        loginBtn.onclick = handleLogout;
    } else {
        loginBtn.innerHTML = '<i class="fas fa-user"></i><span>Login</span>';
        loginBtn.onclick = handleLogin;
    }
}

// Initialize auth functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize localStorage
    initializeLocalStorage();
    
    // Update login button state
    updateLoginButton();
    
    // Add event listeners if elements exist
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            try {
                // Get users from backend
                const users = await apiGet('/api/users');
                // Find user with matching phone number
                const user = users.find(u => u.phone === phone);
                if (user && user.password === password) {
                    // Store current user (optional: update server-side session)
                    const currentUser = {
                        id: user.id,
                        name: user.name,
                        phone: user.phone,
                        role: user.role
                    };
                    // Set current user in localStorage for UI state
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    // Optionally update current user on server
                    // await apiPut('/api/currentUser', [currentUser]);
                    showPopup('Login successful!', 'success');
                    updateLoginButton();
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                } else {
                    showPopup('Invalid phone number or password', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showPopup('Error during login', 'error');
            }
        });
    }
    
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            
            try {
                // Get existing users
                const users = JSON.parse(localStorage.getItem('users')) || [];
                
                // Check if phone already exists
                if (users.some(user => user.phone === phone)) {
                    showPopup('Phone number already registered', 'error');
                    return;
                }
                
                // Create new user
                const newUser = {
                    id: Date.now().toString(),
                    name,
                    phone,
                    password,
                    role: 'user',
                    dateCreated: new Date().toISOString()
                };
                
                // Save user
                if (saveUser(newUser)) {
                    // Auto login
                    const currentUser = {
                        id: newUser.id,
                        name: newUser.name,
                        phone: newUser.phone,
                        role: newUser.role
                    };
                    
                    if (updateCurrentUser(currentUser)) {
                        showPopup('Registration successful!', 'success');
                        
                        // Update UI and redirect
                        updateLoginButton();
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 1000);
                    } else {
                        showPopup('Error saving login state', 'error');
                    }
                } else {
                    showPopup('Error saving user data', 'error');
                }
            } catch (error) {
                console.error('Registration error:', error);
                showPopup('Error during registration', 'error');
            }
        });
    }
});

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        // Toggle eye icon
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
});

// Check authentication on orders page
if (window.location.pathname.includes('orders.html')) {
    if (!isLoggedIn()) {
        // Store current URL to redirect back after login
        localStorage.setItem('redirectUrl', 'orders.html');
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

// Auth state management
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Update UI based on auth state
function updateAuthUI() {
    const authLink = document.querySelector('.auth-link');
    const userMenu = document.querySelector('.user-menu');
    
    if (authLink) {
        if (currentUser) {
            authLink.textContent = currentUser.name;
            authLink.href = '#';
            if (userMenu) {
                userMenu.style.display = 'block';
            }
        } else {
            authLink.textContent = 'Login';
            authLink.href = 'login.html';
            if (userMenu) {
                userMenu.style.display = 'none';
            }
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    console.log('Showing notification:', message);
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    const container = document.getElementById('notification-container');
    if (container) {
        container.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

window.getCurrentUser = getCurrentUser;