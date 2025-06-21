document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (hamburgerMenu && mobileMenu) {
        hamburgerMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.hamburger-menu') && !e.target.closest('.mobile-menu')) {
                mobileMenu.classList.remove('active');
            }
        });
    }
    
    // Menu page functionality
    if (document.querySelector('.menu-items')) {
        // Load menu items from localStorage (managed by admin)
        let menuData = JSON.parse(localStorage.getItem('menuItems')) || [];
        console.log('Menu page - Loaded menu items:', menuData);
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const category = this.getAttribute('data-category');
                const filteredItems = category === 'all' 
                    ? menuData.filter(item => item.available) 
                    : menuData.filter(item => item.category === category && item.available);
                console.log('Filtered items for category', category, ':', filteredItems);
                displayMenuItems(filteredItems);
            });
        });
        
        // Display all available items initially
        const availableItems = menuData.filter(item => item.available);
        console.log('Initial available items:', availableItems);
        displayMenuItems(availableItems);
        
        function displayMenuItems(items) {
            const menuContainer = document.getElementById('menu-items');
            if (!menuContainer) {
                console.log('Menu container not found');
                return;
            }
            
            menuContainer.innerHTML = '';
            
            if (!items || items.length === 0) {
                menuContainer.innerHTML = '<p class="no-items">No menu items available.</p>';
                return;
            }
            
            items.forEach(item => {
                // Ensure all required properties have default values
                const id = item?.id || 'N/A';
                const name = item?.name || 'Unknown Item';
                const price = item?.price || 0;
                const description = item?.description || '';
                const image = item?.image || 'images/meal1.jpg';
                
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.innerHTML = `
                    <img src="${image}" alt="${name}">
                    <div class="menu-item-content">
                        <h3>${name}</h3>
                        <p>${description}</p>
                        <span class="price">Ksh ${price.toFixed(2)}</span>
                        <button class="add-to-cart" data-id="${id}">Add to Cart</button>
                    </div>
                `;
                menuContainer.appendChild(menuItem);
            });
            
            // Add event listeners for add-to-cart buttons
            menuContainer.querySelectorAll('.add-to-cart').forEach(button => {
                button.addEventListener('click', function() {
                    const itemId = this.getAttribute('data-id');
                    const item = items.find(i => i.id === itemId);
                    if (item && typeof addToCart === 'function') {
                        addToCart(item);
                        showNotification('Added to cart!', 'success');
                    }
                });
            });
        }
    }
    
    // Notification system
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }
    
    // Cart page functionality
    if (document.getElementById('cart-items')) {
        // Remove local cart and displayCartItems logic
        // Cart page will be handled by cart.js
    }

    // Authentication Functions
    function updateNavbar() {
        const isLoggedIn = localStorage.getItem('user') !== null;
        const navbarRight = document.querySelector('.navbar-right');
        
        if (navbarRight) {
            // Keep existing cart icon
            const cartIcon = navbarRight.querySelector('.cart-icon');
            
            // Create auth element
            let authElement = navbarRight.querySelector('.auth-element');
            if (!authElement) {
                authElement = document.createElement('div');
                authElement.className = 'auth-element';
                navbarRight.insertBefore(authElement, cartIcon);
            }
            
            if (isLoggedIn) {
                const user = JSON.parse(localStorage.getItem('user'));
                authElement.innerHTML = `
                    <a href="#" class="user-icon">
                        <i class="fas fa-user"></i>
                        <span>${user.name}</span>
                    </a>
                    <button class="logout-btn" onclick="logout()">Logout</button>
                `;
            } else {
                authElement.innerHTML = `
                    <a href="login.html" class="login-btn">Login</a>
                `;
            }
        }
    }

    function logout() {
        localStorage.removeItem('user');
        showNotification('Logged out successfully');
        updateNavbar();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const identifier = document.getElementById('login-identifier').value;
            const password = document.getElementById('password').value;
            
            // Get users from localStorage
            const users = JSON.parse(localStorage.getItem('users')) || [];
            
            // Find user by email or phone
            const user = users.find(u => 
                (u.email === identifier || u.phone === identifier) && 
                u.password === password
            );
            
            if (user) {
                // Store logged in user
                localStorage.setItem('user', JSON.stringify({
                    name: user.name,
                    email: user.email,
                    phone: user.phone
                }));
                
                showNotification('Login successful!');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                showNotification('Invalid email/phone or password', 'error');
            }
        });
    }

    // Register Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            // Validate password
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
            if (!passwordRegex.test(password)) {
                showNotification('Password does not meet requirements', 'error');
                return;
            }
            
            // Check if passwords match
            if (password !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            // Get existing users
            const users = JSON.parse(localStorage.getItem('users')) || [];
            
            // Check if email or phone already exists
            if (users.some(u => u.email === email || u.phone === phone)) {
                showNotification('Email or phone number already registered', 'error');
                return;
            }
            
            // Add new user
            users.push({
                name,
                email,
                phone,
                password
            });
            
            localStorage.setItem('users', JSON.stringify(users));
            
            showNotification('Registration successful! Please login.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        });
    }

    // Clear any existing user data on page load
    if (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) {
        localStorage.removeItem('user');
    }
    updateNavbar();

    // Load meals of the day
    if (document.getElementById('meals-container')) {
        loadMealsOfTheDay();
    }

    function loadMealsOfTheDay() {
        const mealsContainer = document.getElementById('meals-container');
        const mealsSection = document.querySelector('.meals-section');
        const meals = JSON.parse(localStorage.getItem('mealsOfDay')) || [];
        
        if (meals.length === 0) {
            // Hide the entire meals section if there are no meals
            if (mealsSection) {
                mealsSection.style.display = 'none';
            }
            return;
        }
        
        // Show the meals section
        if (mealsSection) {
            mealsSection.style.display = 'block';
        }
        
        mealsContainer.innerHTML = '';
        
        meals.forEach(meal => {
            const mealCard = document.createElement('div');
            mealCard.className = 'meal-card';
            mealCard.innerHTML = `
                <img src="${meal.image}" alt="${meal.name}">
                <h3>${meal.name}</h3>
                <p>${meal.description}</p>
                <span class="price">KES ${meal.price.toFixed(2)}</span>
            `;
            mealsContainer.appendChild(mealCard);
        });
    }

    // Display Menu Items
    function displayMenuItems() {
        console.log('Displaying menu items');
        const menuItems = JSON.parse(localStorage.getItem('menuItems')) || [];
        const menuContainer = document.getElementById('menu-items');
        
        if (!menuContainer) {
            console.log('Menu container not found');
            return;
        }

        if (menuItems.length === 0) {
            menuContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <p>No menu items available</p>
                </div>
            `;
            return;
        }

        menuContainer.innerHTML = `
            <div class="menu-grid">
                ${menuItems.map(item => {
                    // Ensure all required properties have default values
                    const id = item?.id || 'N/A';
                    const name = item?.name || 'Unknown Item';
                    const price = item?.price || 0;
                    const category = item?.category || 'Uncategorized';
                    const available = item?.available ?? true;
                    const image = item?.image || null;

                    return `
                        <div class="menu-item ${!available ? 'unavailable' : ''}">
                            <div class="menu-item-image">
                                ${image ? `<img src="${image}" alt="${name}">` : 
                                '<div class="no-image"><i class="fas fa-utensils"></i></div>'}
                            </div>
                            <div class="menu-item-info">
                                <h3>${name}</h3>
                                <p class="category">${category}</p>
                                <p class="price">Ksh ${price.toFixed(2)}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Initialize page
    document.addEventListener('DOMContentLoaded', () => {
        displayMenuItems();
    });

    // Helper functions for API
    async function apiGet(endpoint) {
        const res = await fetch(endpoint);
        return res.json();
    }
    async function apiPost(endpoint, data) {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    }
    async function apiPut(endpoint, data) {
        const res = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    }
});
function loadMenuItems() {
    const mealsContainer = document.getElementById('meals-container');
    if (mealsContainer) {
        mealsContainer.innerHTML = `
            <div class="meal-card">
                <img src="images/sample-meal.jpg" alt="Sample Meal">
                <h3>Sample Meal</h3>
                <p>Delicious and fresh!</p>
            </div>
            <div class="meal-card">
                <img src="images/sample-meal2.jpg" alt="Sample Meal 2">
                <h3>Another Meal</h3>
                <p>Try our chef's special!</p>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadMenuItems();
});