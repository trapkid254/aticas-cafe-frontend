document.addEventListener('DOMContentLoaded', function() {
    // Load menu items from API
    let menuItems = [];
    const menuContainer = document.getElementById('menuItems');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const priceOptionsModal = document.getElementById('price-options-modal');
    const modalItemName = document.getElementById('modal-item-name');
    const modalPriceOptions = document.getElementById('modal-price-options');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const closeModalBtn = priceOptionsModal.querySelector('.close-modal');

    async function fetchMenuItems() {
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/menu');
            menuItems = await res.json();
            displayMenuItems();
        } catch (err) {
            menuContainer.innerHTML = '<div class="empty-menu-message">Failed to load menu items.</div>';
        }
    }

    function getUserIdFromToken() {
        return localStorage.getItem('userId');
    }

    async function fetchCart() {
        const userId = getUserIdFromToken();
        if (!userId) return [];
        const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
            headers: { 'Authorization': localStorage.getItem('userToken') || '' }
        });
        if (!res.ok) return [];
        return await res.json();
    }

    async function addToCartApi(menuItem, selectedSize = null) {
        const userId = getUserIdFromToken();
        const userToken = localStorage.getItem('userToken');

        if (userId && userToken) {
            const menuItemId = menuItem._id;
            const itemType = menuItem.category ? 'Menu' : 'MealOfDay';
            try {
                await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': userToken
                    },
                    body: JSON.stringify({
                        menuItemId: menuItemId,
                        quantity: 1,
                        itemType,
                        selectedSize
                    })
                });
                // Update cart count after successful addition
                if (window.updateCartCount) await window.updateCartCount();
            } catch (err) {
                console.error('Error adding to cart:', err);
            }
        } else {
            let cart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
            const itemType = menuItem.category ? 'Menu' : 'MealOfDay';
            const existingItemIndex = cart.items.findIndex(i =>
                i.menuItem._id === menuItem._id &&
                i.itemType === itemType &&
                (selectedSize ? i.selectedSize && i.selectedSize.size === selectedSize.size : !i.selectedSize)
            );

            if (existingItemIndex > -1) {
                cart.items[existingItemIndex].quantity += 1;
            } else {
                cart.items.push({
                    menuItem: menuItem,
                    quantity: 1,
                    itemType,
                    selectedSize
                });
            }
            localStorage.setItem('guestCart', JSON.stringify(cart));
            // Update cart count after successful addition
            if (window.updateCartCount) await window.updateCartCount();
        }
    }

    const menuSection = document.querySelector('.menu-section');
    const searchDiv = document.createElement('div');
    searchDiv.style = 'margin-bottom:1.5rem;text-align:center;';
    searchDiv.innerHTML = '<input type="text" id="menuSearch" placeholder="Search menu..." style="width:60%;max-width:340px;padding:0.7rem 1rem;border-radius:6px;border:1.5px solid #27ae60;font-size:1.1rem;">';
    menuSection.insertBefore(searchDiv, menuSection.children[1]);
    const menuSearch = document.getElementById('menuSearch');

    function displayMenuItems(category = 'all', search = '') {
        menuContainer.innerHTML = '';
        if (!menuItems || menuItems.length === 0) {
            menuContainer.innerHTML = '<div class="empty-menu-message">No menu items available. Please check back later.</div>';
            return;
        }
        let filteredItems = category === 'all' 
            ? menuItems 
            : menuItems.filter(item => item.category === category);
        if (search) {
            filteredItems = filteredItems.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
        }
        filteredItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.className = 'menu-item';
            menuItem.dataset.category = item.category;
            const outOfStock = item.quantity === 0;
            const lowStock = item.quantity > 0 && item.quantity <= 3;
            const hasPriceOptions = item.priceOptions && item.priceOptions.length > 0;

            let priceDisplay = `Ksh ${Number(item.price).toLocaleString()}`;
            if (hasPriceOptions) {
                const prices = item.priceOptions.map(p => Number(p.price));
                priceDisplay = `From Ksh ${Number(Math.min(...prices)).toLocaleString()}`;
            }

            let quantityClass = '';
            let quantityText = `Available: ${item.quantity ?? 0}`;

            if (outOfStock) {
                quantityClass = 'out-of-stock';
                quantityText = 'Out of Stock';
            } else if (lowStock) {
                quantityClass = 'low-stock';
                quantityText = `Low Stock: ${item.quantity}`;
            }

            menuItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <div class="menu-item-details">
                    <h3>${item.name}</h3>
                    <p class="menu-qty ${quantityClass}">${quantityText}</p>
                    <span class="price">${priceDisplay}</span>
                    <button class="add-to-cart" data-id="${item._id}" ${outOfStock ? 'disabled style="background:#ccc;cursor:not-allowed;"' : ''}>
                        ${outOfStock ? 'Out of Stock' : (hasPriceOptions ? 'Select Option' : 'Add to Cart')}
                    </button>
                </div>
            `;
            menuContainer.appendChild(menuItem);
        });
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.id;
                const item = menuItems.find(i => i._id === itemId);
                if (!item || item.quantity === 0) {
                    alert('Sorry, this item is out of stock!');
                    return;
                }
                if (item.priceOptions && item.priceOptions.length > 0) {
                    openPriceOptionsModal(item);
                } else {
                    await addToCartApi(item);
                    showToast(`${item.name} added to cart!`);
                    fetchMenuItems();
                }
            });
        });
    }

    function openPriceOptionsModal(item) {
        modalItemName.textContent = item.name;
        modalPriceOptions.innerHTML = '';

        item.priceOptions.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'price-option';
            optionEl.innerHTML = `
                <label>
                    <input type="radio" name="price-option" value="${option.size}" data-price="${option.price}">
                    ${option.size} - <strong>Ksh ${Number(option.price).toLocaleString()}</strong>
                </label>
            `;
            modalPriceOptions.appendChild(optionEl);
        });

        if (modalPriceOptions.querySelector('input')) {
            modalPriceOptions.querySelector('input').checked = true;
        }

        modalAddToCartBtn.onclick = async () => {
            const selectedOptionEl = modalPriceOptions.querySelector('input[name="price-option"]:checked');
            if (selectedOptionEl) {
                const selectedSizeValue = selectedOptionEl.value;
                const selectedOption = item.priceOptions.find(p => p.size === selectedSizeValue);
                const updatedItem = { ...item, price: selectedOption.price };
                await addToCartApi(updatedItem, selectedOption);
                showToast(`${item.name} (${selectedOption.size}) added to cart!`);
                priceOptionsModal.style.display = 'none';
                fetchMenuItems();
            }
        };

        priceOptionsModal.style.display = 'flex';
    }

    closeModalBtn.addEventListener('click', () => {
        priceOptionsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === priceOptionsModal) {
            priceOptionsModal.style.display = 'none';
        }
    });

    menuSearch.addEventListener('input', function() {
        displayMenuItems(document.querySelector('.filter-btn.active')?.dataset.category || 'all', menuSearch.value);
    });

    fetchMenuItems();
    if (window.updateCartCount) window.updateCartCount();

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            displayMenuItems(this.dataset.category);
        });
    });
});

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => {
        toast.className = 'toast';
    }, 2000);
}
