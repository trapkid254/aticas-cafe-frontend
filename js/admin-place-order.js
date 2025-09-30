// Admin Place Order for Customer

document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    const menuItemSelect = document.getElementById('menuItemSelect');
    const menuItemQty = document.getElementById('menuItemQty');
    const addMenuItemBtn = document.getElementById('addMenuItemBtn');
    const orderItemsTable = document.getElementById('orderItemsTable').querySelector('tbody');
    const orderTotalElem = document.getElementById('orderTotal');
    const placeOrderForm = document.getElementById('placeOrderForm');
    const orderSuccess = document.getElementById('orderSuccess');
    const orderError = document.getElementById('orderError');
    const sendMpesaBtn = document.getElementById('sendMpesaBtn');
    const mpesaStatus = document.getElementById('mpesaStatusCard');
    const menuSearch = document.getElementById('menuSearch');

    let menuItems = [];
    let orderItems = [];
    let placedOrder = null;

    function renderMenuOptions(filter = '') {
        const filtered = filter
            ? menuItems.filter(item => item.name.toLowerCase().includes(filter.toLowerCase()))
            : menuItems;
        menuItemSelect.innerHTML = filtered.map(item => `<option value="${item._id}">${item.name} (Ksh ${Number(item.price).toLocaleString()})</option>`).join('');
    }

    menuSearch.addEventListener('input', function() {
        renderMenuOptions(menuSearch.value);
    });

    async function fetchMenuItems() {
        try {
            // For butchery admin, load meats
            const res = await fetch('https://aticas-backend.onrender.com/api/meats');
            menuItems = await res.json();
            renderMenuOptions(menuSearch.value);
        } catch (err) {
            menuItemSelect.innerHTML = '<option disabled>Failed to load menu</option>';
        }
    }

    function renderOrderItems() {
        orderItemsTable.innerHTML = '';
        let total = 0;
        orderItems.forEach((item, idx) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>
                    <button type="button" class="qty-btn" data-idx="${idx}" data-action="minus" style="padding:2px 8px;margin-right:4px;">-</button>
                    <span style="min-width:32px;display:inline-block;text-align:center;">${item.quantity}</span>
                    <button type="button" class="qty-btn" data-idx="${idx}" data-action="plus" style="padding:2px 8px;margin-left:4px;">+</button>
                </td>
                <td>Ksh ${Number(item.price * item.quantity).toLocaleString()}</td>
                <td><button type="button" class="remove-btn" data-idx="${idx}" style="color:#e74c3c;background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-trash"></i></button></td>
            `;
            orderItemsTable.appendChild(row);
            total += item.price * item.quantity;
        });
        orderTotalElem.textContent = `Ksh ${total.toLocaleString()}`;
        // Remove item event
        orderItemsTable.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = function() {
                const idx = parseInt(this.dataset.idx);
                orderItems.splice(idx, 1);
                renderOrderItems();
            };
        });
        // Quantity +/-
        orderItemsTable.querySelectorAll('.qty-btn').forEach(btn => {
            btn.onclick = function() {
                const idx = parseInt(this.dataset.idx);
                const action = this.dataset.action;
                if (action === 'plus') orderItems[idx].quantity++;
                if (action === 'minus' && orderItems[idx].quantity > 1) orderItems[idx].quantity--;
                renderOrderItems();
            };
        });
    }

    addMenuItemBtn.onclick = function() {
        const menuItemId = menuItemSelect.value;
        const qty = parseInt(menuItemQty.value);
        if (!menuItemId || qty < 1) return;
        const menuItem = menuItems.find(i => i._id === menuItemId);
        if (!menuItem) return;
        // If already in order, increase qty
        const existing = orderItems.find(i => i._id === menuItemId);
        if (existing) {
            existing.quantity += qty;
        } else {
            orderItems.push({ _id: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: qty });
        }
        renderOrderItems();
    };

    placeOrderForm.onsubmit = async function(e) {
        e.preventDefault();
        orderError.style.display = 'none';
        if (orderItems.length === 0) {
            orderError.textContent = 'Add at least one menu item.';
            orderError.style.display = 'block';
            return;
        }
        const customerName = document.getElementById('customerName').value.trim();
        const customerPhone = document.getElementById('customerPhone').value.trim();
        // Accept 07, 01, or 2541
        if (!/^((07|01)\d{8}|2541\d{8})$/.test(customerPhone)) {
            orderError.textContent = 'Enter a valid phone number (07XXXXXXXX, 01XXXXXXXX, or 2541XXXXXXXX)';
            orderError.style.display = 'block';
            return;
        }
        if (!customerName || !customerPhone) {
            orderError.textContent = 'Enter customer name and phone.';
            orderError.style.display = 'block';
            return;
        }
        const order = {
            items: orderItems.map(i => ({ itemType: 'Menu', menuItem: i._id, quantity: i.quantity })),
            total: orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
            status: 'pending',
            date: new Date().toISOString(),
            customerName,
            customerPhone
        };
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
                body: JSON.stringify(order)
            });
            const data = await res.json();
            if (data.success) {
                placedOrder = data.order;
                placeOrderForm.style.display = 'none';
                if (order.paymentMethod === 'cash') {
                    window.location.href = 'orders.html';
                } else {
                    orderSuccess.style.display = 'block';
                }
            } else {
                orderError.textContent = data.error || 'Order failed.';
                orderError.style.display = 'block';
            }
        } catch (err) {
            orderError.textContent = 'Order error: ' + err.message;
            orderError.style.display = 'block';
        }
    };

    sendMpesaBtn.onclick = async function() {
        if (!placedOrder) return;
        mpesaStatus.textContent = 'Sending payment request...';
        mpesaStatus.style.color = '#222';
        try {
            const response = await fetch('https://aticas-backend.onrender.com/api/mpesa/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: placedOrder.customerPhone.startsWith('0') ? '254' + placedOrder.customerPhone.slice(1) : placedOrder.customerPhone, amount: placedOrder.total, orderId: placedOrder._id })
            });
            const data = await response.json();
            if (data.ResponseCode === '0') {
                mpesaStatus.textContent = 'M-Pesa push sent. Customer should complete payment on their phone.';
                mpesaStatus.style.color = '#27ae60';
                // Add redirect countdown
                let seconds = 10;
                const redirectMsg = document.createElement('div');
                redirectMsg.style = 'margin-top:1rem;font-size:1.1rem;color:#222;';
                redirectMsg.id = 'redirectMsg';
                mpesaStatus.appendChild(redirectMsg);
                function updateCountdown() {
                    redirectMsg.textContent = `Redirecting to orders in ${seconds} sec...`;
                    if (seconds === 0) {
                        window.location.href = 'orders.html';
                    } else {
                        seconds--;
                        setTimeout(updateCountdown, 1000);
                    }
                }
                updateCountdown();
            } else {
                mpesaStatus.textContent = 'M-Pesa push failed: ' + (data.errorMessage || data.error || 'Unknown error');
                mpesaStatus.style.color = '#e74c3c';
            }
        } catch (err) {
            mpesaStatus.textContent = 'M-Pesa error: ' + err.message;
            mpesaStatus.style.color = '#e74c3c';
        }
    };

    fetchMenuItems();
    renderOrderItems();
}); 