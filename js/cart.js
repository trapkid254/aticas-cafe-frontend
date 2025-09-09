// Fetch menu item details
async function fetchMenuItem(menuItemId, itemType = 'food') {
    try {
        // Validate menuItemId
        if (!menuItemId) {
            return null;
        }

        // Convert to string and validate format (MongoDB ObjectId should be 24 hex characters)
        const itemIdStr = String(menuItemId);
        if (itemIdStr.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(itemIdStr)) {
            return null;
        }

        const baseUrl = 'https://aticas-backend.onrender.com';
        const endpoint = itemType === 'meat' || itemType === 'butchery'
            ? `${baseUrl}/api/meats/${itemIdStr}`
            : `${baseUrl}/api/menu/${itemIdStr}`;
        
        const response = await fetch(endpoint);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error(`Failed to fetch ${itemType} item`);
        }
        
        return await response.json();
    } catch (error) {
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
    console.log('Updating cart count...');
    const cartCountElements = document.querySelectorAll('.cart-count');
    const userId = getUserId();
    const token = getUserToken();
    let count = 0;

    try {
        if (userId && token) {
            const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const cart = await response.json();
                count = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
            }
        } else {
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
            count = guestCart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
        count = guestCart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
    }

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
    localStorage.setItem('guestCart', JSON.stringify(cart));
}

// Update or add item in cart
async function updateCartItem(menuItemId, quantity, itemType = 'food', selectedSize = null) {
    console.log('Updating cart item:', { menuItemId, quantity, itemType, selectedSize });
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
                        quantity,
                        itemType: isButchery ? 'Meat' : 'Menu',
                        selectedSize,
                        name: menuItem.name,
                        price: selectedSize ? selectedSize.price : menuItem.price,
                        image: menuItem.image
                    });
                } else {
                    console.error(`updateCartItem: Failed to fetch menu item with ID: ${menuItemId}`);
                    throw new Error(`Menu item not found: ${menuItemId}`);
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
function initButtonHandlers() {
    const cartContainer = document.querySelector('.cart-items');
    if (!cartContainer) return;

    cartContainer.addEventListener('click', async function(e) {
        const button = e.target.closest('.quantity-btn') || e.target.closest('.remove-btn');
        if (!button) return;

        const itemId = button.dataset.id;
        const itemType = button.dataset.type;
        const itemSize = button.dataset.size || null;
        const selectedSize = itemSize ? { size: itemSize } : null;
        
        const cart = getGuestCart();
        const item = cart.items.find(i => 
            i.menuItem === itemId && 
            i.itemType === itemType &&
            (!selectedSize || JSON.stringify(i.selectedSize) === JSON.stringify(selectedSize))
        );

        if (!item) return;

        try {
            if (button.classList.contains('remove-btn')) {
                await updateCartItem(itemId, 0, itemType, selectedSize);
            } 
            else if (button.classList.contains('minus')) {
                const newQty = item.quantity - 1;
                await updateCartItem(itemId, newQty, itemType, selectedSize);
            } 
            else if (button.classList.contains('plus')) {
                await updateCartItem(itemId, item.quantity + 1, itemType, selectedSize);
            }
            
            // Refresh cart display
            if (window.displayCartItems) {
                await window.displayCartItems();
            }
            updateCartCount();
        } catch (error) {
            console.error('Error updating cart:', error);
            alert('Failed to update cart. Please try again.');
        }
    });
}

// Remove item from cart
async function removeCartItem(menuItemId, itemType = 'food', size = null) {
    console.log('Removing item from cart:', { menuItemId, itemType, size });
    
    try {
        const userId = getUserId();
        const token = getUserToken();
        const isButchery = itemType === 'meat' || itemType === 'butchery';
        
        // For logged-in users
        if (userId && token) {
            // For logged-in users
            const response = await fetch(`https://aticas-backend.onrender.com/api/cart/items/${menuItemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    itemType: isButchery ? 'Meat' : 'Menu',
                    size: size || undefined
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove item from cart');
            }
            
            await updateCartCount();
            return await response.json();
        } else {
            // For guests
            const guestCart = getGuestCart();
            guestCart.items = guestCart.items.filter(item => 
                !(item.menuItem === menuItemId && 
                  (item.itemType || 'food') === itemType &&
                  (!size || item.selectedSize?.size === size)
                )
            );
            
            // Recalculate total
            guestCart.total = guestCart.items.reduce((sum, item) => {
                const price = item.selectedSize?.price || item.price || 0;
                return sum + (price * item.quantity);
            }, 0);
            
            setGuestCart(guestCart);
            await updateCartCount();
            return guestCart;
        }
    } catch (error) {
        console.error('Error removing item from cart:', error);
        throw error;
    }
}

// Make function available globally
window.removeCartItem = removeCartItem;

// Initialize cart functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize button handlers
    initButtonHandlers();
    
    // Update cart count on page load
    await updateCartCount();
    
    // If there's a displayCartItems function, call it
    if (typeof window.displayCartItems === 'function') {
        await window.displayCartItems();
    }
});
