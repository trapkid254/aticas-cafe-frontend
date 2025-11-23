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
        const lowerType = String(itemType || '').toLowerCase();
        let endpoint;
        if (lowerType === 'meat' || lowerType === 'butchery') {
            endpoint = `${baseUrl}/api/meats/${itemIdStr}`;
        } else if (lowerType === 'mealofday' || lowerType === 'mod' || lowerType === 'meal of day') {
            endpoint = `${baseUrl}/api/meals/${itemIdStr}`;
        } else {
            endpoint = `${baseUrl}/api/menu/${itemIdStr}`;
        }
        
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
            // For logged-in users, fetch cart by userId (backend route is /api/cart/:userId)
            const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
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
    const raw = localStorage.getItem('guestCart') || '{"items":[],"total":0}';
    let fullCart;
    try {
        fullCart = JSON.parse(raw);
    } catch (e) {
        fullCart = { items: [], total: 0 };
    }

    const predicate = (item) => {
        const t = String(item.itemType || '').toLowerCase();
        const isMeat = t === 'meat' || t === 'butchery';
        return isButchery ? isMeat : !isMeat;
    };

    const items = Array.isArray(fullCart.items) ? fullCart.items.filter(predicate) : [];
    const total = items.reduce((sum, item) => {
        const price = item.selectedSize?.price || item.price || item.menuItem?.price || 0;
        return sum + (price * (item.quantity || 1));
    }, 0);

    return { items, total };
}

function setGuestCart(filteredCart, isButchery = false) {
    // Merge changes for the specific subset back into the unified guestCart
    const raw = localStorage.getItem('guestCart') || '{"items":[],"total":0}';
    let fullCart;
    try {
        fullCart = JSON.parse(raw);
    } catch (e) {
        fullCart = { items: [], total: 0 };
    }

    const predicate = (item) => {
        const t = String(item.itemType || '').toLowerCase();
        const isMeat = t === 'meat' || t === 'butchery';
        return isButchery ? isMeat : !isMeat;
    };

    const otherItems = (fullCart.items || []).filter(item => !predicate(item));
    const mergedItems = otherItems.concat(filteredCart.items || []);
    const total = mergedItems.reduce((sum, item) => {
        const price = item.selectedSize?.price || item.price || item.menuItem?.price || 0;
        return sum + (price * (item.quantity || 1));
    }, 0);

    localStorage.setItem('guestCart', JSON.stringify({ items: mergedItems, total }));
}

// Update or add item in cart
async function updateCartItem(menuItemId, quantity, itemType = 'food', selectedSize = null) {
        try {
        const userId = getUserId();
        const token = getUserToken();
        const normalizedType = String(itemType || '').toLowerCase();
        const isButchery = normalizedType === 'meat' || normalizedType === 'butchery';
        const isMealOfDay = normalizedType === 'mealofday' || normalizedType === 'mod' || normalizedType === 'meal of day';

        // For logged-in users
        if (userId && token) {
            // For logged-in users, update server cart (backend expects PATCH /api/cart/items)
            const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    menuItemId,
                    quantity,
                    itemType: isButchery ? 'Meat' : (isMealOfDay ? 'MealOfDay' : 'Menu'),
                    ...(selectedSize && { selectedSize })
                })
            });
            
            if (!response.ok) {
                let msg = 'Failed to update cart';
                try { msg += `: ${response.status} ${await response.text()}`; } catch (e) {}
                throw new Error(msg);
            }
            
            await updateCartCount();
            return await response.json();
        } else {
            // For guests, update local storage
            const guestCart = getGuestCart(isButchery);
            const existingItemIndex = guestCart.items.findIndex(item => {
                const itemId = typeof item.menuItem === 'object' ? (item.menuItem._id || item.menuItem.id) : item.menuItem;
                const sameId = String(itemId) === String(menuItemId);
                const sameType = String(item.itemType || 'food').toLowerCase() === normalizedType;
                const sameSize = !selectedSize || item.selectedSize?.size === selectedSize?.size || item.selectedSize?.size === selectedSize;
                return sameId && sameType && sameSize;
            });
            
            if (existingItemIndex > -1) {
                // Update existing item quantity
                guestCart.items[existingItemIndex].quantity = quantity;
                if (quantity === 0) {
                    guestCart.items.splice(existingItemIndex, 1);
                }
            } else {
                // Add new item - fetch details only for guests when needed
                const fetched = await fetchMenuItem(menuItemId, isButchery ? 'meat' : (isMealOfDay ? 'mealofday' : 'food'));
                if (!fetched) {
                    console.warn('Guest add: missing menuItem details, using fallback for', menuItemId);
                }
                const menuObj = fetched ? {
                    _id: fetched._id || menuItemId,
                    id: fetched.id,
                    name: fetched.name,
                    price: fetched.price,
                    image: fetched.image,
                    category: fetched.category
                } : {
                    _id: menuItemId
                };
                guestCart.items.push({
                    menuItem: menuObj,
                    name: fetched?.name, // optional top-level for backward compatibility
                    price: selectedSize?.price || fetched?.price,
                    image: fetched?.image,
                    quantity,
                    itemType: isButchery ? 'butchery' : (isMealOfDay ? 'MealOfDay' : 'Menu'),
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
        const normalizedType = String(itemType || '').toLowerCase();
        const isButchery = normalizedType === 'meat' || normalizedType === 'butchery';
        const isMealOfDay = normalizedType === 'mealofday' || normalizedType === 'mod' || normalizedType === 'meal of day';
        
        // For logged-in users
        if (userId && token) {
            // Use PATCH with quantity 0 so backend matches by selectedSize when provided
            const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    menuItemId,
                    quantity: 0,
                    itemType: isButchery ? 'Meat' : (isMealOfDay ? 'MealOfDay' : 'Menu'),
                    ...(size && { selectedSize: { size } })
                })
            });
            
            if (!response.ok) {
                let msg = 'Failed to remove item from cart';
                try { msg += `: ${response.status} ${await response.text()}`; } catch (e) {}
                throw new Error(msg);
            }
            
            await updateCartCount();
            return await response.json();
        } else {
            // For guests
            const guestCart = getGuestCart(isButchery);
            guestCart.items = guestCart.items.filter(item => {
                const itemId = typeof item.menuItem === 'object' ? (item.menuItem._id || item.menuItem.id) : item.menuItem;
                const sameId = String(itemId) === String(menuItemId);
                const itemTypeNormalized = String(item.itemType || 'food').toLowerCase();
                const sameType = itemTypeNormalized === normalizedType || (
                    // treat 'butchery' and 'meat' equivalently
                    (['butchery','meat'].includes(itemTypeNormalized) && ['butchery','meat'].includes(normalizedType))
                );
                const sameSize = !size || item.selectedSize?.size === size;
                // keep item if NOT the one to delete
                return !(sameId && sameType && sameSize);
            });
            
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
