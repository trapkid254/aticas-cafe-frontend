// Load Meals of the Day
function loadMealsOfTheDay() {
    console.log('Loading meals of the day for homepage');
    const meals = JSON.parse(localStorage.getItem('mealsOfDay')) || [];
    const mealsContainer = document.getElementById('meals-of-day');
    
    if (!mealsContainer) {
        console.log('Meals container not found');
        return;
    }

    if (meals.length === 0) {
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
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();
    loadMealsOfTheDay();
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
    const user = getCurrentUser();
    if (!user) {
        showNotification('Please log in to add items to cart.', 'error');
        return;
    }
    await apiPost('/api/cart/item', { userId: user.id, item: { ...item, quantity: 1 } });
    if (typeof updateCartCount === 'function') updateCartCount();
} 