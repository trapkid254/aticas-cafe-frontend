document.addEventListener('DOMContentLoaded', function() {
    const meatsContainer = document.getElementById('meatsOfDayContainer');
    
    // Function to fetch meats of the day from the API
    async function fetchMeatsOfDay() {
        try {
            const response = await fetch('https://aticas-backend.onrender.com/api/meats');
            if (!response.ok) {
                throw new Error('Failed to fetch meats of the day');
            }
            const meats = await response.json();
            return meats;
        } catch (error) {
            console.error('Error fetching meats of the day:', error);
            return [];
        }
    }

    // Function to render meats of the day
    function renderMeats(meats) {
        if (!meats || meats.length === 0) {
            meatsContainer.innerHTML = `
                <div class="no-meats">
                    <p>No meats available at the moment. Please check back later.</p>
                </div>
            `;
            return;
        }

        meatsContainer.innerHTML = meats.map(meat => `
            <div class="meat-item" data-id="${meat._id}">
                <div class="meat-image">
                    <img src="${meat.image}" alt="${meat.name}" onerror="this.src='images/placeholder-meat.jpg'">
                </div>
                <div class="meat-details">
                    <h3>${meat.name}</h3>
                    ${meat.description ? `<p class="meat-description">${meat.description}</p>` : ''}
                    <div class="meat-price">
                        KES ${meat.price.toFixed(2)}
                    </div>
                    <button class="add-to-cart-btn" data-meat='${JSON.stringify(meat).replace(/'/g, "'")}'>
                        Add to Cart
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to all add to cart buttons
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', function() {
                const meat = JSON.parse(this.getAttribute('data-meat'));
                addMeatToCart(meat);
            });
        });
    }

    // Function to add meat to cart
    async function addMeatToCart(meat) {
        try {
            // Ensure department context is butchery
            try { localStorage.setItem('cartDepartment', 'butchery'); } catch (_) {}

            // Prepare meat payload with explicit type hints for global addToCart
            const meatItem = {
                ...meat,
                type: 'meat',          // hint for isButchery detection
                itemType: 'butchery'    // additional hint
            };

            // Prefer global addToCart (from script.js)
            if (window.addToCart) {
                await window.addToCart(meatItem, 1);
                showToast(`${meat.name} added to cart!`);
            } else {
                // Fallback to direct API call if addToCart is not available
                const userId = localStorage.getItem('userId');
                const userToken = localStorage.getItem('userToken');
                
                if (userId && userToken) {
                    // For logged-in users use authenticated PATCH endpoint
                    const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${userToken}`
                        },
                        body: JSON.stringify({
                            menuItemId: meat._id,
                            quantity: 1,
                            itemType: 'Meat'
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to add to cart');
                    }

                    // Update cart count
                    if (window.updateCartCount) {
                        await window.updateCartCount();
                    }
                    
                    showToast(`${meat.name} added to cart!`);
                } else {
                    // For guests
                    let cart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
                    const existingItemIndex = cart.items.findIndex(item => 
                        item.menuItem._id === meat._id && (item.itemType === 'Meat' || item.itemType === 'butchery' || item.itemType === 'meat')
                    );

                    if (existingItemIndex > -1) {
                        cart.items[existingItemIndex].quantity += 1;
                    } else {
                        cart.items.push({
                            menuItem: meat,
                            quantity: 1,
                            itemType: 'Meat'
                        });
                    }
                    
                    localStorage.setItem('guestCart', JSON.stringify(cart));
                    
                    // Update cart count if function exists
                    if (window.updateCartCount) {
                        await window.updateCartCount();
                    }
                    
                    showToast(`${meat.name} added to cart!`);
                }
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Failed to add to cart. Please try again.', 'error');
        }
    }

    // Toast notification function
    function showToast(message, type = 'success') {
        if (window.showToast) {
            window.showToast(message, type);
            return;
        }
        
        // Fallback toast implementation
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }, 100);
    }

    // Initialize the page
    async function init() {
        const meats = await fetchMeatsOfDay();
        renderMeats(meats);
    }

    init();
});
