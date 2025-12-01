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
                window.location.href = 'login.html';
            } else {
                // Logout logic
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('isAdmin');
                localStorage.removeItem('userToken');
                localStorage.removeItem('userId');
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
    // Helper to get userId from token or localStorage
    function getUserId() {
        // First try to get from localStorage
        const userId = localStorage.getItem('userId');
        if (userId) return userId;
        
        // If not found, try to decode from JWT
        const token = localStorage.getItem('userToken');
        if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                return decoded.userId;
            } catch (err) {
                console.error('Error decoding JWT:', err);
                return null;
            }
        }
        return null;
    }

    async function fetchCartItems() {
        const userId = getUserId();
        if (!userId) {
            // For guests, use localStorage
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
            return guestCart.items || [];
        }
        
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
                }
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
        const userId = getUserId();
        const isLoggedIn = !!userId;
        
        const menuItem = typeof itemOrId === 'object' ? itemOrId : null;
        const menuItemId = menuItem ? menuItem._id : itemOrId;
        // Determine item type and department context
        const isButcheryItem = !!(menuItem && (menuItem.type === 'meat' || menuItem.itemType === 'meat' || menuItem.itemType === 'butchery'));
        const itemType = isButcheryItem
            ? 'Meat' // Server expects 'Meat' for butchery items
            : (menuItem ? (menuItem.category ? 'Menu' : 'MealOfDay') : 'Menu');
        // Persist the department context for cart page filtering
        localStorage.setItem('cartDepartment', isButcheryItem ? 'butchery' : 'cafeteria');
        
        if (isLoggedIn) {
            try {
                // For logged-in users, first fetch current cart to compute new absolute quantity
                let currentQty = 0;
                try {
                    const cartRes = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` }
                    });
                    if (cartRes.ok) {
                        const cart = await cartRes.json();
                        const match = (cart.items || []).find(it => {
                            const id = (it.menuItem && (it.menuItem._id || it.menuItem.id)) || it.menuItem;
                            const sameId = String(id) === String(menuItemId);
                            const sameType = it.itemType === itemType;
                            const sameSize = (!selectedSize && !it.selectedSize) || (selectedSize && it.selectedSize && (it.selectedSize.size === (selectedSize.size || selectedSize)));
                            return sameId && sameType && sameSize;
                        });
                        currentQty = match ? (Number(match.quantity) || 0) : 0;
                    }
                } catch (_) {}

                const newQuantity = Number(currentQty) + Number(quantity || 1);

                // Normalize selectedSize for Meat: ensure price is included when possible
                let selectedSizeFinal = selectedSize;
                if (itemType === 'Meat') {
                    const basePerKg = menuItem && typeof menuItem.price === 'number' ? Number(menuItem.price) : null;
                    // If selectedSize is a string, convert to object { size }
                    if (selectedSizeFinal && typeof selectedSizeFinal === 'string') {
                        selectedSizeFinal = { size: selectedSizeFinal };
                    }
                    // If we have a size but no price, try compute from per-kg
                    if (selectedSizeFinal && !('price' in selectedSizeFinal) && basePerKg) {
                        const sizeStr = String(selectedSizeFinal.size || '').toLowerCase();
                        let kg = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
                        if (sizeStr.includes('kg') && !isNaN(kg)) {
                            selectedSizeFinal.price = Math.round(kg * basePerKg);
                        }
                    }
                }

                // Use the PATCH endpoint with absolute quantity
                const response = await fetch(`https://aticas-backend.onrender.com/api/cart/items`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                    body: JSON.stringify({
                        menuItemId,
                        quantity: newQuantity,
                        itemType,
                        selectedSize: selectedSizeFinal || undefined
                    })
                });
                
                if (response.ok) {
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
                return false;
            }
        } else {
            // Guest: update localStorage cart
            let guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
            
            // Find if item already exists in cart
            const existingItemIndex = guestCart.items.findIndex(item => 
                item.menuItem._id === menuItemId && 
                item.itemType === itemType
            );
            
            if (existingItemIndex >= 0) {
                // Update quantity if item exists
                guestCart.items[existingItemIndex].quantity += quantity;
            } else {
                // Add new item to cart
                guestCart.items.push({
                    menuItem: {
                        _id: menuItemId,
                        name: menuItem?.name || 'Unknown Item',
                        price: menuItem?.price || 0,
                        image: menuItem?.image || '',
                        category: menuItem?.category || ''
                    },
                    quantity,
                    itemType,
                    selectedSize: selectedSize || undefined
                });
            }
            
            localStorage.setItem('guestCart', JSON.stringify(guestCart));
            await updateCartCount();
            showToast('Item added to cart!');
            return true;
        }
    }

    async function updateCartCount() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const userId = getUserId();
        const isLoggedIn = !!userId;
        
        try {
            let count = 0;
            
            if (isLoggedIn) {
                const token = localStorage.getItem('userToken');
                if (!token) {
                    // If no token, clear user data and show login
                    localStorage.removeItem('userData');
                    return 0;
                }
                
                try {
                    // For logged-in users, fetch from backend
                    const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (response.status === 401) {
                        // Token expired or invalid
                        localStorage.removeItem('userToken');
                        localStorage.removeItem('userData');
                        window.dispatchEvent(new Event('authChange'));
                        return 0;
                    }
                    
                    if (!response.ok) {
                        console.error('Error fetching cart:', response.statusText);
                        return 0;
                    }
                    
                    const cart = await response.json();
                    return cart.items ? cart.items.reduce((total, item) => total + (item.quantity || 1), 0) : 0;
                } catch (error) {
                    console.error('Error fetching cart:', error);
                    return 0;
                }
            } else {
                // For guests, use localStorage
                const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
                count = guestCart.items?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;
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
            cartCountElements.forEach(element => {
                if (element) element.style.display = 'none';
            });
            return 0;
        }
    }

    // Initialize cart on page load
    function initializeCart() {
        updateCartCount();
        
        // Listen for auth changes
        window.addEventListener('authChange', updateCartCount);
        
        // Listen for storage events from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'userToken' || e.key === 'userId') {
                updateCartCount();
            }
        });
        
        // Override localStorage.setItem to detect auth changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, arguments);
            if (key === 'userToken' || key === 'userId') {
                window.dispatchEvent(new Event('authChange'));
            }
        };
    }

    // Make functions available globally if needed
    window.addToCart = addToCart;
    window.updateCartCount = updateCartCount;
    window.fetchCartItems = fetchCartItems;

    // Initialize when DOM is loaded
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
            // First try to fetch without authentication
            let res = await fetch('https://aticas-backend.onrender.com/api/meals');
            
            // If unauthorized, try with admin token if available
            if (res.status === 401) {
                const token = localStorage.getItem('adminToken');
                if (token) {
                    res = await fetch('https://aticas-backend.onrender.com/api/meals', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }
            
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
                    : "images/varied menu.jpeg";
                
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
                    await addToCart(meal, 1);
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