// Function to update cart indicators in the navigation bar
document.addEventListener('DOMContentLoaded', function() {
    // Function to update cart indicators
    function updateCartIndicators() {
        // Get cart counts from unified guestCart structure
        const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[],"total":0}');

        // Separate cafeteria and butchery items
        const cafeteriaItems = guestCart.items?.filter(item => {
            const t = String(item.itemType || '').toLowerCase();
            return t !== 'meat' && t !== 'butchery';
        }) || [];

        const butcheryItems = guestCart.items?.filter(item => {
            const t = String(item.itemType || '').toLowerCase();
            return t === 'meat' || t === 'butchery';
        }) || [];

        const cafeteriaCount = cafeteriaItems.reduce((total, item) => total + (item.quantity || 1), 0);
        const butcheryCount = butcheryItems.reduce((total, item) => total + (item.quantity || 1), 0);
        
        // Update all cart indicators
        document.querySelectorAll('.cart-indicator').forEach(indicator => {
            const type = indicator.getAttribute('data-cart-type') || 'cafeteria';
            const count = type === 'butchery' ? butcheryCount : cafeteriaCount;
            
            const countElement = indicator.querySelector('.cart-count') || 
                               document.createElement('span');
            
            if (!indicator.querySelector('.cart-count')) {
                countElement.className = 'cart-count';
                indicator.appendChild(countElement);
            }
            
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'inline-block' : 'none';
        });
    }
    
    // Create cart indicators if they don't exist
    function initializeCartIndicators() {
        const cartIcons = document.querySelectorAll('.cart-icon');
        
        cartIcons.forEach(icon => {
            // Skip if already initialized
            if (icon.querySelector('.cart-indicator')) return;
            
            // Create container for cart indicators
            const container = document.createElement('div');
            container.className = 'cart-indicators';
            container.style.position = 'relative';
            container.style.display = 'inline-block';
            
            // Create butchery indicator (meat icon)
            const butcheryIndicator = document.createElement('span');
            butcheryIndicator.className = 'cart-indicator';
            butcheryIndicator.setAttribute('data-cart-type', 'butchery');
            butcheryIndicator.style.position = 'absolute';
            butcheryIndicator.style.top = '-5px';
            butcheryIndicator.style.right = '-5px';
            butcheryIndicator.innerHTML = '<i class="fas fa-drumstick-bite"></i> <span class="cart-count">0</span>';
            
            // Create cafeteria indicator (utensils icon)
            const cafeteriaIndicator = document.createElement('span');
            cafeteriaIndicator.className = 'cart-indicator';
            cafeteriaIndicator.setAttribute('data-cart-type', 'cafeteria');
            cafeteriaIndicator.style.position = 'absolute';
            cafeteriaIndicator.style.bottom = '-5px';
            cafeteriaIndicator.style.right = '-5px';
            cafeteriaIndicator.innerHTML = '<i class="fas fa-utensils"></i> <span class="cart-count">0</span>';
            
            // Add indicators to container
            container.appendChild(butcheryIndicator);
            container.appendChild(cafeteriaIndicator);
            
            // Replace the cart count with our new indicators
            const oldCount = icon.querySelector('.cart-count');
            if (oldCount) {
                icon.removeChild(oldCount);
            }
            
            // Add the container after the cart icon
            const cartIcon = icon.querySelector('i') || icon;
            icon.insertBefore(container, cartIcon.nextSibling);
        });
    }
    
    // Initialize and update indicators
    initializeCartIndicators();
    updateCartIndicators();
    
    // Listen for storage events to update indicators when cart changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'guestCart') {
            updateCartIndicators();
        }
    });
    
    // Make the function available globally
    window.updateCartIndicators = updateCartIndicators;
});
