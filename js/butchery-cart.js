// Butchery Cart Functionality
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

    function mergeGuestButcheryCart(butcheryOnly) {
        // Merge butchery-only items back into unified guestCart while preserving others
        const raw = localStorage.getItem('guestCart') || '{"items":[],"total":0}';
        let full;
        try { full = JSON.parse(raw); } catch { full = { items: [], total: 0 }; }
        const others = (full.items || []).filter(it => !isButcheryType(it.itemType));
        const merged = others.concat(butcheryOnly.items || []);
        const total = merged.reduce((sum, it) => {
            const price = it.selectedSize?.price || it.price || it.menuItem?.price || 0;
            return sum + (price * (it.quantity || 1));
        }, 0);
        localStorage.setItem('guestCart', JSON.stringify({ items: merged, total }));
    }

    function getGuestButcheryCart() {
        // Read unified cart
        const raw = localStorage.getItem('guestCart') || '{"items":[],"total":0}';
        let full;
        try { full = JSON.parse(raw); } catch { full = { items: [], total: 0 }; }

        // Migrate legacy butcheryGuestCart if present
        try {
            const legacyRaw = localStorage.getItem('butcheryGuestCart');
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw);
                const legacyItems = Array.isArray(legacy.items) ? legacy.items : [];
                if (legacyItems.length) {
                    const merged = (full.items || []).concat(
                        legacyItems.map(li => ({
                            // normalize legacy fields
                            menuItem: typeof li.menuItem === 'object' ? li.menuItem : { _id: li.menuItem, name: li.name, price: li.price, image: li.image },
                            itemType: li.itemType || 'Meat',
                            quantity: li.quantity || 1,
                            selectedSize: li.selectedSize || null,
                            name: li.name,
                            price: li.price,
                            image: li.image
                        }))
                    );
                    const total = merged.reduce((sum, it) => {
                        const price = it.selectedSize?.price || it.price || it.menuItem?.price || 0;
                        return sum + (price * (it.quantity || 1));
                    }, 0);
                    localStorage.setItem('guestCart', JSON.stringify({ items: merged, total }));
                    localStorage.removeItem('butcheryGuestCart');
                    full = { items: merged, total };
                } else {
                    localStorage.removeItem('butcheryGuestCart');
                }
            }
        } catch (_) {}

        const items = (full.items || []).filter(it => isButcheryType(it.itemType));
        const total = items.reduce((sum, it) => {
            const price = it.selectedSize?.price || it.price || it.menuItem?.price || 0;
            return sum + (price * (it.quantity || 1));
        }, 0);
        return { items, total };
    }

    // Fetch cart from backend or local storage
    async function fetchCart() {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');
        
        if (userId && token) {
            try {
                const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) return await response.json();
            } catch (error) {
                console.error('Error fetching cart:', error);
            }
        }
        
        // Fallback to unified guest cart for guests (butchery subset)
        return getGuestButcheryCart();
    }

    // Save cart to backend or local storage
    async function saveCart(cart) {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');
        
        if (userId && token) {
            try {
                await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(cart)
                });
            } catch (error) {
                console.error('Error saving cart:', error);
            }
        } else {
            // Merge butchery-only changes back into unified guestCart
            mergeGuestButcheryCart(cart);
        }
    }

    // Update cart count in the header
    async function updateCartCount() {
        const cart = await fetchCart();
        const count = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
        document.querySelectorAll('.cart-count').forEach(el => el.textContent = count);
    }

    // Add item to cart
    async function addToCart(item) {
        const cart = await fetchCart();
        const existingItem = cart.items.find(i => {
            const sameId = String(getItemId(i)) === String(item._id);
            const sameType = isButcheryType(i.itemType);
            const sameSize = !item.selectedSize || i.selectedSize?.size === item.selectedSize?.size;
            return sameId && sameType && sameSize;
        });

        if (existingItem) {
            existingItem.quantity += item.quantity || 1;
        } else {
            cart.items.push({
                menuItem: { _id: item._id, name: item.name, price: item.price, image: item.image, category: item.category },
                itemType: 'Meat',
                quantity: item.quantity || 1,
                selectedSize: item.selectedSize || null,
                name: item.name,
                price: item.price,
                image: item.image
            });
        }

        await saveCart(cart);
        await updateCartCount();
        await displayCartItems();
        showToast(`${item.name} added to cart!`);
    }

    // Remove item from cart
    async function removeFromCart(menuItemId, itemType, selectedSize = null) {
        const cart = await fetchCart();
        cart.items = cart.items.filter(item => {
            const sameId = String(getItemId(item)) === String(menuItemId);
            const sameType = isButcheryType(item.itemType) && isButcheryType(itemType);
            const sameSize = (selectedSize && item.selectedSize?.size === selectedSize) || (!selectedSize && !item.selectedSize);
            return !(sameId && sameType && sameSize);
        });
        await saveCart(cart);
        await updateCartCount();
        await displayCartItems();
    }

    // Update item quantity in cart
    async function updateCartItem(menuItemId, itemType, quantity, selectedSize = null) {
        if (quantity < 1) {
            await removeFromCart(menuItemId, itemType, selectedSize);
            return;
        }

        const cart = await fetchCart();
        const item = cart.items.find(item => {
            const sameId = String(getItemId(item)) === String(menuItemId);
            const sameType = isButcheryType(item.itemType) && isButcheryType(itemType);
            const sameSize = (selectedSize && item.selectedSize?.size === selectedSize) || (!selectedSize && !item.selectedSize);
            return sameId && sameType && sameSize;
        });

        if (item) {
            item.quantity = quantity;
            await saveCart(cart);
            await updateCartCount();
            await displayCartItems();
        }
    }

    // Display cart items
    async function displayCartItems() {
        const cart = await fetchCart();
        
        if (!cart || !cart.items || cart.items.length === 0) {
            cartContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                    <a href="butchery.html" class="btn">Continue Shopping</a>
                </div>
            `;
            if (cartSummary) cartSummary.style.display = 'none';
            return;
        }

        let subtotal = 0;
        let cartHTML = '';

        for (const item of cart.items) {
            const itemTotal = item.quantity * (item.selectedSize?.price || item.price || item.menuItem?.price || 0);
            subtotal += itemTotal;

            cartHTML += `
                <div class="cart-item" data-id="${getItemId(item)}" data-type="${item.itemType}" 
                     ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}>
                    <img src="${getItemImage(item)}" alt="${getItemName(item)}" onerror="this.src='images/meat.jpg';">
                    <div class="cart-item-details">
                        <h3>${getItemName(item)} <span class="butchery-badge">Butchery</span></h3>
                        ${item.selectedSize ? `<p>Size: ${item.selectedSize.size}</p>` : ''}
                        <p class="price">Ksh ${(item.selectedSize?.price || item.price || item.menuItem?.price || 0).toLocaleString()}</p>
                        <div class="quantity-controls">
                            <button class="quantity-btn minus" data-id="${getItemId(item)}" 
                                data-type="${item.itemType}" 
                                ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}>-</button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn plus" data-id="${getItemId(item)}" 
                                data-type="${item.itemType}" 
                                ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}>+</button>
                        </div>
                    </div>
                    <button class="remove-btn" data-id="${getItemId(item)}" 
                        data-type="${item.itemType}" 
                        ${item.selectedSize ? `data-size="${item.selectedSize.size}"` : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }

        cartContainer.innerHTML = cartHTML;
        if (cartSummary) cartSummary.style.display = 'block';
        updateCartSummary(subtotal);
        initButtonHandlers();
    }

    // Update cart summary
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

        if (subtotalElement) subtotalElement.textContent = `Ksh ${subtotal.toLocaleString()}`;
        if (deliveryFeeElement) deliveryFeeElement.textContent = `Ksh ${deliveryFee.toLocaleString()}`;
        if (totalElement) totalElement.textContent = `Ksh ${total.toLocaleString()}`;
    }

    // Initialize button handlers
    function initButtonHandlers() {
        // Quantity controls
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const id = this.dataset.id;
                const type = this.dataset.type;
                const size = this.dataset.size || null;
                const quantityElement = this.parentElement.querySelector('.quantity');
                let quantity = parseInt(quantityElement.textContent);

                if (this.classList.contains('plus')) {
                    quantity++;
                } else if (this.classList.contains('minus')) {
                    quantity = Math.max(1, quantity - 1);
                }

                await updateCartItem(id, type, quantity, size);
            });
        });

        // Remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const id = this.dataset.id;
                const type = this.dataset.type;
                const size = this.dataset.size || null;
                await removeFromCart(id, type, size);
            });
        });
    }

    // Show toast notification
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

    // Initialize cart
    async function init() {
        await updateCartCount();
        await displayCartItems();
        
        // Toggle checkout form
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                if (checkoutForm) {
                    checkoutForm.style.display = checkoutForm.style.display === 'block' ? 'none' : 'block';
                }
            });
        }
        
        // Handle payment method changes
        if (paymentOptions) {
            paymentOptions.forEach(option => {
                option.addEventListener('change', function() {
                    const mpesaInput = document.getElementById('mpesaNumber');
                    if (mpesaInput) {
                        mpesaInput.style.display = this.value === 'mpesa' ? 'block' : 'none';
                    }
                });
            });
        }
    }

    // Start the cart
    init();
});
