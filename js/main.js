// A global variable to hold all menu items once fetched
let allMenuItems = [];

// Load and display menu items on the menu page
async function loadMenuItems() {
    const menuContainer = document.getElementById('menu-items');
    if (!menuContainer) {
        // This is not the menu page, so we don't need to do anything.
        return;
    }

    try {
        allMenuItems = await apiGet('/api/menuItems');
        renderMenuItems(allMenuItems);
        setupMenuFilters();
    } catch (error) {
        console.error("Failed to load menu items:", error);
        menuContainer.innerHTML = '<p class="error-message">Could not load menu. Please try again later.</p>';
    }
}

// Render menu items based on a provided array of items
function renderMenuItems(items) {
    const menuContainer = document.getElementById('menu-items');
    if (!menuContainer) return;
    
    if (items.length === 0) {
        menuContainer.innerHTML = '<p>No menu items available for this category.</p>';
        return;
    }
    
    menuContainer.innerHTML = items.map(item => `
        <div class="menu-card" data-category="${item.category || 'uncategorized'}">
            <img src="${item.image || 'images/gbg.jpg'}" alt="${item.name}" class="menu-item-image">
            <div class="menu-item-details">
                <h3 class="menu-item-title">${item.name}</h3>
                <p class="menu-item-price">Ksh ${item.price.toFixed(2)}</p>
                <button class="btn add-to-cart-btn" data-id="${item.id}">Add to Cart</button>
            </div>
        </div>
    `).join('');

    // Re-attach event listeners for the new "Add to Cart" buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.getAttribute('data-id');
            const item = allMenuItems.find(i => i.id === itemId);
            if (item) {
                addToCart(item);
            }
        });
    });
}

// Set up the category filter buttons on the menu page
function setupMenuFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            if (category === 'all') {
                renderMenuItems(allMenuItems);
            } else {
                const filteredItems = allMenuItems.filter(item => item.category === category);
                renderMenuItems(filteredItems);
            }
        });
    });
}

// Load Meals of the Day for the homepage
async function loadMealsOfTheDay() {
    const mealsContainer = document.getElementById('meals-of-day');
    if (!mealsContainer) {
        // Not on the homepage, do nothing
        return;
    }

    try {
        const meals = await apiGet('/api/mealsOfDay');
        if (!meals || meals.length === 0) {
            mealsContainer.innerHTML = '<p>No special meals today. Check our full menu!</p>';
            return;
        }

        mealsContainer.innerHTML = meals.map(meal => `
            <div class="meal-card">
                <img src="${meal.image || 'images/gbg.jpg'}" alt="${meal.name}">
                <div class="meal-info">
                    <h3>${meal.name}</h3>
                    <p class="price">Ksh ${meal.price.toFixed(2)}</p>
                </div>
                <button class="btn add-to-cart-btn" data-id="${meal.id}">Add to Cart</button>
            </div>
        `).join('');
        
        // Add event listeners to the new buttons
        mealsContainer.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', function() {
                const mealId = this.getAttribute('data-id');
                const meal = meals.find(m => m.id === mealId);
                if (meal) {
                    addToCart(meal);
                }
            });
        });

    } catch (error) {
        console.error("Failed to load meals of the day:", error);
        mealsContainer.innerHTML = '<p class="error-message">Could not load meals. Please try again later.</p>';
    }
}

// Add an item to the cart (used by both menu and meals of the day)
async function addToCart(item) {
    const user = getCurrentUser();
    if (!user) {
        showPopup('Please log in to add items to your cart.', 'error');
        return;
    }
    
    try {
        await apiPost('/api/cart/item', { userId: user.id, item: { ...item, quantity: 1 } });
        showPopup(`${item.name} added to cart!`, 'success');
        if (typeof updateCartCount === 'function') {
            updateCartCount();
        }
    } catch (error) {
        console.error("Failed to add to cart:", error);
        showPopup("Error adding item to cart.", 'error');
    }
}

// A generic popup function, if not defined elsewhere
function showPopup(message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => {
        popup.classList.add('show');
        setTimeout(() => {
            popup.remove();
        }, 3000);
    }, 10);
}


// Initialize page based on what elements are present
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems();      // Will only run if it finds #menu-items
    loadMealsOfTheDay();  // Will only run if it finds #meals-of-day
});