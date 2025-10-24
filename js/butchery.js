document.addEventListener('DOMContentLoaded', function() {
    // Load meat items from API
    let meatItems = [];
    const menuContainer = document.getElementById('butcheryItems') || document.getElementById('meatsOfDayContainer');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const priceOptionsModal = document.getElementById('price-options-modal');
    // Order-by-kg/amount modal (butchery homepage)
    const orderMeatModal = document.getElementById('order-meat-modal');
    const orderMeatTitle = document.getElementById('orderMeatTitle');
    const orderMeatClose = document.getElementById('orderMeatClose');
    const orderByKgBtn = document.getElementById('orderByKgBtn');
    const orderByAmtBtn = document.getElementById('orderByAmtBtn');
    const kgInput = document.getElementById('kgInput');
    const amtInput = document.getElementById('amtInput');
    const pricePerKgLabel = document.getElementById('pricePerKgLabel');
    const calcKg = document.getElementById('calcKg');
    const calcAmt = document.getElementById('calcAmt');
    const confirmOrderMeat = document.getElementById('confirmOrderMeat');
    let currentOrderItem = null;
    let currentPricePerKg = 0;
    const modalItemName = document.getElementById('modal-item-name');
    const modalPriceOptions = document.getElementById('modal-price-options');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const closeModalBtn = priceOptionsModal?.querySelector('.close-modal');
    const menuSearch = document.getElementById('menuSearch');

    // Initialize
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

    // Modal: order by kg or amount
    function openOrderMeatModal(item) {
        if (!orderMeatModal) {
            // No modal available on this page; do nothing (avoid prompts/alerts)
            return;
        }

        currentOrderItem = item;
        currentPricePerKg = Number(item.price) || 0;
        if (orderMeatTitle) orderMeatTitle.textContent = `Order ${item.name}`;
        if (pricePerKgLabel) pricePerKgLabel.textContent = `Ksh ${currentPricePerKg.toLocaleString()}`;
        if (kgInput) kgInput.value = '';
        if (amtInput) amtInput.value = '';
        if (calcKg) calcKg.textContent = '0.00 kg';
        if (calcAmt) calcAmt.textContent = 'Ksh 0';
        orderMeatModal.style.display = 'flex';
    }

    function recalcFromKg() {
        const kg = Math.max(0, Number(kgInput.value || 0));
        const amt = Math.round(kg * currentPricePerKg);
        if (amtInput) amtInput.value = amt ? String(amt) : '';
        if (calcKg) calcKg.textContent = `${kg.toFixed(2)} kg`;
        if (calcAmt) calcAmt.textContent = `Ksh ${amt.toLocaleString()}`;
    }

    function recalcFromAmt() {
        const amt = Math.max(0, Number(amtInput.value || 0));
        const kg = currentPricePerKg ? (amt / currentPricePerKg) : 0;
        if (kgInput) kgInput.value = kg ? kg.toFixed(2) : '';
        if (calcKg) calcKg.textContent = `${kg.toFixed(2)} kg`;
        if (calcAmt) calcAmt.textContent = `Ksh ${amt.toLocaleString()}`;
    }

    // Initialize modal events if present
    if (orderMeatModal) {
        if (orderMeatClose) orderMeatClose.addEventListener('click', () => { orderMeatModal.style.display = 'none'; });
        window.addEventListener('click', (e) => { if (e.target === orderMeatModal) orderMeatModal.style.display = 'none'; });
        if (orderByKgBtn && orderByAmtBtn && kgInput && amtInput) {
            orderByKgBtn.addEventListener('click', () => {
                orderByKgBtn.style.borderColor = '#27ae60'; orderByKgBtn.style.background = '#e8f5e9'; orderByKgBtn.style.color = '#1b5e20';
                orderByAmtBtn.style.borderColor = '#e0e0e0'; orderByAmtBtn.style.background = '#fafafa'; orderByAmtBtn.style.color = '#37474f';
                kgInput.focus();
            });
            orderByAmtBtn.addEventListener('click', () => {
                orderByAmtBtn.style.borderColor = '#27ae60'; orderByAmtBtn.style.background = '#e8f5e9'; orderByAmtBtn.style.color = '#1b5e20';
                orderByKgBtn.style.borderColor = '#e0e0e0'; orderByKgBtn.style.background = '#fafafa'; orderByKgBtn.style.color = '#37474f';
                amtInput.focus();
            });
            kgInput.addEventListener('input', recalcFromKg);
            amtInput.addEventListener('input', recalcFromAmt);
        }
        if (confirmOrderMeat) {
            confirmOrderMeat.addEventListener('click', async () => {
                const kg = Math.max(0, Number(kgInput?.value || 0));
                const amt = Math.max(0, Number(amtInput?.value || 0));
                let finalKg = kg, finalAmt = amt;
                if (!finalKg && finalAmt) finalKg = currentPricePerKg ? (finalAmt / currentPricePerKg) : 0;
                if (!finalAmt && finalKg) finalAmt = Math.round(finalKg * currentPricePerKg);
                if (!finalKg || !finalAmt) { showToast('Please enter kg or amount', 'error'); return; }
                const selected = { size: `${finalKg.toFixed(2)} kg`, price: Math.round(finalAmt) };
                await addToCartApi(currentOrderItem, selected);
                orderMeatModal.style.display = 'none';
                showToast(`${currentOrderItem.name} (${selected.size}) added to cart!`);
                fetchMeatItems();
            });
        }
    }
    }

    // Helper functions from menu.js/cart.js
    function getUserId() {
        const userId = localStorage.getItem('userId');
        if (userId) return userId;

        const token = localStorage.getItem('userToken');
        if (token) {
            try {
                const decoded = JSON.parse(atob(token.split('.')[1]));
                return decoded.userId;
            } catch (err) {
                console.error('Error decoding JWT:', err);
                return null;
            }
        }
        return null;
    }

    async function updateCartCount() {
        console.log('Updating cart count...');
        const cartCountElements = document.querySelectorAll('.cart-count');
        const userId = getUserId();
        const token = localStorage.getItem('userToken');
        let count = 0;

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
                const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
                count = guestCart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
            }
        } catch (error) {
            console.error('Error updating cart count:', error);
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items": []}');
            count = guestCart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
        }

        cartCountElements.forEach(element => {
            if (element) {
                element.textContent = count;
                element.style.display = count > 0 ? 'flex' : 'none';
            }
        });

        return count;
    }

    async function addToCartApi(meatItem, selectedSize = null) {
        const userId = getUserId();
        const isLoggedIn = !!userId;
        const meatItemId = meatItem._id || meatItem.id;
        if (!meatItemId) {
            console.error('Meat item is missing ID:', meatItem);
            showToast('Error: Invalid meat item', 'error');
            return false;
        }

        const itemType = 'Meat';

        if (isLoggedIn) {
            try {
                const cart = await fetchCart();
                let existingItem = null;
                if (cart.items) {
                    existingItem = cart.items.find(item => {
                        const id = (item.menuItem && (item.menuItem._id || item.menuItem.id)) || item.menuItem;
                        const sameId = String(id) === String(meatItemId);
                        const sameType = item.itemType === itemType;
                        const sameSize = (selectedSize && item.selectedSize?.size === selectedSize.size) || (!selectedSize && !item.selectedSize);
                        return sameId && sameType && sameSize;
                    });
                }

                const newQuantity = existingItem ? (existingItem.quantity + 1) : 1;

                const requestBody = {
                    menuItemId: meatItemId,
                    itemType: itemType,
                    quantity: newQuantity,
                    selectedSize: selectedSize || undefined,
                    price: selectedSize ? selectedSize.price : (meatItem.price || 0)
                };
                
                console.log('Adding to cart with data:', requestBody);
                
                const response = await fetch('https://aticas-backend.onrender.com/api/cart/items', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    await updateCartCount();
                    showToast(`${meatItem.name} added to cart!`);
                    return true;
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Failed to add item to cart:', response.status, errorData);
                    showToast('Failed to add item to cart', 'error');
                    return false;
                }
            } catch (err) {
                console.error('Error adding to cart:', err);
                showToast('Error adding to cart', 'error');
                return false;
            }
        } else {
            try {
                let cart = { items: [], total: 0 };
                try {
                    const cartData = localStorage.getItem('guestCart');
                    if (cartData) {
                        cart = JSON.parse(cartData);
                        if (!cart.items) cart.items = [];
                        if (cart.total === undefined) cart.total = 0;
                    }
                } catch (e) {
                    console.error('Error parsing guest cart:', e);
                    cart = { items: [], total: 0 };
                }

                const existingItemIndex = cart.items.findIndex(i => {
                    const itemId = i.menuItem?._id || i.menuItem?.id;
                    const menuItemId = meatItem._id || meatItem.id;
                    return itemId === menuItemId &&
                           i.itemType === itemType &&
                           (selectedSize ? i.selectedSize && i.selectedSize.size === selectedSize.size : !i.selectedSize);
                });

                if (existingItemIndex > -1) {
                    cart.items[existingItemIndex].quantity += 1;
                } else {
                    const newItem = {
                        menuItem: {
                            _id: meatItemId,
                            id: meatItemId,
                            name: meatItem.name,
                            price: selectedSize ? selectedSize.price : (meatItem.price || 0),
                            image: meatItem.image || 'images/meat.jpg',
                            category: meatItem.category
                        },
                        quantity: 1,
                        itemType,
                        selectedSize
                    };
                    console.log('Adding new item to guest cart:', newItem);
                    cart.items.push(newItem);
                }

                cart.total = cart.items.reduce((total, item) => {
                    return total + (item.quantity * (item.selectedSize?.price || item.menuItem?.price || 0));
                }, 0);

                localStorage.setItem('guestCart', JSON.stringify(cart));
                await updateCartCount();
                showToast(`${meatItem.name} added to cart!`);
                return true;
            } catch (err) {
                console.error('Error adding to guest cart:', err);
                showToast('Error adding to cart', 'error');
                return false;
            }
        }
    }

    async function fetchCart() {
        const userId = getUserId();
        if (!userId) return { items: [] };

        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/cart/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken') || ''}`
                }
            });
            if (!res.ok) return { items: [] };
            return await res.json();
        } catch (err) {
            console.error('Error fetching cart:', err);
            return { items: [] };
        }
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
                        <span class="price">Ksh ${typeof item.price === 'number' ? item.price.toFixed(2) : 'N/A'}/kg</span>
                        <span class="quantity ${quantityClass}">${quantityText}</span>
                    </div>
                </div>
            `;
            menuContainer.appendChild(menuItem);
        });
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', async function() {
                const itemId = this.dataset.id;
                const item = meatItems.find(i => i._id === itemId);
                if (!item || item.quantity === 0) {
                    alert('Sorry, this item is out of stock!');
                    return;
                }
                // On butchery homepage, always use kg/amount modal selection
                openOrderMeatModal(item);
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
                await addToCartApi(item, selectedOption);
                showToast(`${item.name} (${selectedOption.size}) added to cart!`);
                priceOptionsModal.style.display = 'none';
                fetchMeatItems();
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

    if (menuSearch) {
        menuSearch.addEventListener('input', function() {
            displayMenuItems(document.querySelector('.filter-btn.active')?.dataset.category || 'all', menuSearch.value);
        });
    }

    fetchMeatItems();

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
