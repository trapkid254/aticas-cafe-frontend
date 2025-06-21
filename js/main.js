// Load Meals of the Day
async function loadMealsOfTheDay() {
    console.log('Loading meals of the day for homepage from API');
    const mealsContainer = document.getElementById('meals-of-day');

    if (!mealsContainer) {
        console.log('Meals container not found');
        return;
    }

    try {
        const meals = await apiGet('/api/mealsOfDay');

        if (!meals || meals.length === 0) {
            mealsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-utensils"></i>
                    <p>No meals of the day available</p>
                </div>
            `;
            return;
        }

        mealsContainer.innerHTML = `
            <div class="meals-grid">
                ${meals.map(meal => `
                    <div class="meal-card">
                        <div class="meal-image">
                            ${meal.image ? `<img src="${meal.image}" alt="${meal.name}">` : 
                            '<div class="no-image"><i class="fas fa-utensils"></i></div>'}
                        </div>
                        <div class="meal-info">
                            <h3>${meal.name}</h3>
                            <p class="price">Ksh ${meal.price.toFixed(2)}</p>
                        </div>
                        <button class="add-to-cart" data-id="${meal.id}">Add to Cart</button>
                    </div>
                `).join('')}
            </div>
        `;

        // After rendering meal cards
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function() {
                const mealId = this.getAttribute('data-id');
                const meal = meals.find(m => m.id === mealId);
                if (meal) {
                    addToCart(meal);
                    showNotification('Added to cart!', 'success');
                }
            });
        });
    } catch (error) {
        console.error("Failed to load meals of the day:", error);
        mealsContainer.innerHTML = '<p class="error-message">Could not load meals. Please try again later.</p>';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // These functions should exist globally if their respective scripts are loaded
    if (typeof loadMenuItems === 'function') loadMenuItems();
    if (typeof loadMealsOfTheDay === 'function') loadMealsOfTheDay();
});

// Helper functions for API
async function apiGet(endpoint) {
    const res = await fetch(endpoint);
    return res.json();
}
async function apiPost(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}
async function apiPut(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Add this function to add an item to the cart and update the cart count
async function addToCart(item) {
    const user = getCurrentUser(); // Assumes getCurrentUser is global (from auth.js)
    if (!user) {
        // This should be a more robust notification system
        alert('Please log in to add items to your cart.'); 
        return;
    }
    
    try {
        await apiPost('/api/cart/item', { userId: user.id, item: { ...item, quantity: 1 } });
        if (typeof updateCartCount === 'function') { // Assumes updateCartCount is global (from navbar.js)
            updateCartCount();
        }
        // This should be a more robust notification system
        alert(`${item.name} added to cart!`);
    } catch (error) {
        console.error("Failed to add to cart:", error);
        alert("There was an error adding the item to your cart.");
    }
}