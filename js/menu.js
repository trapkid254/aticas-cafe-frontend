document.addEventListener('DOMContentLoaded', function() {
    // Load menu items from API
    let menuItems = [];
    const menuContainer = document.getElementById('menuItems');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const priceOptionsModal = document.getElementById('price-options-modal');
    const modalItemName = document.getElementById('modal-item-name');
    const modalPriceOptions = document.getElementById('modal-price-options');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const closeModalBtn = priceOptionsModal.querySelector('.close-modal');

    async function fetchMenuItems() {
        try {
            // First try to fetch without authentication
            let res = await fetch('https://aticas-backend.onrender.com/api/menu');
            
            // If unauthorized, try with admin token if available
            if (res.status === 401) {
                const token = localStorage.getItem('adminToken');
                if (token) {
                    res = await fetch('https://aticas-backend.onrender.com/api/menu', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            menuItems = await res.json();
            displayMenuItems();
        } catch (err) {
            console.error('Error fetching menu items:', err);
            menuContainer.innerHTML = `
                <div class="empty-menu-message">
                    Failed to load menu items. ${err.message || ''}
                    <button onclick="window.location.reload()" style="margin-top: 10px; padding: 5px 10px;">
                        Retry
                    </button>
                </div>`;
        }
    }

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

    async function fetchCart() {
        const userId = getUserId();
        if (!userId) return { items: [] };
        
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
                }
            });
            if (!res.ok) return { items: [] };
            return await res.json();
        } catch (err) {
            console.error('Error fetching cart:', err);
            return { items: [] };
        }
    }

    async function addToCartApi(menuItem, selectedSize = null) {
        const userId = getUserId();
        const isLoggedIn = !!userId;
        // Use either _id or id property, whichever exists
        const menuItemId = menuItem._id || menuItem.id;
        if (!menuItemId) {
            console.error('Menu item is missing ID:', menuItem);
            showToast('Error: Invalid menu item', 'error');
            return false;
        }
        // Determine item type - backend expects 'Menu' or 'Meat'
        const itemType = (menuItem.category === 'meat' || menuItem.type === 'meat') ? 'Meat' : 'Menu';

        if (isLoggedIn) {
            try {
                // First check if the item already exists in the cart
                const cart = await fetchCart();
                
                let existingItem = null;
                if (cart.items) {
                    existingItem = cart.items.find(item => {
                        const itemId = item.menuItem?._id || item.menuItem?.id;
                        return itemId === menuItemId && 
                               item.itemType === itemType &&
                               ((selectedSize && item.selectedSize?.size === selectedSize.size) || (!selectedSize && !item.selectedSize));
                    });
                }
                
                const newQuantity = existingItem ? (existingItem.quantity + 1) : 1;
                
                // Use PATCH to update existing item or add new one
                const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                    body: JSON.stringify({ 
                        menuItemId, 
                        itemType: itemType, // Should be 'Menu' or 'Meat'
                        quantity: newQuantity, 
                        selectedSize: selectedSize || undefined,
                        price: selectedSize ? selectedSize.price : (menuItem.price || 0)
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
            // Guest cart handling
            try {
                let cart = { items: [], total: 0 };
                try {
                    const cartData = localStorage.getItem('guestCart');
                    if (cartData) {
                        cart = JSON.parse(cartData);
                        // Ensure cart has required structure
                        if (!cart.items) cart.items = [];
                        if (cart.total === undefined) cart.total = 0;
                    }
                } catch (e) {
                    console.error('Error parsing guest cart:', e);
                    cart = { items: [], total: 0 };
                }
                
                const existingItemIndex = cart.items.findIndex(i => {
                    const itemId = i.menuItem?._id || i.menuItem?.id;
                    const menuItemId = menuItem._id || menuItem.id;
                    return itemId === menuItemId &&
                           i.itemType === itemType &&
                           (selectedSize ? i.selectedSize && i.selectedSize.size === selectedSize.size : !i.selectedSize);
                });

                if (existingItemIndex > -1) {
                    cart.items[existingItemIndex].quantity += 1;
                } else {
                    cart.items.push({
                        menuItem: {
                            _id: menuItemId,
                            id: menuItemId,
                            name: menuItem.name,
                            price: selectedSize ? selectedSize.price : (menuItem.price || 0),
                            image: menuItem.image || 'images/default-food.jpg',
                            category: menuItem.category
                        },
                        quantity: 1,
                        itemType,
                        selectedSize
                    });
                }
                // Calculate total
                cart.total = cart.items.reduce((total, item) => {
                    return total + (item.quantity * (item.selectedSize?.price || item.menuItem?.price || 0));
                }, 0);
                
                // Save back to localStorage
                localStorage.setItem('guestCart', JSON.stringify(cart));
                
                // Update cart count and show success
                await updateCartCount();
                showToast('Item added to cart!');
                
                // Log the updated cart for debugging
                console.log('Updated guest cart:', cart);
                return true;
            } catch (err) {
                console.error('Error adding to guest cart:', err);
                showToast('Error adding to cart', 'error');
                return false;
            }
        }
    }

    // Rest of your existing code remains the same...
    const menuSection = document.querySelector('.menu-section');
    const searchDiv = document.createElement('div');
    searchDiv.style = 'margin-bottom:1.5rem;text-align:center;';
    searchDiv.innerHTML = '<input type="text" id="menuSearch" placeholder="Search menu..." style="width:60%;max-width:340px;padding:0.7rem 1rem;border-radius:6px;border:1.5px solid #27ae60;font-size:1.1rem;">';
    menuSection.insertBefore(searchDiv, menuSection.children[1]);
    const menuSearch = document.getElementById('menuSearch');

    function displayMenuItems(category = 'all', search = '') {
        menuContainer.innerHTML = '';
        if (!menuItems || menuItems.length === 0) {
            menuContainer.innerHTML = '<div class="empty-menu-message">No menu items available. Please check back later.</div>';
            return;
        }
        
        let filteredItems = category === 'all' 
            ? menuItems 
            : menuItems.filter(item => item.category === category);
        
        if (search) {
            filteredItems = filteredItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
        }

        filteredItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.dataset.category = item.category;
            const outOfStock = item.quantity === 0;
            const lowStock = item.quantity > 0 && item.quantity <= 3;
            const hasPriceOptions = item.priceOptions && item.priceOptions.length > 0;

            let priceDisplay = `Ksh ${Number(item.price).toLocaleString()}`;
            if (hasPriceOptions) {
                const prices = item.priceOptions.map(p => Number(p.price));
                priceDisplay = `From Ksh ${Number(Math.min(...prices)).toLocaleString()}`;
            }

            let quantityClass = '';
            let quantityText = `Available: ${item.quantity ?? 0}`;

            if (outOfStock) {
                quantityClass = 'out-of-stock';
                quantityText = 'Out of Stock';
            } else if (lowStock) {
                quantityClass = 'low-stock';
                quantityText = `Low Stock: ${item.quantity}`;
            }

            menuItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="menu-item-details">
                    <h3>${item.name}</h3>
                    <p class="menu-qty ${quantityClass}">${quantityText}</p>
                    <span class="price">${priceDisplay}</span>
                    <button class="add-to-cart" data-id="${item._id}" ${outOfStock ? 'disabled style="background:#ccc;cursor:not-allowed;"' : ''}>
                        ${outOfStock ? 'Out of Stock' : (hasPriceOptions ? 'Select Option' : 'Add to Cart')}
                    </button>
                </div>
            `;
            menuContainer.appendChild(menuItem);
        });

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.id;
                const item = menuItems.find(i => i._id === itemId);
                if (!item || item.quantity === 0) {
                    alert('Sorry, this item is out of stock!');
                    return;
                }
                if (item.priceOptions && item.priceOptions.length > 0) {
                    openPriceOptionsModal(item);
                } else {
                    await addToCartApi(item);
                    showToast(`${item.name} added to cart!`);
                    fetchMenuItems();
                }
            });
        });
    }

    function openPriceOptionsModal(item) {
        modalItemName.textContent = item.name;
        modalPriceOptions.innerHTML = '';

        item.priceOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'price-option';
            optionEl.innerHTML = `
                <label>
                    <input type="radio" name="price-option" value="${option.size}" data-price="${option.price}">
                    ${option.size} - <strong>Ksh ${Number(option.price).toLocaleString()}</strong>
                </label>
            `;
            modalPriceOptions.appendChild(optionEl);
        });

        if (modalPriceOptions.querySelector('input')) {
            modalPriceOptions.querySelector('input').checked = true;
        }

        modalAddToCartBtn.onclick = async () => {
            const selectedOptionEl = modalPriceOptions.querySelector('input[name="price-option"]:checked');
            if (selectedOptionEl) {
                const selectedSizeValue = selectedOptionEl.value;
                const selectedOption = item.priceOptions.find(p => p.size === selectedSizeValue);
                await addToCartApi(item, selectedOption);
                showToast(`${item.name} (${selectedOption.size}) added to cart!`);
                priceOptionsModal.style.display = 'none';
                fetchMenuItems();
            }
        };

        priceOptionsModal.style.display = 'flex';
    }

    closeModalBtn.addEventListener('click', () => {
        priceOptionsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === priceOptionsModal) {
            priceOptionsModal.style.display = 'none';
        }
    });

    menuSearch.addEventListener('input', function() {
        displayMenuItems(document.querySelector('.filter-btn.active')?.dataset.category || 'all', menuSearch.value);
    });

    fetchMenuItems();

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            displayMenuItems(this.dataset.category);
        });
    });
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