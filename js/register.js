// Form validation
const form = document.getElementById('registerForm');
const nameInput = document.getElementById('fullname');
const phoneInput = document.getElementById('phone');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');

// Requirements elements
const nameRequirement = document.getElementById('name-requirement');
const phoneRequirement = document.getElementById('phone-requirement');
const passwordRequirement = document.getElementById('password-requirement');
const confirmPasswordRequirement = document.getElementById('confirm-password-requirement');

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

// Validation functions
function validateName(name) {
    return name.length >= 3;
}

function validatePhone(phone) {
    return /^(?:254|\+254|0)?([7-9]{1}[0-9]{8})$/.test(phone);
}

function validatePassword(password) {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Update requirement colors
    document.getElementById('length-req').style.color = hasMinLength ? '#4CAF50' : '#666';
    document.getElementById('uppercase-req').style.color = hasUpperCase ? '#4CAF50' : '#666';
    document.getElementById('lowercase-req').style.color = hasLowerCase ? '#4CAF50' : '#666';
    document.getElementById('number-req').style.color = hasNumber ? '#4CAF50' : '#666';
    document.getElementById('special-req').style.color = hasSpecial ? '#4CAF50' : '#666';

    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
}

function validateConfirmPassword(password, confirmPassword) {
    return password === confirmPassword;
}

// Real-time validation
nameInput.addEventListener('input', function() {
    const isValid = validateName(this.value);
    nameRequirement.style.color = isValid ? '#4CAF50' : '#666';
});

phoneInput.addEventListener('input', function() {
    const isValid = validatePhone(this.value);
    phoneRequirement.style.color = isValid ? '#4CAF50' : '#666';
});

passwordInput.addEventListener('input', function() {
    validatePassword(this.value);
    
    // Also check confirm password when password changes
    if (confirmPasswordInput.value) {
        const isMatch = validateConfirmPassword(this.value, confirmPasswordInput.value);
        confirmPasswordRequirement.style.color = isMatch ? '#4CAF50' : '#666';
    }
});

confirmPasswordInput.addEventListener('input', function() {
    const isMatch = validateConfirmPassword(passwordInput.value, this.value);
    confirmPasswordRequirement.style.color = isMatch ? '#4CAF50' : '#666';
});

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        // Toggle eye icon
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
});

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

// Form submission
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Get form values
    const name = nameInput.value;
    const phone = phoneInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate all fields
    const isNameValid = validateName(name);
    const isPhoneValid = validatePhone(phone);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);

    // Update requirement colors
    nameRequirement.style.color = isNameValid ? '#4CAF50' : '#666';
    phoneRequirement.style.color = isPhoneValid ? '#4CAF50' : '#666';
    confirmPasswordRequirement.style.color = isConfirmPasswordValid ? '#4CAF50' : '#666';

    // Check if all validations pass
    if (isNameValid && isPhoneValid && isPasswordValid && isConfirmPasswordValid) {
        try {
            // Check if phone number already exists
            const users = await apiGet('/api/users');
            if (users.some(user => user.phone === phone)) {
                showPopup('Phone number already registered', 'error');
                return;
            }

            // Create new user
            const newUser = {
                name,
                phone,
                password,
                dateCreated: new Date().toISOString(),
                orders: [] // Initialize empty orders array
            };

            // Add user to array
            await apiPost('/api/users', newUser);

            // Show success message
            showPopup('Account created successfully! Redirecting to login page...', 'success');

            // Redirect to login page after a short delay
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } catch (error) {
            console.error('Error creating account:', error);
            showPopup('Error creating account. Please try again.', 'error');
        }
    } else {
        showPopup('Please fill all fields correctly', 'error');
    }
}); 