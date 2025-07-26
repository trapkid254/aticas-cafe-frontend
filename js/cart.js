// Helper to get userId and token
function getUserId() {
    return localStorage.getItem('userId');
}

function getUserToken() {
    return localStorage.getItem('userToken');
}

// Cafe coordinates (JKUAT area)
const CAFE_LAT = -1.1027070230055493;
const CAFE_LNG = 37.01466835231921;

// Calculate distance between two points using Haversine formula
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

// Calculate delivery fee based on distance
function calculateDeliveryFee(distance) {
    if (distance <= 0.5) return 50; // Base fee: Ksh 50 for up to 0.5km
    if (distance <= 1.0) return 50; // No extra fee up to 1km
    
    // For distances beyond 1km, add Ksh 30 for every additional 0.5km
    const extraDistance = distance - 1.0;
    const extraCharges = Math.ceil(extraDistance / 0.5) * 30;
    return 50 + extraCharges;
}

// Guest cart helpers
function getGuestCart() {
    return JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
}

function setGuestCart(cart) {
    console.log('[guestCart] setGuestCart called. New value:', cart);
    localStorage.setItem('guestCart', JSON.stringify(cart));
}

// Fetch cart (backend for logged-in, localStorage for guest)
async function fetchCart() {
    const userId = getUserId();
    const token = getUserToken();
    console.log('[fetchCart] userId:', userId, 'token:', token);
    
    if (userId && token) {
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`);
            if (!res.ok) throw new Error('Failed to fetch cart');
            const cart = await res.json();
            
            // Normalize the cart items structure
            if (cart && cart.items) {
                cart.items = cart.items.map(item => ({
                    ...item,
                    menuItem: item.menuItem?._doc || item.menuItem,
                    selectedSize: item.selectedSize?._doc || item.selectedSize
                }));
            }
            
            console.log('[fetchCart] Normalized cart data:', cart);
            return cart || { items: [] };
        } catch (err) {
            console.error('Error fetching cart:', err);
            return { items: [] };
        }
    } else {
        let guestCart = getGuestCart();
        if (!guestCart || !Array.isArray(guestCart.items)) {
            guestCart = { items: [] };
            setGuestCart(guestCart);
        }
        console.log('Guest cart loaded:', guestCart);
        return guestCart;
    }
}

// Update or add item in cart
async function updateCartItem(menuItemId, quantity, itemType, selectedSize = null) {
    const userId = getUserId();
    const token = getUserToken();
    if (userId && token) {
        try {
            await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ menuItemId, quantity, itemType, selectedSize })
            });
        } catch (err) {
            console.error('Error updating cart item:', err);
        }
    } else {
        // Guest: update localStorage cart
        let cart = getGuestCart();
        const idx = cart.items.findIndex(i => 
            i.menuItem._id === menuItemId && 
            i.itemType === itemType &&
            (selectedSize ? i.selectedSize && i.selectedSize.size === selectedSize.size : !i.selectedSize)
        );
        if (idx > -1) {
            if (quantity < 1) {
                cart.items.splice(idx, 1);
            } else {
                cart.items[idx].quantity = quantity;
            }
        }
        setGuestCart(cart);
    }
}

// Remove item from cart
async function removeCartItem(menuItemId, itemType, selectedSize = null) {
    const userId = getUserId();
    const token = getUserToken();
    const sizeIdentifier = selectedSize ? selectedSize.size : 'default';

    if (userId && token) {
        try {
            await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}/items/${itemType}/${menuItemId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ selectedSize })
            });
        } catch (err) {
            console.error('Error removing cart item:', err);
        }
    } else {
        let cart = getGuestCart();
        cart.items = cart.items.filter(i => 
            !(i.menuItem._id === menuItemId && 
              i.itemType === itemType &&
              (selectedSize ? i.selectedSize && i.selectedSize.size === selectedSize.size : !i.selectedSize))
        );
        setGuestCart(cart);
    }
}

// Clear cart after order
async function clearCart() {
    const userId = getUserId();
    const token = getUserToken();
    console.log('[clearCart] Called. userId:', userId, 'token:', token);
    if (userId && token) {
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            console.log('[clearCart] Backend DELETE response:', res.status, await res.text());
        } catch (err) {
            console.error('[clearCart] Error clearing cart:', err);
        }
    } else {
        console.log('[clearCart] Guest cart. Clearing localStorage.');
        setGuestCart({ items: [] });
        console.log('[clearCart] guestCart after clear:', localStorage.getItem('guestCart'));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const cartContainer = document.getElementById('cartContainer');
    const cartSummary = document.getElementById('cartSummary');
    const subtotalElement = document.getElementById('subtotal');
    const taxElement = document.getElementById('tax');
    const totalElement = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkoutBtn');
    const checkoutModal = document.getElementById('checkoutModal');
    const confirmationModal = document.getElementById('confirmationModal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const paymentOptions = document.querySelectorAll('input[name="payment"]');
    const mpesaDetails = document.getElementById('mpesaDetails');
    const checkoutForm = document.getElementById('checkoutForm');
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    
    let cart = { items: [] };
    
    // Helper to show/hide loading overlay
    function showLoading() {
        let overlay = document.getElementById('cartLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'cartLoadingOverlay';
            overlay.style.position = 'fixed';
            overlay.style.top = 0;
            overlay.style.left = 0;
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.background = 'rgba(255,255,255,0.4)';
            overlay.style.zIndex = 9998;
            overlay.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2rem;color:#27ae60;"><i class="fas fa-spinner fa-spin"></i> Updating...</div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';
    }
    
    function hideLoading() {
        const overlay = document.getElementById('cartLoadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

  // In your cart.js, update the displayCartItems function:

async function displayCartItems() {
    cart = await fetchCart();
    console.log('Full cart data:', JSON.parse(JSON.stringify(cart))); // Debug log
    
    if (!cart || !cart.items || cart.items.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart" style="text-align: center; padding: 3rem 0;">
                <i class="fas fa-shopping-cart" style="font-size: 4rem; color: #ccc; margin-bottom: 1.5rem;"></i>
                <p style="font-size: 1.2rem; color: #555; margin-bottom: 2rem;">Your cart is empty</p>
                <a href="menu.html" class="menu-btn">View Menu</a>
            </div>
        `;
        cartSummary.style.display = 'none';
        return;
    }

    cartContainer.innerHTML = '';
    cartSummary.style.display = 'block';

    cart.items.forEach(item => {
        // Properly access the menuItem data
        const menuItem = item.menuItem?._doc || item.menuItem;
        if (!menuItem || !menuItem._id) {
            console.warn('Invalid menu item:', item);
            return;
        }

        const selectedSize = item.selectedSize?._doc || item.selectedSize;
        const image = menuItem.image || 'images/varied menu.jpeg';
        const name = selectedSize ? `${menuItem.name} (${selectedSize.size})` : menuItem.name;
        
        // Use effectivePrice if available, otherwise calculate
        const price = item.effectivePrice || 
                     (selectedSize ? selectedSize.price : menuItem.price) || 0;
        
        const id = menuItem._id;
        const itemType = item.itemType || (menuItem.category ? 'Menu' : 'MealOfDay');

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${image}" alt="${name}">
            <div class="cart-item-details">
                <h3>${name}</h3>
                <span class="price">Ksh ${(price * item.quantity).toLocaleString()}</span>
                <div class="quantity-controls">
                    <button class="quantity-btn minus" data-id="${id}" data-type="${itemType}" 
                        data-size='${selectedSize ? JSON.stringify(selectedSize.size) : ''}'>-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn plus" data-id="${id}" data-type="${itemType}" 
                        data-size='${selectedSize ? JSON.stringify(selectedSize.size) : ''}'>+</button>
                </div>
            </div>
            <button class="remove-btn" data-id="${id}" data-type="${itemType}" 
                data-size='${selectedSize ? JSON.stringify(selectedSize.size) : ''}'>
                <i class="fas fa-trash"></i>
            </button>
        `;
        cartContainer.appendChild(cartItem);
    });

// Rest of your event listeners...

// Add event listeners to quantity buttons
document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.id;
                const itemType = this.dataset.type;
                const itemSize = this.dataset.size ? JSON.parse(this.dataset.size) : null;

                const item = cart.items.find(i => 
                    String(i.menuItem._id) === String(itemId) && 
                    i.itemType === itemType &&
                    (itemSize ? i.selectedSize && i.selectedSize.size === itemSize : !i.selectedSize)
                );

                if (!item) return;
                
                let newQty = item.quantity;
                document.querySelectorAll('.quantity-btn, .remove-btn').forEach(btn => btn.disabled = true);
                showLoading();
                
                let prevCart = JSON.parse(JSON.stringify(cart));
                let optimisticCart = JSON.parse(JSON.stringify(cart));
                const itemIndex = optimisticCart.items.findIndex(i => 
                    String(i.menuItem._id) === String(itemId) && 
                    i.itemType === itemType &&
                    (itemSize ? i.selectedSize && i.selectedSize.size === itemSize : !i.selectedSize)
                );

                if (this.classList.contains('minus')) {
                    newQty = item.quantity - 1;
                    if (newQty < 1) {
                        optimisticCart.items.splice(itemIndex, 1);
                    } else {
                        optimisticCart.items[itemIndex].quantity = newQty;
                    }
                } else if (this.classList.contains('plus')) {
                    newQty = item.quantity + 1;
                    optimisticCart.items[itemIndex].quantity = newQty;
                }
                
                cart = optimisticCart;
                renderCartUI();
                
                try {
                    const selectedSize = item.selectedSize || null;
                    if (newQty < 1) {
                        await removeCartItem(itemId, itemType, selectedSize);
                    } else {
                        await updateCartItem(itemId, newQty, itemType, selectedSize);
                    }
                } catch (err) {
                    cart = prevCart;
                    renderCartUI();
                    showMpesaToast('Failed to update cart. Please try again.', '#e74c3c');
                }
                
                hideLoading();
                document.querySelectorAll('.quantity-btn, .remove-btn').forEach(btn => btn.disabled = false);
                await displayCartItems();
            });
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.id;
                const itemType = this.dataset.type;
                const itemSize = this.dataset.size ? JSON.parse(this.dataset.size) : null;

                if (!itemId || !itemType) {
                    showMpesaToast('Invalid item. Cannot remove.', '#e74c3c');
                    return;
                }
                
                const itemToRemove = cart.items.find(i => 
                    i.menuItem._id === itemId && 
                    i.itemType === itemType &&
                    (itemSize ? i.selectedSize && i.selectedSize.size === itemSize : !i.selectedSize)
                );
                const selectedSize = itemToRemove ? itemToRemove.selectedSize : null;

                document.querySelectorAll('.quantity-btn, .remove-btn').forEach(btn => btn.disabled = true);
                showLoading();
                
                let prevCart = JSON.parse(JSON.stringify(cart));
                let optimisticCart = JSON.parse(JSON.stringify(cart));
                optimisticCart.items = optimisticCart.items.filter(i => 
                    !(i.menuItem && i.menuItem._id === itemId && 
                      i.itemType === itemType &&
                      (itemSize ? i.selectedSize && i.selectedSize.size === itemSize : !i.selectedSize))
                );
                
                cart = optimisticCart;
                renderCartUI();
                
                try {
                    await removeCartItem(itemId, itemType, selectedSize);
                } catch (err) {
                    cart = prevCart;
                    renderCartUI();
                    showMpesaToast('Failed to remove item. Please try again.', '#e74c3c');
                }
                
                hideLoading();
                document.querySelectorAll('.quantity-btn, .remove-btn').forEach(btn => btn.disabled = false);
                await displayCartItems();
            });
        });
        
        updateCartSummary();
        updateCartSummary();

    function renderCartUI() {
            cartContainer.innerHTML = `
                <div class="empty-cart" style="text-align: center; padding: 3rem 0;">
                    <i class="fas fa-shopping-cart" style="font-size: 4rem; color: #ccc; margin-bottom: 1.5rem;"></i>
                    <p style="font-size: 1.2rem; color: #555; margin-bottom: 2rem;">Your cart is empty</p>
                    <a href="menu.html" class="menu-btn">View Menu</a>
                </div>
            `;
            cartSummary.style.display = 'none';
            return;
        }
        
        cartContainer.innerHTML = '';
        cartSummary.style.display = 'block';
        
        cart.items.forEach(item => {
            if (!item.menuItem || !item.menuItem._id) return;
            
            const menuItem = item.menuItem;
            const selectedSize = item.selectedSize;
            const image = menuItem.image || 'images/varied menu.jpeg';
            const name = selectedSize ? `${menuItem.name} (${selectedSize.size})` : menuItem.name;
            
            // Always use selectedSize.price if available, otherwise fall back to menuItem.price
            const price = selectedSize?.price || menuItem.price;
            
            const id = menuItem._id;
            const itemType = item.itemType || (menuItem.category ? 'Menu' : 'MealOfDay');

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <img src="${image}" alt="${name}">
                <div class="cart-item-details">
                    <h3>${name}</h3>
                    <span class="price">Ksh ${(price * item.quantity).toLocaleString()}</span>
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-id="${id}" data-type="${itemType}" data-size='${selectedSize ? JSON.stringify(selectedSize.size) : ''}'>-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus" data-id="${id}" data-type="${itemType}" data-size='${selectedSize ? JSON.stringify(selectedSize.size) : ''}'>+</button>
                    </div>
                </div>
                <button class="remove-btn" data-id="${id}" data-type="${itemType}" data-size='${selectedSize ? JSON.stringify(selectedSize.size) : ''}'><i class="fas fa-trash"></i></button>
            `;
            cartContainer.appendChild(cartItem);
        });
        
        updateCartSummary();
    }
    
    function updateCartSummary() {
        if (!cartSummary || !document.getElementById('subtotal') || !document.getElementById('total')) return;
        
        const subtotal = cart.items.reduce((sum, item) => {
            // Always use selectedSize.price if available, otherwise fall back to menuItem.price
            const price = item.selectedSize?.price || item.menuItem?.price || 0;
            return sum + (price * item.quantity);
        }, 0);
        
        subtotalElement.textContent = `Ksh ${subtotal.toLocaleString()}`;
        
        let deliveryFee = 0;
        const orderTypeRadio = document.querySelector('input[name="orderType"]:checked');
        const deliveryFeeRow = document.getElementById('deliveryFeeRow');
        const deliveryFeeDisplay = document.getElementById('deliveryFeeDisplay');
        
        const checkoutSubtotal = document.getElementById('checkoutSubtotal');
        const checkoutDeliveryFee = document.getElementById('checkoutDeliveryFee');
        const checkoutTotal = document.getElementById('checkoutTotal');
        const checkoutDeliveryFeeRow = document.getElementById('checkoutDeliveryFeeRow');
        
        if (orderTypeRadio && orderTypeRadio.value === 'delivery') {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                const distance = haversineDistance(CAFE_LAT, CAFE_LNG, lat, lng);
                deliveryFee = calculateDeliveryFee(distance);
                if (deliveryFeeDisplay) deliveryFeeDisplay.textContent = `Ksh ${deliveryFee.toLocaleString()}`;
                if (deliveryFeeRow) deliveryFeeRow.style.display = 'flex';
                if (checkoutDeliveryFee) checkoutDeliveryFee.textContent = `Ksh ${deliveryFee.toLocaleString()}`;
                if (checkoutDeliveryFeeRow) checkoutDeliveryFeeRow.style.display = 'flex';
            } else {
                if (deliveryFeeDisplay) deliveryFeeDisplay.textContent = '';
                if (deliveryFeeRow) deliveryFeeRow.style.display = 'none';
                if (checkoutDeliveryFee) checkoutDeliveryFee.textContent = '';
                if (checkoutDeliveryFeeRow) checkoutDeliveryFeeRow.style.display = 'none';
            }
        } else {
            if (deliveryFeeDisplay) deliveryFeeDisplay.textContent = '';
            if (deliveryFeeRow) deliveryFeeRow.style.display = 'none';
            if (checkoutDeliveryFee) checkoutDeliveryFee.textContent = '';
            if (checkoutDeliveryFeeRow) checkoutDeliveryFeeRow.style.display = 'none';
        }
        
        const total = subtotal + deliveryFee;
        totalElement.textContent = `Ksh ${total.toLocaleString()}`;
        if (checkoutSubtotal) checkoutSubtotal.textContent = `Ksh ${subtotal.toLocaleString()}`;
        if (checkoutTotal) checkoutTotal.textContent = `Ksh ${total.toLocaleString()}`;
    }
    
    // Payment method toggle
    paymentOptions.forEach(option => {
        option.addEventListener('change', function() {
            if (this.value === 'mpesa') {
                mpesaDetails.style.display = 'block';
            } else {
                mpesaDetails.style.display = 'none';
            }
        });
    });

    // Order type change listeners
    document.querySelectorAll('input[name="orderType"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const deliveryLocationPopup = document.getElementById('deliveryLocationPopup');
            if (this.value === 'delivery') {
                deliveryLocationPopup.style.display = 'block';
            } else {
                deliveryLocationPopup.style.display = 'none';
            }
            updateCartSummary();
        });
    });

    // Location functionality
    const getLocationBtn = document.getElementById('getLocationBtn');
    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(position) {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        document.getElementById('latitude').value = lat;
                        document.getElementById('longitude').value = lng;
                        document.getElementById('locationStatus').innerHTML = '<i class="fas fa-check-circle"></i> <span>Location captured successfully!</span>';
                        document.getElementById('locationStatus').style.display = 'block';
                        document.getElementById('locationStatus').style.background = '#d4edda';
                        document.getElementById('locationStatus').style.color = '#155724';
                        updateCartSummary();
                    },
                    function(error) {
                        document.getElementById('locationStatus').innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Could not get location. Please enter manually.</span>';
                        document.getElementById('locationStatus').style.display = 'block';
                        document.getElementById('locationStatus').style.background = '#f8d7da';
                        document.getElementById('locationStatus').style.color = '#721c24';
                    }
                );
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        });
    }

    // Manual coordinate input listeners
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    if (latitudeInput && longitudeInput) {
        [latitudeInput, longitudeInput].forEach(input => {
            input.addEventListener('input', function() {
                const lat = parseFloat(latitudeInput.value);
                const lng = parseFloat(longitudeInput.value);
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    updateCartSummary();
                }
            });
        });
    }

    // Checkout button
    checkoutBtn.addEventListener('click', function() {
        checkoutForm.style.display = checkoutForm.style.display === 'block' ? 'none' : 'block';
        if (checkoutForm.style.display === 'block') {
            checkoutBtn.textContent = 'Cancel';
            const userId = getUserId();
            const token = getUserToken();
            const guestFields = document.getElementById('guestFields');
            const guestPhoneField = document.getElementById('guestPhoneField');
            if (!userId || !token) {
                if (guestFields) guestFields.style.display = 'block';
                if (guestPhoneField) guestPhoneField.style.display = 'block';
            } else {
                if (guestFields) guestFields.style.display = 'none';
                if (guestPhoneField) guestPhoneField.style.display = 'none';
            }
        } else {
            checkoutBtn.textContent = 'Proceed to Checkout';
        }
    });
    
    // Close modals
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            checkoutModal.style.display = 'none';
            confirmationModal.style.display = 'none';
            document.body.appendChild(checkoutModal);
            checkoutModal.style.position = '';
        });
    });
    
    // Continue shopping button
    continueShoppingBtn.addEventListener('click', function() {
        window.location.href = 'menu.html';
    });
    
    // M-Pesa Daraja Sandbox Credentials
    const MPESA_CONSUMER_KEY = '054TZRXJNbDmPjhJBD8fVnJGhqVc3aI8aicf8USfapFfqEBO';
    const MPESA_CONSUMER_SECRET = 'e7FmKAQqMmyjT0bGP7tOEpfnvn0chC6fuMsmilF8vJtoi3QPNMnGEjChJybQnCbt';
    const MPESA_SHORTCODE = '174379';
    const MPESA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const MPESA_SANDBOX_URL = 'https://sandbox.safaricom.co.ke';

    // Helper: Show toast
    function showMpesaToast(message, color = '#27ae60') {
        let toast = document.getElementById('mpesaToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mpesaToast';
            toast.style.position = 'fixed';
            toast.style.top = '30px';
            toast.style.right = '30px';
            toast.style.background = color;
            toast.style.color = '#fff';
            toast.style.padding = '16px 28px';
            toast.style.borderRadius = '8px';
            toast.style.fontWeight = 'bold';
            toast.style.fontSize = '1.1rem';
            toast.style.zIndex = '9999';
            toast.style.boxShadow = '0 2px 12px rgba(39,174,96,0.12)';
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 400);
        }, 2000);
    }

    // M-Pesa STK Push via backend
    async function initiateMpesaSTKPush(phone, amount, orderId) {
        try {
            const response = await fetch('https://aticas-backend.onrender.com/api/mpesa/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, amount, orderId })
            });
            const data = await response.json();
            if (data.ResponseCode === '0') {
                showMpesaToast('M-Pesa push sent. Complete payment on your phone.');
                return true;
            } else {
                showMpesaToast('M-Pesa push failed: ' + (data.errorMessage || data.error || 'Unknown error'), '#e74c3c');
                return false;
            }
        } catch (err) {
            showMpesaToast('M-Pesa error: ' + err.message, '#e74c3c');
            return false;
        }
    }

    // Form submission
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        const orderType = document.querySelector('input[name="orderType"]:checked').value;
        let mpesaNumber = paymentMethod === 'mpesa' ? document.getElementById('mpesaNumber').value : null;
        
        // Validate M-Pesa number
        if (paymentMethod === 'mpesa') {
            let userInput = document.getElementById('mpesaNumber').value.replace(/[-\s]/g, '');
            let mpesaNumber = userInput;
            if (mpesaNumber.length === 9 && (mpesaNumber.startsWith('7') || mpesaNumber.startsWith('1'))) {
                mpesaNumber = '254' + mpesaNumber;
            }
            if (!/^254(7\d{8}|1\d{8})$/.test(mpesaNumber)) {
                showMpesaToast('Enter a valid M-Pesa number (e.g. 714003218 or 254714003218)', '#e74c3c');
                document.getElementById('mpesaNumber').focus();
                return;
            }
        }
        
        // Validate delivery location if delivery is selected
        let deliveryLocation = null;
        if (orderType === 'delivery') {
            const buildingName = document.getElementById('buildingName').value.trim();
            const streetAddress = document.getElementById('streetAddress').value.trim();
            const latitude = parseFloat(document.getElementById('latitude').value);
            const longitude = parseFloat(document.getElementById('longitude').value);
            
            if (!buildingName) {
                showMpesaToast('Please enter the building/location name.', '#e74c3c');
                document.getElementById('buildingName').focus();
                return;
            }
            
            if (!streetAddress) {
                showMpesaToast('Please enter the street address.', '#e74c3c');
                document.getElementById('streetAddress').focus();
                return;
            }
            
            if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
                showMpesaToast('Please set your location coordinates.', '#e74c3c');
                return;
            }
            
            deliveryLocation = {
                buildingName: buildingName,
                streetAddress: streetAddress,
                additionalInfo: document.getElementById('additionalInfo').value.trim(),
                coordinates: {
                    latitude: latitude,
                    longitude: longitude
                }
            };
        }
        
        const userId = getUserId();
        const token = getUserToken();
        let latestCart;
        if (userId && token) {
            latestCart = await fetchCart();
        } else {
            latestCart = getGuestCart();
        }
        
        if (!latestCart.items || latestCart.items.length === 0) {
            showMpesaToast('Your cart is empty.', '#e74c3c');
            return;
        }
        
        // Get user info
        let customerName, customerPhone;
        if (userId && token) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            customerName = currentUser ? currentUser.name : 'Guest';
            customerPhone = currentUser ? currentUser.phone : (mpesaNumber || 'Guest');
        } else {
            customerName = document.getElementById('guestName') ? document.getElementById('guestName').value : '';
            customerPhone = document.getElementById('guestPhone') ? document.getElementById('guestPhone').value : '';
            if (!customerName || !customerPhone) {
                showMpesaToast('Please enter your name and phone number.', '#e74c3c');
                return;
            }
        }
        
        let deliveryFee = 0;
        if (orderType === 'delivery') {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                const distance = haversineDistance(CAFE_LAT, CAFE_LNG, lat, lng);
                deliveryFee = calculateDeliveryFee(distance);
            }
        }
        
        const subtotal = latestCart.items.reduce((sum, item) => {
            // Always use selectedSize.price if available, otherwise fall back to menuItem.price
            const price = item.selectedSize?.price || item.menuItem?.price || 0;
            return sum + (price * item.quantity);
        }, 0);

        const order = {
            items: latestCart.items.map(item => ({ 
                menuItem: item.menuItem._id, 
                itemType: item.itemType, 
                quantity: item.quantity,
                selectedSize: item.selectedSize 
            })),
            total: subtotal + deliveryFee,
            deliveryFee: deliveryFee,
            orderType: orderType,
            deliveryLocation: deliveryLocation,
            paymentMethod: paymentMethod,
            mpesaNumber: mpesaNumber,
            status: 'pending',
            date: new Date().toISOString(),
            customerName: customerName,
            customerPhone: customerPhone
        };
        
        if (paymentMethod === 'mpesa') {
            showMpesaToast('Initiating M-Pesa payment...');
            const response = await fetch('https://aticas-backend.onrender.com/api/mpesa/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: mpesaNumber,
                    amount: order.total,
                    orderDetails: order
                })
            });
            
            const data = await response.json();
            if (data.errorMessage || data.error) {
                showMpesaToast('M-Pesa push failed: ' + (data.errorMessage || data.error), '#e74c3c');
                return;
            }
            
            showMpesaToast('M-Pesa push sent. Complete payment on your phone.');
            let merchantRequestId = data.MerchantRequestID || data.merchantRequestId || null;
            if (merchantRequestId) {
                localStorage.setItem('pendingMerchantRequestId', merchantRequestId);
                window.location.href = `payment-waiting.html?merchantRequestId=${merchantRequestId}`;
            } else {
                alert('Could not initiate payment. Please try again.');
            }
            return;
        }
        
        try {
            const response = await fetch('https://aticas-backend.onrender.com/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': token } : {}) },
                body: JSON.stringify(order)
            });
            
            const data = await response.json();
            if (data.success) {
                await clearCart();
                cart = { items: [] };
                if (!getUserId() || !getUserToken()) {
                    setGuestCart({ items: [] });
                }
                if (window.updateCartCount) await window.updateCartCount();
                await displayCartItems();
                
                localStorage.setItem('lastOrderId', data.order._id);
                setTimeout(() => {
                    window.location.href = `order-confirmation.html?orderId=${data.order._id}`;
                }, 400);
            } else {
                showMpesaToast('Failed to place order. Please try again.', '#e74c3c');
            }
        } catch (err) {
            console.error('Error placing order:', err);
            showMpesaToast('Failed to place order. Please try again.', '#e74c3c');
        }
    });
    
    displayCartItems();
});