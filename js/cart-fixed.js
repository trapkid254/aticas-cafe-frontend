// Core cart functions
async function fetchMenuItem(menuItemId, itemType = 'food') {
    try {
        const endpoint = itemType === 'meat' 
            ? `https://aticas-backend.onrender.com/api/meats/${menuItemId}`
            : `/api/menu/${menuItemId}`;
        const response = await fetch(endpoint);
        return response.ok ? await response.json() : null;
    } catch (error) {
        console.error(`Error fetching ${itemType} item:`, error);
        return null;
    }
}

// Update cart item quantity
async function updateCartItem(menuItemId, quantity, itemType = 'food', selectedSize = null) {
    try {
        // For butchery items
        if (itemType === 'meat') {
            const response = await fetch('https://aticas-backend.onrender.com/api/butchery/cart/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
                },
                body: JSON.stringify({ menuItemId, quantity, size: selectedSize?.size })
            });
            if (!response.ok) throw new Error('Failed to update butchery cart');
            const result = await response.json();
            updateCartCount();
            return result;
        }

        // For cafeteria items
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('userToken');
        
        if (userId && token) {
            const response = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}/items`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ menuItemId, quantity, itemType, selectedSize })
            });
            if (!response.ok) throw new Error('Failed to update cart');
            const result = await response.json();
            updateCartCount();
            return result;
        } else {
            // Guest cart logic
            const cart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[],"total":0}');
            const itemIndex = cart.items.findIndex(item => 
                item.menuItem === menuItemId && 
                item.itemType === itemType &&
                JSON.stringify(item.selectedSize) === JSON.stringify(selectedSize)
            );
            
            if (itemIndex !== -1) {
                if (quantity <= 0) cart.items.splice(itemIndex, 1);
                else cart.items[itemIndex].quantity = quantity;
            } else if (quantity > 0) {
                const menuItem = await fetchMenuItem(menuItemId, itemType);
                if (menuItem) {
                    cart.items.push({
                        menuItem: menuItemId,
                        itemType,
                        quantity,
                        selectedSize,
                        name: menuItem.name,
                        price: selectedSize ? selectedSize.price : menuItem.price,
                        image: menuItem.image,
                        menuItem: menuItem
                    });
                }
            }
            
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            localStorage.setItem('guestCart', JSON.stringify(cart));
            updateCartCount();
            return cart;
        }
    } catch (error) {
        console.error('Error updating cart:', error);
        throw error;
    }
}

// Update cart count in UI
async function updateCartCount() {
    const cartCountElements = document.querySelectorAll('.cart-count');
    if (!cartCountElements.length) return;

    let count = 0;
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('userToken');
    
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
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
            count = guestCart.items.reduce((total, item) => total + item.quantity, 0);
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
    
    cartCountElements.forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'inline-block' : 'none';
    });
}

// Initialize cart functionality
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    
    // Handle cart button clicks
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.add-to-cart');
        if (btn) {
            const itemId = btn.dataset.id;
            const itemType = btn.dataset.type || 'food';
            const sizeSelect = document.querySelector(`select[data-id="${itemId}"]`);
            const selectedSize = sizeSelect ? 
                JSON.parse(sizeSelect.options[sizeSelect.selectedIndex].value) : null;
            
            try {
                await updateCartItem(itemId, 1, itemType, selectedSize);
                // Show success message
                const toast = document.createElement('div');
                toast.className = 'toast';
                toast.textContent = 'Item added to cart';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            } catch (error) {
                console.error('Error adding to cart:', error);
                alert('Failed to add item to cart. Please try again.');
            }
        }
    });
});
