// DOM Elements
const cartContainer = document.querySelector('.cart-items');
const checkoutForm = document.getElementById('checkoutForm');
const paymentOptions = document.querySelectorAll('input[name="payment"]');
const subtotalElement = document.getElementById('subtotal');
const totalElement = document.getElementById('total');

// Fetch menu item details
async function fetchMenuItem(menuItemId, itemType = 'food') {
    try {
        const baseUrl = 'https://aticas-backend.onrender.com';
        const endpoint = itemType === 'meat' || itemType === 'butchery'
            ? `${baseUrl}/api/meats/${menuItemId}`
            : `${baseUrl}/api/menu/${menuItemId}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Failed to fetch ${itemType} item`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${itemType} item:`, error);
        return null;
    }
}

// Helper to get userId and token
function getUserId() {
    return localStorage.getItem('userId');
}

function getUserToken() {
    return localStorage.getItem('userToken');
}

// Function to update cart count in the UI
async function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    const userId = getUserId();
    const token = getUserToken();
    let count = 0;
    
    try {
        if (userId && token) {
            // For logged-in users, fetch cart from backend
            const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const cart = await response.json();
                count = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
            }
        } else {
            // For guests, use local storage
            const guestCart = getGuestCart();
            count = guestCart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        // Fallback to guest cart if there's an error
        const guestCart = getGuestCart();
        count = guestCart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
    }
    
    // Update all cart count elements in the UI
    cartCountElements.forEach(element => {
        if (element) {
            element.textContent = count;
            element.style.display = count > 0 ? 'flex' : 'none';
        }
    });
    
    return count;
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
    try {
        localStorage.setItem('guestCart', JSON.stringify(cart));
    } catch (error) {
        console.error('Error saving cart to localStorage:', error);
        // Fallback to sessionStorage if localStorage fails
        try {
            sessionStorage.setItem('guestCart', JSON.stringify(cart));
        } catch (e) {
            console.error('Error saving cart to sessionStorage:', e);
        }
    }
}

// Fetch cart (backend for logged-in, local for guest)
async function fetchCart() {
    const userId = getUserId();
    const token = getUserToken();
    console.log('[fetchCart] userId:', userId, 'token:', token);
    
    if (userId && token) {
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                } 
            });
            if (!res.ok) throw new Error('Failed to fetch cart');
            const cart = await res.json();
            
            // Ensure cart has proper structure
            if (!cart || !cart.items) {
                return { items: [] };
            }
            
            // Filter out any null or invalid items
            cart.items = cart.items.filter(item => item && item.menuItem);
            
            console.log('[fetchCart] Cart data:', cart);
            return cart;
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
async function updateCartItem(menuItemId, quantity, itemType = 'food', selectedSize = null) {
    try {
        const userId = getUserId();
        const token = getUserToken();
        const isButchery = itemType === 'meat' || itemType === 'butchery';
        
        // For logged-in users
        if (userId && token) {
            const response = await fetch(`https://aticas-backend.onrender.com/api/cart/items`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    menuItemId,
                    quantity,
                    itemType: isButchery ? 'Meat' : 'Menu',
                    selectedSize
                })
            });
            
            if (!response.ok) throw new Error('Failed to update cart');
            
            const result = await response.json();
            updateCartCount();
            return result;
        } 
        // For guests
        else {
            const cart = getGuestCart();
            const existingItemIndex = cart.items.findIndex(item => 
                item.menuItem === menuItemId && 
                item.itemType === (isButchery ? 'Meat' : 'Menu') &&
                (!selectedSize || JSON.stringify(item.selectedSize) === JSON.stringify(selectedSize))
            );

            if (existingItemIndex >= 0) {
                if (quantity <= 0) {
                    cart.items.splice(existingItemIndex, 1);
                } else {
                    cart.items[existingItemIndex].quantity = quantity;
                    if (selectedSize) {
                        cart.items[existingItemIndex].selectedSize = selectedSize;
                    }
                }
            } else if (quantity > 0) {
                const menuItem = await fetchMenuItem(menuItemId, itemType);
                if (menuItem) {
                    cart.items.push({
                        menuItem: menuItemId,
                        name: menuItem.name,
                        price: selectedSize?.price || menuItem.price,
                        image: menuItem.image,
                        quantity,
                        itemType: isButchery ? 'Meat' : 'Menu',
                        selectedSize
                    });
                }
            }

            setGuestCart(cart);
            updateCartCount();
            return { success: true, cart };
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        throw error;
    }
}

// Initialize button handlers
async function initButtonHandlers() {
    cartContainer.addEventListener('click', async function(e) {
        const button = e.target.closest('.quantity-btn') || e.target.closest('.remove-btn');
        if (!button) return;

        const itemId = button.dataset.id;
        const itemType = button.dataset.type;
        const itemSize = button.dataset.size || null;
        const selectedSize = itemSize ? { size: itemSize } : null;

        const item = cart.items.find(i => 
            String(i.menuItem._id) === itemId && 
            i.itemType === itemType &&
            (
                (itemSize && i.selectedSize?.size === itemSize) ||
                (!itemSize && !i.selectedSize)
            )
        );

        if (!item) return;

        const loadingOverlay = showLoadingOverlay();
        
        try {
            if (button.classList.contains('remove-btn')) {
                await removeCartItem(itemId, itemType, selectedSize);
            } 
            else if (button.classList.contains('minus')) {
                const newQty = item.quantity - 1;
                if (newQty < 1) {
                    await removeCartItem(itemId, itemType, selectedSize);
                } else {
                    await updateCartItem(itemId, newQty, itemType, selectedSize);
                }
            } 
            else if (button.classList.contains('plus')) {
                await updateCartItem(itemId, item.quantity + 1, itemType, selectedSize);
            }
            
            cart = await fetchCart();
            await displayCartItems();
            if (window.updateCartCount) window.updateCartCount();
        } catch (error) {
            console.error('Error:', error);
            showMpesaToast('Failed to update cart. Please try again.', '#e74c3c');
        } finally {
            hideLoadingOverlay();
        }
    });
}

function updateCartSummary() {
    if (!cartSummary || !document.getElementById('subtotal') || !document.getElementById('total')) return;
    
    const subtotal = cart.items.reduce((sum, item) => {
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
        const price = item.selectedSize?.price || item.menuItem?.price || 0;
        return sum + (price * item.quantity);
    }, 0);

    // Determine order type (butchery or cafeteria) based on page context
    let sectionType = 'cafeteria';
    if (window.location.pathname.includes('butchery')) {
        sectionType = 'butchery';
    }
    
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
        customerPhone: customerPhone,
        type: sectionType // 'butchery' or 'cafeteria'
    };
    
    if (paymentMethod === 'mpesa') {
        showMpesaToast('Creating order and initiating M-Pesa payment...');
        
        // First create the order
        try {
            const orderResponse = await fetch('https://aticas-backend.onrender.com/api/orders', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    ...(token ? { 'Authorization': token } : {}) 
                },
                body: JSON.stringify(order)
            });
            
            const orderData = await orderResponse.json();
            if (!orderData.success) {
                showMpesaToast('Failed to create order. Please try again.', '#e74c3c');
                return;
            }
            
            const orderId = orderData.order._id;
            
            // Then initiate M-Pesa payment with the order ID
            const mpesaResponse = await fetch('https://aticas-backend.onrender.com/api/mpesa/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: mpesaNumber,
                    amount: order.total,
                    orderId: orderId,
                    orderDetails: order
                })
            });
            
            const mpesaData = await mpesaResponse.json();
            if (mpesaData.errorMessage || mpesaData.error) {
                showMpesaToast('M-Pesa push failed: ' + (mpesaData.errorMessage || mpesaData.error), '#e74c3c');
                return;
            }
            
            showMpesaToast('M-Pesa push sent. Complete payment on your phone.');
            let merchantRequestId = mpesaData.MerchantRequestID || mpesaData.merchantRequestId || null;
            if (merchantRequestId) {
                localStorage.setItem('pendingMerchantRequestId', merchantRequestId);
                window.location.href = `payment-waiting.html?merchantRequestId=${merchantRequestId}`;
            } else {
                alert('Could not initiate payment. Please try again.');
            }
            return;
        } catch (err) {
            console.error('Error with M-Pesa order creation:', err);
            showMpesaToast('Failed to create order. Please try again.', '#e74c3c');
            return;
        }
    }
    
    try {
        const response = await fetch('https://aticas-backend.onrender.com/api/orders', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                ...(token ? { 'Authorization': token } : {}) 
            },
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

// Initialize cart functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize button handlers
    if (cartContainer) {
        initButtonHandlers();
    }
    
    // Initialize payment method toggle
    if (paymentOptions.length > 0) {
        paymentOptions.forEach(option => {
            option.addEventListener('change', function() {
                if (this.value === 'mpesa') {
                    document.getElementById('mpesaFields').style.display = 'block';
                } else {
                    document.getElementById('mpesaFields').style.display = 'none';
                }
            });
        });
    }
    
    // Initialize form submission
    if (checkoutForm) {
        initCheckoutForm();
    }
    
    // Update cart count on page load
    updateCartCount();
    
    // Initialize cart display if function exists
    if (typeof window.displayCartItems === 'function') {
        window.displayCartItems();
    }
});