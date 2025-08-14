// Toggle mobile menu
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const loginBtn = document.getElementById('loginBtn');
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (isLoggedIn && loginBtn) {
        loginBtn.textContent = 'Logout';
        if (isAdmin) {
            // Add admin link to mobile menu
            const adminLink = document.createElement('a');
            adminLink.href = 'admin/index.html';
            adminLink.textContent = 'Admin Panel';
            mobileMenu.appendChild(adminLink);
        }
    }
    
    if (hamburgerMenu && mobileMenu) {
        hamburgerMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('open');
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            if (loginBtn.textContent === 'Login') {
                // Redirect to login page or show login modal
                window.location.href = 'login.html'; // You'll need to create this page
            } else {
                // Logout logic
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('isAdmin');
                localStorage.removeItem('userToken');
                loginBtn.textContent = 'Login';
                window.location.href = 'index.html';
            }
        });
    }
    
    // Close mobile menu when clicking outside
    if (mobileMenu && hamburgerMenu) {
        document.addEventListener('click', function(event) {
            const isClickInsideMenu = mobileMenu.contains(event.target);
            const isClickOnHamburger = hamburgerMenu.contains(event.target);

            if (mobileMenu.classList.contains('open') && !isClickInsideMenu && !isClickOnHamburger) {
                mobileMenu.classList.remove('open');
            }
        });
    }
    
    // --- CART LOGIC REFACTOR ---
    // Helper to get userId from token (implement as needed)
    function getUserIdFromToken() {
        // Example: decode JWT or store userId in localStorage after login
        // For now, assume userId is stored in localStorage as 'userId'
        return localStorage.getItem('userId');
    }

    async function fetchCartItems() {
        const userId = getUserIdFromToken();
        if (!userId) return [];
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: { 'Authorization': localStorage.getItem('userToken') || '' }
            });
            if (!res.ok) {
                console.error('Failed to fetch cart:', res.status, res.statusText);
                return [];
            }
            const cart = await res.json();
            return cart.items || [];
        } catch (err) {
            console.error('Error fetching cart items:', err);
            return [];
        }
    }

    async function addToCart(itemOrId, quantity = 1, selectedSize = null) {
        const userToken = localStorage.getItem('userToken');
        const isLoggedIn = !!userToken;
        
        const menuItem = typeof itemOrId === 'object' ? itemOrId : null;
        const menuItemId = menuItem ? menuItem._id : itemOrId;
        const itemType = menuItem ? (menuItem.category ? 'Menu' : 'MealOfDay') : 'Menu';
        
        if (isLoggedIn) {
            try {
                // Check if the item already exists in the cart
                const cartResponse = await fetch('https://aticas-backend.onrender.com/api/cart', {
                    headers: { 
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                let existingItem = null;
                if (cartResponse.ok) {
                    const cart = await cartResponse.json();
                    existingItem = cart.items?.find(item => 
                        item.menuItem._id === menuItemId && 
                        item.itemType === itemType &&
                        ((selectedSize && item.selectedSize?.size === selectedSize.size) || (!selectedSize && !item.selectedSize))
                    );
                }
                
                const newQuantity = existingItem ? existingItem.quantity + quantity : quantity;
                
                // Use PATCH to update existing item or add new one
                const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${userToken}`
                    },
                    body: JSON.stringify({ 
                        menuItemId, 
                        quantity: newQuantity, 
                        itemType,
                        selectedSize: selectedSize ? selectedSize.size : undefined
                    })
                });
                
                if (response.ok) {
                    // Update cart count after successful addition
                    await updateCartCount();
                    showToast('Item added to cart!');
                    return true;
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Failed to add item to cart:', response.status, errorData);
                    showToast('Failed to add item to cart', 'error');
                    return false;
                }
            } catch (err) {
                console.error('Error adding to cart:', err);
                showToast('Error adding to cart', 'error');
            }
        } else {
            // Guest: update localStorage cart
            let guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
            let menuItem;
            let itemType;
            if (typeof itemOrId === 'object') {
                // Normalize for meals of the day or menu
                menuItem = {
                    _id: itemOrId._id,
                    name: itemOrId.name,
                    price: itemOrId.price,
                    image: itemOrId.image,
                    quantity: itemOrId.quantity ?? 10,
                    category: itemOrId.category // may be undefined for meals of the day
                };
                if (!menuItem._id) {
                    console.warn('Attempted to add item to cart without _id:', menuItem);
                    return;
                }
                itemType = menuItem.category ? 'Menu' : 'MealOfDay';
            } else {
                // Fetch menu item details from backend
                try {
                    const res = await fetch(`https://aticas-backend.onrender.com/api/menu/${itemOrId}`);
                    if (!res.ok) throw new Error('Failed to fetch menu item');
                    menuItem = await res.json();
                    itemType = menuItem.category ? 'Menu' : 'MealOfDay';
                } catch (err) {
                    console.error('Error fetching menu item for guest cart:', err);
                    return;
                }
            }
            // Check if item already exists
            const idx = guestCart.items.findIndex(i => i.menuItem && i.menuItem._id === menuItem._id && i.itemType === itemType);
            if (idx > -1) {
                guestCart.items[idx].quantity += quantity;
            } else {
                guestCart.items.push({ menuItem, quantity, itemType });
            }
            localStorage.setItem('guestCart', JSON.stringify(guestCart));
            // Update cart count after successful addition
            await updateCartCount();
        }
    }

    async function updateCartCount() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const userToken = localStorage.getItem('userToken');
        const isLoggedIn = !!userToken;
        
        try {
            let count = 0;
            
            if (isLoggedIn) {
                // For logged-in users
                const response = await fetch('https://aticas-backend.onrender.com/api/cart', {
                    headers: { 
                        'Authorization': `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const cart = await response.json();
                    count = cart.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
                } else {
                    console.error('Failed to fetch cart:', response.status);
                    // Fallback to guest cart if there's an error
                    const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
                    count = guestCart.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
                }
            } else {
                // For guests, use localStorage
                const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
                count = guestCart.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
            }
            
            // Update all cart count elements
            cartCountElements.forEach(element => {
                if (element) {
                    element.textContent = count > 0 ? count : '';
                    element.style.display = count > 0 ? 'flex' : 'none';
                }
            });
            
            return count;
            
        } catch (err) {
            console.error('Error updating cart count:', err);
            // In case of any error, ensure cart count is hidden
            const elements = document.querySelectorAll('.cart-count');
            elements.forEach(element => {
                if (element) {
                    element.style.display = 'none';
                }
            });
            return 0;
        }
    }
    // Initialize cart count on page load and when authentication state changes
    function initializeCart() {
        updateCartCount();
        // Also update cart count when auth state changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'userToken' || key === 'userId') {
                updateCartCount();
            }
        };
    }
    
    window.updateCartCount = updateCartCount;
    window.initializeCart = initializeCart;
    
    // Initialize cart when DOM is loaded and when script is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCart);
    } else {
        initializeCart();
    }

    // Refactor renderMealsOfDayHomepage to use addToCart API
    async function renderMealsOfDayHomepage() {
        const container = document.getElementById('mealsOfDayContainer');
        if (!container) return;
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/meals');
            if (!res.ok) {
                console.error('Failed to fetch meals:', res.status, res.statusText);
                container.innerHTML = '<p style="color:#888;">Failed to load meals of the day. Please try again later.</p>';
                return;
            }
            const mealsOfDay = await res.json();
            if (!mealsOfDay.length) {
                container.innerHTML = '<p style="color:#888;">No meals of the day available.</p>';
                return;
            }
            container.innerHTML = mealsOfDay.map(meal => {
                const outOfStock = meal.quantity === 0;
                const lowStock = meal.quantity > 0 && meal.quantity <= 3;
                const imageUrl = meal.image && meal.image.trim() !== "" 
                    ? meal.image 
                    : "images/varied menu.jpeg"; // Use a placeholder image
                
                // Determine quantity display styling
                let quantityClass = '';
                let quantityText = `Available: ${meal.quantity ?? 10}`;
                
                if (outOfStock) {
                    quantityClass = 'out-of-stock';
                    quantityText = 'Out of Stock';
                } else if (lowStock) {
                    quantityClass = 'low-stock';
                    quantityText = `Low Stock: ${meal.quantity}`;
                }
                
                return `
                <div class="meal-card">
                    <img src="${imageUrl}" alt="${meal.name}">
                    <h3>${meal.name}</h3>
                    <p class="meal-qty ${quantityClass}">${quantityText}</p>
                    <span class="price">Ksh ${Number(meal.price).toLocaleString()}</span>
                    <button class="add-to-cart" data-id="${meal._id}" ${outOfStock ? 'disabled style=\"background:#ccc;cursor:not-allowed;\"' : ''}>${outOfStock ? 'Out of Stock' : 'Add to Cart'}</button>
                </div>
                `;
            }).join('');
            // Attach event listeners
            const addToCartButtons = container.querySelectorAll('.add-to-cart');
            addToCartButtons.forEach(button => {
                button.addEventListener('click', async function() {
                    const itemId = this.dataset.id;
                    const meal = mealsOfDay.find(m => m._id === itemId);
                    if (!meal || meal.quantity === 0) {
                        alert('Sorry, this item is out of stock!');
                        return;
                    }
                    await addToCart(meal, 1); // Pass full meal object for guests
                    await updateCartCount();
                    showToast(`${meal.name} added to cart!`);
                    renderMealsOfDayHomepage();
                });
            });
        } catch (err) {
            container.innerHTML = '<p style="color:#888;">Failed to load meals of the day.</p>';
        }
    }

    renderMealsOfDayHomepage();
});

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => {
        toast.className = 'toast';
    }, 2000);
}

// Typewriter on scroll effect
(function() {
    function typewriterEffect(element, speed = 22) {
        const text = element.textContent;
        element.textContent = '';
        let i = 0;
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }
    const observer = new window.IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                if (!el.dataset.typed) {
                    el.dataset.typed = 'true';
                    typewriterEffect(el);
                }
                obs.unobserve(el);
            }
        });
    }, { threshold: 0.2 });
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.typewriter-on-scroll').forEach(el => {
            observer.observe(el);
        });
    });
})();

// Remove all localStorage usage for cart
// Refactor all cart operations to use backend API endpoints
// Remove cart initialization in localStorage
// Refactor add to cart, update cart count, and related logic to use API
// ... (replace all localStorage CRUD with API calls)