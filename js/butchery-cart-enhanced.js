// Butchery Cart Functionality - Enhanced for Guest Users
document.addEventListener('DOMContentLoaded', function() {
    const cartContainer = document.getElementById('cartContainer');
    const cartSummary = document.getElementById('cartSummary');
    const subtotalElement = document.getElementById('subtotal');
    const deliveryFeeElement = document.getElementById('deliveryFee');
    const totalElement = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutForm = document.getElementById('checkoutForm');
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    const orderTypeOptions = document.querySelectorAll('input[name="orderType"]');

    // Enhanced debug logging
    console.log('🚀 Butchery Cart Initializing...');

    // Helpers to normalize itemType and ids
    function isButcheryType(t) {
        const s = String(t || '').toLowerCase();
        return s === 'meat' || s === 'butchery';
    }

    function getItemId(item) {
        // Supports either nested menuItem object or direct id
        if (!item) return null;
        if (typeof item.menuItem === 'object' && item.menuItem) {
            return item.menuItem._id || item.menuItem.id || item.menuItem;
        }
        return item.menuItem || item._id || item.id || null;
    }

    function getItemName(item) {
        return item.name || item.menuItem?.name || 'Meat Item';
    }

    function getItemImage(item) {
        return item.image || item.menuItem?.image || 'images/meat.jpg';
    }

    // Enhanced guest cart management
    function getGuestCart() {
        try {
            const raw = localStorage.getItem('guestCart') || '{"items":[],"total":0}';
            const fullCart = JSON.parse(raw);

            // Ensure proper structure
            if (!fullCart.items || !Array.isArray(fullCart.items)) {
                console.warn('⚠️ Invalid guest cart structure, resetting...');
                return { items: [], total: 0 };
            }

            // Filter butchery items
            const butcheryItems = fullCart.items.filter(item =>
                isButcheryType(item.itemType) ||
                (item.menuItem && item.menuItem.adminType === 'butchery')
            );

            // Recalculate total for butchery items
            const total = butcheryItems.reduce((sum, item) => {
                const price = item.selectedSize?.price || item.price || item.menuItem?.price || 0;
                const quantity = item.quantity || 1;
                return sum + (price * quantity);
            }, 0);

            console.log('🛒 Guest cart loaded:', { butcheryItems, total });
            return { items: butcheryItems, total };
        } catch (error) {
            console.error('💥 Error getting guest cart:', error);
            return { items: [], total: 0 };
        }
    }

    function saveGuestCart(cart) {
        try {
            // Get existing full cart
            const raw = localStorage.getItem('guestCart') || '{"items":[],"total":0}';
            const fullCart = JSON.parse(raw);

            // Filter non-butchery items to preserve them
            const nonButcheryItems = (fullCart.items || []).filter(item =>
                !isButcheryType(item.itemType) &&
                !(item.menuItem && item.menuItem.adminType === 'butchery')
            );

            // Merge with new butchery items
            const mergedItems = [...nonButcheryItems, ...(cart.items || [])];

            // Recalculate total for entire cart
            const total = mergedItems.reduce((sum, item) => {
                const price = item.selectedSize?.price || item.price || item.menuItem?.price || 0;
                const quantity = item.quantity || 1;
                return sum + (price * quantity);
            }, 0);

            // Save merged cart
            localStorage.setItem('guestCart', JSON.stringify({ items: mergedItems, total }));
            console.log('💾 Guest cart saved:', { mergedItems, total });
        } catch (error) {
            console.error('💥 Error saving guest cart:', error);
        }
    }

    // Fetch cart from backend or local storage
    async function fetchCart() {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');

        if (userId && token) {
            try {
                console.log('🔐 Fetching cart for logged-in user...');

                // Add timeout to prevent hanging
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                    const cart = await response.json();
                    console.log('📦 Server cart response:', cart);

                    // Filter butchery items
                    const butcheryItems = (cart.items || []).filter(item =>
                        isButcheryType(item.itemType) ||
                        (item.menuItem && item.menuItem.adminType === 'butchery')
                    );

                    // Recalculate total for butchery items
                    const total = butcheryItems.reduce((sum, item) => {
                        const price = item.selectedSize?.price || item.price || item.menuItem?.price || 0;
                        const quantity = item.quantity || 1;
                        return sum + (price * quantity);
                    }, 0);

                    console.log('📊 Filtered butchery items:', { butcheryItems, total });
                    return { items: butcheryItems, total };
                } else {
                    console.warn('⚠️ Cart API returned non-ok status:', response.status);
                    // Fall through to guest cart
                }
            } catch (error) {
                console.error('💥 Error fetching cart:', error);
                console.log('🔄 Falling back to guest cart due to network error');
                // Fall through to guest cart
            }
        }

        // Fallback to guest cart for guests or when API fails
        console.log('👤 Loading guest cart...');
        return getGuestCart();
    }

    // Enhanced add to cart function
    async function addToCart(item) {
        console.log('🛒 Adding item to cart:', item);

        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');
        const cart = await fetchCart();

        // Find existing item
        const existingItem = cart.items.find(i => {
            const sameId = String(getItemId(i)) === String(item._id);
            const sameType = isButcheryType(i.itemType) || i.itemType === 'Meat';
            const sameSize = !item.selectedSize || i.selectedSize?.size === item.selectedSize?.size;
            return sameId && sameType && sameSize;
        });

        const newQty = (existingItem ? existingItem.quantity : 0) + (item.quantity || 1);

        let useGuestCart = false;

        if (userId && token) {
            // Logged-in: patch server cart
            try {
                console.log('🔐 Adding to server cart...');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const res = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        menuItemId: String(item._id),
                        quantity: newQty,
                        itemType: 'Meat',
                        ...(item.selectedSize ? { selectedSize: item.selectedSize } : {})
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Server error: ${res.status} - ${errorText}`);
                }

                console.log('✅ Successfully added item to server cart');
            } catch (e) {
                console.error('💥 Failed to add to cart (logged-in):', e);
                console.log('🔄 Falling back to guest cart due to network error');
                useGuestCart = true;
            }
        } else {
            useGuestCart = true;
        }

        // Guest cart logic (also used as fallback for logged-in users when API fails)
        if (useGuestCart) {
            console.log('👤 Adding to guest cart...');

            // Create new item structure
            const newItem = {
                menuItem: { _id: item._id, name: item.name, price: item.price, image: item.image, category: item.category },
                itemType: 'Meat',
                quantity: newQty,
                selectedSize: item.selectedSize || null,
                name: item.name,
                price: item.price,
                image: item.image
            };

            // Update cart
            if (existingItem) {
                existingItem.quantity = newQty;
                console.log('🔄 Updated existing item quantity');
            } else {
                cart.items.push(newItem);
                console.log('➕ Added new item to cart');
            }

            // Save cart
            saveGuestCart(cart);
            console.log('💾 Guest cart saved');
        }

        // Update UI
        await updateCartCount();
        if (typeof window.updateCartIndicators === 'function') {
            try { window.updateCartIndicators(); } catch (_) {}
        }
        if (cartContainer) {
            await displayCartItems();
        }
        showToast(`${item.name} added to cart!`);
    }

    // Enhanced remove from cart function
    async function removeFromCart(menuItemId, itemType, selectedSize = null) {
        console.log('🗑️ Removing item from cart:', { menuItemId, itemType, selectedSize });

        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');

        if (userId && token) {
            // Logged-in: set quantity to 0 via PATCH
            try {
                console.log('🔐 Removing from server cart...');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const selObj = typeof selectedSize === 'string' || selectedSize === null
                    ? (selectedSize ? { size: selectedSize } : null)
                    : selectedSize;

                const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        menuItemId: String(menuItemId),
                        quantity: 0,
                        itemType: 'Meat',
                        ...(selObj ? { selectedSize: selObj } : {})
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server error: ${response.status} - ${errorText}`);
                }

                console.log('✅ Successfully removed item from server cart');
            } catch (e) {
                console.error('💥 Failed to remove from cart (logged-in):', e);
                console.log('🔄 Falling back to guest cart due to network error');
                // Fall through to guest cart logic
            }
        }

        // Guest cart logic (also used as fallback for logged-in users when API fails)
        if (!userId || !token) {
            console.log('👤 Removing from guest cart...');

            const cart = await fetchCart();
            cart.items = cart.items.filter(item => {
                const sameId = String(getItemId(item)) === String(menuItemId);
                const sameType = isButcheryType(item.itemType) && isButcheryType(itemType);
                const sameSize = (selectedSize && item.selectedSize?.size === selectedSize) || (!selectedSize && !item.selectedSize);
                return !(sameId && sameType && sameSize);
            });

            // Save updated cart
            saveGuestCart(cart);
            console.log('💾 Guest cart saved after removal');
        }

        // Update UI
        await updateCartCount();
        if (typeof window.updateCartIndicators === 'function') {
            try { window.updateCartIndicators(); } catch (_) {}
        }
        await displayCartItems();
    }

    // Enhanced update cart item function
    async function updateCartItem(menuItemId, itemType, quantity, selectedSize = null) {
        console.log('🔄 Updating cart item:', { menuItemId, itemType, quantity, selectedSize });

        if (quantity < 1) {
            await removeFromCart(menuItemId, itemType, selectedSize);
            return;
        }

        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');

        if (userId && token) {
            // Logged-in: patch server
            try {
                console.log('🔐 Updating server cart...');

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const selObj = typeof selectedSize === 'string' || selectedSize === null
                    ? (selectedSize ? { size: selectedSize } : null)
                    : selectedSize;

                const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        menuItemId: String(menuItemId),
                        quantity: Number(quantity),
                        itemType: 'Meat',
                        ...(selObj ? { selectedSize: selObj } : {})
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server error: ${response.status} - ${errorText}`);
                }

                console.log('✅ Successfully updated item in server cart');
            } catch (e) {
                console.error('💥 Failed to update cart item (logged-in):', e);
                console.log('🔄 Falling back to guest cart due to network error');
                // Fall through to guest cart logic
            }
        }

        // Guest cart logic (also used as fallback for logged-in users when API fails)
        if (!userId || !token) {
            console.log('👤 Updating guest cart...');

            const cart = await fetchCart();
            const item = cart.items.find(item => {
                const sameId = String(getItemId(item)) === String(menuItemId);
                const sameType = isButcheryType(item.itemType) && isButcheryType(itemType);
                const sameSize = (selectedSize && item.selectedSize?.size === selectedSize) || (!selectedSize && !item.selectedSize);
                return sameId && sameType && sameSize;
            });

            if (item) {
                item.quantity = quantity;
                if (selectedSize) {
                    item.selectedSize = selectedSize;
                }
                saveGuestCart(cart);
                console.log('💾 Guest cart saved after update');
            }
        }

        // Update UI
        await updateCartCount();
        await displayCartItems();
    }

    // Enhanced display cart items function
    async function displayCartItems() {
        if (!cartContainer) return;

        const cart = await fetchCart();
        console.log('📋 Displaying cart items:', cart);

        if (!cart || !cart.items || cart.items.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">
                        <i class="fas fa-drumstick-bite"></i>
                    </div>
                    <h3>Your Butchery Cart is Empty</h3>
                    <p>Discover our premium selection of fresh, quality meats and add your favorites to get started!</p>
                    <div class="empty-cart-actions">
                        <a href="butchery.html" class="empty-cart-primary-btn">
                            <i class="fas fa-meat"></i>
                            Browse Our Butchery
                        </a>
                        <a href="index.html" class="empty-cart-secondary-btn">
                            <i class="fas fa-home"></i>
                            Back to Home
                        </a>
                    </div>
                    <div class="empty-cart-features">
                        <div class="empty-cart-feature">
                            <i class="fas fa-award"></i>
                            <span>Premium Quality</span>
                        </div>
                        <div class="empty-cart-feature">
                            <i class="fas fa-truck"></i>
                            <span>Fresh Delivery</span>
                        </div>
                        <div class="empty-cart-feature">
                            <i class="fas fa-tags"></i>
                            <span>Best Prices</span>
                        </div>
                    </div>
                </div>
            `;
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }

        let subtotal = 0;
        let cartHTML = '';

        for (const item of cart.items) {
            // Enhanced price calculation with debug logging
            const unitPrice = item.selectedSize?.price || item.price || item.menuItem?.price || 0;
            const quantity = item.quantity || 1;
            const itemTotal = unitPrice * quantity;
            subtotal += itemTotal;

            console.log(`💰 Item calculation: ${getItemName(item)} - unitPrice=${unitPrice}, quantity=${quantity}, total=${itemTotal}`);

            cartHTML += `
                <div class="cart-item" data-id="${getItemId(item)}" data-type="${item.itemType}"
                     ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}
                     data-price="${unitPrice}">
                    <img src="${getItemImage(item)}" alt="${getItemName(item)}" onerror="this.src='images/meat.jpg';">
                    <div class="cart-item-details">
                        <h3>${getItemName(item)} <span class="butchery-badge">Butchery</span></h3>
                        ${item.selectedSize ? `<p>Size: ${item.selectedSize.size}</p>` : ''}
                        <p class="price">Ksh ${unitPrice.toLocaleString()}</p>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus" data-id="${getItemId(item)}"
                                data-type="${item.itemType}"
                                ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}
                                data-price="${unitPrice}">-</button>
                            <span class="quantity">${quantity}</span>
                            <button class="quantity-btn plus" data-id="${getItemId(item)}"
                                data-type="${item.itemType}"
                                ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}
                                data-price="${unitPrice}">+</button>
                        </div>
                    </div>
                    <button class="remove-btn" data-id="${getItemId(item)}"
                        data-type="${item.itemType}"
                        ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}
                        data-price="${unitPrice}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }

        cartContainer.innerHTML = cartHTML;
        if (cartSummary) cartSummary.style.display = 'block';

        // Enhanced order summary calculation
        updateCartSummary(subtotal);
        initButtonHandlers();
    }

    // Enhanced order summary function
    function updateCartSummary(subtotal) {
        if (!subtotal) {
            subtotal = Array.from(document.querySelectorAll('.cart-item')).reduce((sum, item) => {
                const price = parseFloat(item.querySelector('.price').textContent.replace(/[^0-9.]/g, ''));
                const quantity = parseInt(item.querySelector('.quantity').textContent);
                return sum + (price * quantity);
            }, 0);
        }

        const deliveryFee = 200; // Flat delivery fee
        const total = subtotal + deliveryFee;

        console.log('💰 Order summary calculation:', { subtotal, deliveryFee, total });

        if (subtotalElement) subtotalElement.textContent = `Ksh ${subtotal.toLocaleString()}`;
        if (deliveryFeeElement) deliveryFeeElement.textContent = `Ksh ${deliveryFee.toLocaleString()}`;
        if (totalElement) totalElement.textContent = `Ksh ${total.toLocaleString()}`;
    }

    // Enhanced button handlers with proper event delegation
    function initButtonHandlers() {
        // Remove any existing listeners to prevent duplicates
        document.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.replaceWith(btn.cloneNode(true));
        });

        // Quantity controls
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const id = this.dataset.id;
                const type = this.dataset.type;
                const size = this.dataset.size || null;
                const price = this.dataset.price ? Number(this.dataset.price) : null;
                const quantityElement = this.parentElement.querySelector('.quantity');
                let quantity = parseInt(quantityElement.textContent);

                if (this.classList.contains('plus')) {
                    quantity++;
                } else if (this.classList.contains('minus')) {
                    quantity = Math.max(1, quantity - 1);
                }

                const selObj = size ? { size, ...(price != null ? { price } : {}) } : null;
                await updateCartItem(id, type, quantity, selObj);
            });
        });

        // Remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const id = this.dataset.id;
                const type = this.dataset.type;
                const size = this.dataset.size || null;
                const price = this.dataset.price ? Number(this.dataset.price) : null;
                const selObj = size ? { size, ...(price != null ? { price } : {}) } : null;
                await removeFromCart(id, type, selObj);
            });
        });
    }

    // Enhanced toast notification
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    // Expose functions globally
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.updateCartItem = updateCartItem;
    window.fetchCart = fetchCart;
    window.getGuestCart = getGuestCart;
    window.saveGuestCart = saveGuestCart;

    // Initialize cart
    async function init() {
        try {
            console.log('🚀 Initializing butchery cart...');
            localStorage.setItem('cartDepartment', 'butchery');
            await updateCartCount();
            if (typeof window.updateCartIndicators === 'function') {
                try { window.updateCartIndicators(); } catch (_) {}
            }
            await displayCartItems();
            console.log('✅ Butchery cart initialized successfully');
        } catch (error) {
            console.error('💥 Error initializing butchery cart:', error);
        }
    }

    // Start the cart
    init();
});