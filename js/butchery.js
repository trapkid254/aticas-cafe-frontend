document.addEventListener('DOMContentLoaded', function() {
    // Load meat items from API
    let meatItems = [];
    const menuContainer = document.getElementById('butcheryItems') || document.getElementById('meatsOfDayContainer');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const priceOptionsModal = document.getElementById('price-options-modal');
    const modalItemName = document.getElementById('modal-item-name');
    const modalPriceOptions = document.getElementById('modal-price-options');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const closeModalBtn = priceOptionsModal?.querySelector('.close-modal');
    const menuSearch = document.getElementById('menuSearch');

    // Cart state
    let cart = JSON.parse(localStorage.getItem('butcheryCart')) || [];
    
    // Initialize
    updateCartCount();
    fetchMeatItems();

    async function fetchMeatItems() {
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/meats');
            if (!res.ok) throw new Error('Failed to fetch meat items');
            meatItems = await res.json();
            displayMenuItems();
        } catch (err) {
            console.error('Error fetching meat items:', err);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.innerHTML = `
                <p>Failed to load meat items. Please try again later.</p>
                <button onclick="window.location.reload()">Retry</button>
            `;
            menuContainer.innerHTML = '';
            menuContainer.appendChild(errorMsg);
        }
    }

    function updateCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        const cartCount = document.getElementById('cartCount');
        if (cartCount) cartCount.textContent = count;
    }

    async function addToCart(meatItem, selectedOption) {
        // Check if already in cart
        const existingItem = cart.find(item => item.id === meatItem._id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: meatItem._id,
                name: meatItem.name,
                price: selectedOption ? selectedOption.price : meatItem.price,
                image: meatItem.image || 'images/placeholder-meat.jpg',
                quantity: 1,
                size: selectedOption ? selectedOption.size : null
            });
        }
        
        localStorage.setItem('butcheryCart', JSON.stringify(cart));
        updateCartCount();
        
        // Show success message
        showToast(`${meatItem.name} added to cart!`);
    }

    // Add search functionality if search input exists
    if (menuSearch) {
        menuSearch.addEventListener('input', (e) => {
            displayMenuItems(document.querySelector('.filter-btn.active')?.dataset.category || 'all', menuSearch.value);
        });
    }

    function displayMenuItems(category = 'all', search = '') {
        if (!menuContainer) return;
        
        menuContainer.innerHTML = '';
        if (!meatItems || meatItems.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-menu-message';
            emptyMsg.innerHTML = `
                <i class="fas fa-drumstick-bite"></i>
                <p>No meat available at the moment. Please check back later.</p>
            `;
            menuContainer.appendChild(emptyMsg);
            return;
        }
        
        // Filter items based on search and category
        let filteredItems = meatItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                                (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
            const matchesCategory = category === 'all' || item.category === category;
            return matchesSearch && matchesCategory;
        });
        
        // Render meat items
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
                <div class="meat-image">
                    <img src="${item.image || 'images/placeholder-meat.jpg'}" alt="${item.name}">
                    <div class="meat-overlay">
                        <button class="add-to-cart-btn" data-id="${item._id}" ${outOfStock ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
                <div class="meat-details">
                    <h3>${item.name}</h3>
                    <p class="meat-description">${item.description || 'Fresh quality meat'}</p>
                    <div class="meat-footer">
                        <span class="price">Ksh ${typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}</span>
                        <span class="quantity ${quantityClass}">${quantityText}</span>
                    </div>
                </div>
            `;
            menuContainer.appendChild(menuItem);
        });
        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.id;
                const item = meatItems.find(i => i._id === itemId);
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

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            priceOptionsModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === priceOptionsModal) {
            priceOptionsModal.style.display = 'none';
        }
    });

    menuSearch.addEventListener('input', function() {
        displayMenuItems(document.querySelector('.filter-btn.active')?.dataset.category || 'all', menuSearch.value);
    });

    fetchMenuItems();

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            displayMenuItems(this.dataset.category);
        });
    });
});

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
