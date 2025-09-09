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
    try {
        const userId = getUserId();
        const token = getUserToken();
        let cafeteriaCount = 0;
        let butcheryCount = 0;
        
        if (userId && token) {
            // For logged-in users, fetch from server
            const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Separate counts for butchery and cafeteria items
                data.items?.forEach(item => {
                    const isButchery = item.itemType === 'Meat' || item.itemType === 'meat' || item.itemType === 'butchery';
                    const quantity = item.quantity || 1;
                    if (isButchery) {
                        butcheryCount += quantity;
                    } else {
                        cafeteriaCount += quantity;
                    }
                });
            }
        } else {
            // For guests, count from separate localStorage entries
            const cafeteriaCart = getGuestCart(false);
            const butcheryCart = getGuestCart(true);
            
            cafeteriaCount = cafeteriaCart.items?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;
            butcheryCount = butcheryCart.items?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;
        }
        
        // Update cart counts in the UI
        const updateCounts = (element, count) => {
            if (element) {
                element.textContent = count;
                element.style.display = count > 0 ? 'inline-block' : 'none';
            }
        };
        
        // Update cart indicators if available
        if (window.updateCartIndicators) {
            window.updateCartIndicators();
        } else {
            // Fallback to updating counts directly
            updateCounts(document.querySelector('.cart-count.cafeteria'), cafeteriaCount);
            updateCounts(document.querySelector('.cart-count.butchery'), butcheryCount);
        }
        
        // Return total count for backward compatibility
        return cafeteriaCount + butcheryCount;
    } catch (error) {
        console.error('Error updating cart count:', error);
        return 0;
    }
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
function getGuestCart(isButchery = false) {
    const key = isButchery ? 'butcheryGuestCart' : 'cafeteriaGuestCart';
    const cart = JSON.parse(localStorage.getItem(key) || '{"items":[],"total":0}');
    return cart;
}

function setGuestCart(cart, isButchery = false) {
    const key = isButchery ? 'butcheryGuestCart' : 'cafeteriaGuestCart';
    localStorage.setItem(key, JSON.stringify(cart));
}

// Update or add item in cart
async function updateCartItem(menuItemId, quantity, itemType = 'food', selectedSize = null) {
    try {
        const userId = getUserId();
        const token = getUserToken();
        const isButchery = itemType === 'meat' || itemType === 'butchery';
        
        // Fetch the menu item details
        const menuItem = await fetchMenuItem(menuItemId, isButchery ? 'meat' : 'food');
        if (!menuItem) {
            throw new Error(`Menu item not found: ${menuItemId}`);
        }

        // For logged-in users
        if (userId && token) {
            // For logged-in users, update server cart
            const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    menuItemId,
                    quantity,
                    itemType: isButchery ? 'Meat' : 'Menu',
                    ...(selectedSize && { size: selectedSize })
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update cart');
            }
            
            await updateCartCount();
            return await response.json();
        } else {
            // For guests, update local storage
            const guestCart = getGuestCart(isButchery);
            const existingItemIndex = guestCart.items.findIndex(item => 
                item.menuItem === menuItemId && 
                (item.itemType || 'food') === itemType &&
                (!selectedSize || item.selectedSize?.size === selectedSize)
            );
            
            if (existingItemIndex > -1) {
                // Update existing item quantity
                guestCart.items[existingItemIndex].quantity = quantity;
            } else {
                // Add new item
                guestCart.items.push({
                    menuItem: menuItemId,
                    name: menuItem.name,
                    price: selectedSize?.price || menuItem.price,
                    image: menuItem.image,
                    quantity,
                    itemType,
                    selectedSize
                });
            }
            
            // Recalculate total
            guestCart.total = guestCart.items.reduce((sum, item) => {
                const price = item.selectedSize?.price || item.price || 0;
                return sum + (price * item.quantity);
            }, 0);
            
            setGuestCart(guestCart, isButchery);
            await updateCartCount();
            return guestCart;
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
            const guestCart = getGuestCart(isButchery);
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
            
            setGuestCart(guestCart, isButchery);
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
