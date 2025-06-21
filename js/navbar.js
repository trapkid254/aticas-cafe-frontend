// Function to create and inject the navbar
function injectNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Create the navbar HTML
    const navbarHTML = `
        <div class="navbar-left">
            <img src="images/aticas.png" alt="Cafeteria Logo" class="logo">
            <span class="cafeteria-name">ATICAS CAFE'</span>
        </div>
        <div class="marquee">
            <span>Welcome to <b>Aticas cafe'</b> - The best food in town - Fresh ingredients daily - Open 7am-10pm</span>
        </div>
        <div class="navbar-right">
            <a href="cart.html" class="cart-icon">
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-count" id="cart-count">0</span>
            </a>
            <a href="#" class="login-btn" id="loginBtn" style="margin-right: 15px; text-decoration: none; color: inherit; display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 5px; transition: background-color 0.3s;">
                <i class="fas fa-user"></i>
                <span>Login</span>
            </a>
            <div class="hamburger-menu">
                <i class="fas fa-bars"></i>
            </div>
        </div>
    `;

    // Create the mobile menu HTML
    const mobileMenuHTML = `
        <div class="mobile-menu">
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="about.html">About Us</a></li>
                <li><a href="menu.html">Menu</a></li>
                <li><a href="orders.html">My Orders</a></li>
                <li><a href="contact.html">Contact</a></li>
            </ul>
        </div>
    `;

    // Replace the navbar content
    navbar.innerHTML = navbarHTML;

    // Add mobile menu after navbar if it doesn't exist
    if (!document.querySelector('.mobile-menu')) {
        navbar.insertAdjacentHTML('afterend', mobileMenuHTML);
    }

    // Initialize login status
    updateLoginButton();

    // Initialize hamburger menu
    initializeHamburgerMenu();
}

// Initialize hamburger menu functionality
function initializeHamburgerMenu() {
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (hamburgerMenu && mobileMenu) {
        hamburgerMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            // Toggle between hamburger and close icons
            const icon = hamburgerMenu.querySelector('i');
            if (icon.classList.contains('fa-bars')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!hamburgerMenu.contains(event.target) && !mobileMenu.contains(event.target)) {
                mobileMenu.classList.remove('active');
                const icon = hamburgerMenu.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Add this function to update the cart count
async function updateCartCount() {
    const user = getCurrentUser && getCurrentUser();
    const cartCount = document.getElementById('cart-count');
    if (!user || !cartCount) {
        if (cartCount) cartCount.textContent = 0;
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/api/cart?userId=${user.id}`);
        const cartItems = await res.json();
        // The cart count should be the sum of quantities, not just the number of items
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    } catch (e) {
        if (cartCount) cartCount.textContent = 0;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    injectNavbar();
    updateCartCount();
}); 