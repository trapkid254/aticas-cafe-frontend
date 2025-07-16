document.addEventListener('DOMContentLoaded', () => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        window.location.href = '/admin/admin-login.html';
        return;
    }

    const ordersTableBody = document.getElementById('orders-table-body');
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const closeModalButton = document.querySelector('.close-modal');

    const fetchFromApi = async (endpoint, options = {}) => {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': adminToken
            }
        };
        const response = await fetch(`https://aticas-backend.onrender.com${endpoint}`, { ...defaultOptions, ...options });
        if (!response.ok) throw new Error(`API call to ${endpoint} failed.`);
        return response.json();
    };

    let allOrders = [];

    async function fetchAndDisplayOrders() {
        try {
            const orders = await fetchFromApi('/api/orders');
            orders.sort((a, b) => new Date(b.date) - new Date(a.date));
            allOrders = orders;
            // Do NOT mark all unviewed orders as viewed here
            if (window.updateUnviewedOrdersBadge) window.updateUnviewedOrdersBadge();
            displayOrders(orders);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            ordersTableBody.innerHTML = '<tr><td colspan="7">Failed to load orders.</td></tr>';
        }
    }

    function displayOrders(orders) {
        ordersTableBody.innerHTML = '';
        orders.forEach(order => {
            const row = document.createElement('tr');
            // Status cycling button
            const statusButton = document.createElement('button');
            statusButton.className = 'status-btn';
            statusButton.style = 'padding:0.4rem 1.1rem;border:none;border-radius:6px;font-weight:bold;cursor:pointer;background:#27ae60;color:#fff;transition:background 0.2s;font-size:1rem;';
            statusButton.textContent = order.status.charAt(0).toUpperCase() + order.status.slice(1);
            statusButton.onclick = () => cycleOrderStatus(order._id, order.status);

            // View details button
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Details';
            viewButton.className = 'view-details-btn action-link';
            viewButton.style = 'padding:0.4rem 1.1rem;border:none;border-radius:6px;background:#ffc107;color:#222;font-weight:bold;cursor:pointer;transition:background 0.2s;font-size:1rem;';
            viewButton.onclick = () => showOrderDetails(order);

            row.innerHTML = `
                <td style="font-family:'Courier New',monospace;font-size:0.98rem;color:#222;">${order._id}</td>
                <td style="font-weight:600;">${order.customerName || 'N/A'}</td>
                <td style="color:#888;">${new Date(order.date).toLocaleDateString()}</td>
                <td style="color:#27ae60;font-weight:bold;">Ksh ${order.total.toFixed(2)}</td>
                <td style="color:#222;">${order.paymentMethod ? (order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash') : 'N/A'}</td>
                <td style="color:#888;">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'N/A'}</td>
                <td style="color:#888;">${order.customerPhone || 'N/A'}</td>
                <td></td>
                <td></td>
            `;
            // Place viewButton in the 'View' column and statusButton in the 'Actions' column
            if (row.cells.length >= 9) {
                row.cells[7].appendChild(viewButton); // 'View' column
                row.cells[8].appendChild(statusButton); // 'Actions' column
            } else if (row.cells.length >= 2) {
                // Fallback: append to last two cells
                row.cells[row.cells.length-2].appendChild(viewButton);
                row.cells[row.cells.length-1].appendChild(statusButton);
            }
            row.style.background = '#fff';
            row.style.borderBottom = '1.5px solid #e0e0e0';
            row.onmouseover = () => row.style.background = '#f8f8f8';
            row.onmouseout = () => row.style.background = '#fff';
            ordersTableBody.appendChild(row);
        });
    }

    // Status cycling logic (pending → verifying → completed → cancelled)
    function cycleOrderStatus(orderId, currentStatus) {
        const statuses = ['pending', 'verifying', 'completed', 'cancelled'];
        let idx = statuses.indexOf(currentStatus);
        idx = (idx + 1) % statuses.length;
        const newStatus = statuses[idx];
        updateOrderStatus(orderId, newStatus);
    }

    async function updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetchFromApi(`/api/orders/${orderId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.success) {
                // Show success message
                showToast(`Order status updated to ${newStatus}`, 'success');
                fetchAndDisplayOrders(); // Refresh list
            } else {
                showToast(response.error || 'Failed to update order status', 'error');
            }
        } catch (error) {
            console.error('Failed to update order status:', error);
            showToast('Failed to update order status', 'error');
        }
    }

    // Toast notification function
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        switch(type) {
            case 'success':
                toast.style.backgroundColor = '#27ae60';
                break;
            case 'error':
                toast.style.backgroundColor = '#e74c3c';
                break;
            default:
                toast.style.backgroundColor = '#3498db';
        }
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    async function showOrderDetails(order) {
        const modalBody = document.getElementById('orderDetailsContent');
        // Mark as viewed if not already
        if (!order.viewedByAdmin) {
            try {
                await fetchFromApi(`/api/orders/${order._id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ viewedByAdmin: true })
                });
                if (window.updateUnviewedOrdersBadge) window.updateUnviewedOrdersBadge();
                // Also update local order object so repeated views don't re-trigger
                order.viewedByAdmin = true;
            } catch (err) {
                // Optionally handle error
            }
        }
        let itemsHtml = '<table style="width:100%;margin:1.2rem 0;text-align:left;border-collapse:collapse;">';
        itemsHtml += '<thead><tr style="background:#f8f8f8;"><th style="padding:8px 0;">Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>';
        order.items.forEach(item => {
            const menuItem = item.menuItem;
            if(menuItem) {
                itemsHtml += `<tr><td style="padding:6px 0;">${menuItem.name}</td><td>${item.quantity}</td><td>Ksh ${menuItem.price.toFixed(2)}</td></tr>`;
            }
        });
        itemsHtml += '</tbody></table>';
        modalBody.innerHTML = `
            <div class="receipt" style="background:#fff;border-radius:14px;border:1.5px solid #e0e0e0;box-shadow:0 6px 24px rgba(39,174,96,0.08);padding:2.5rem 2rem 2rem 2rem;width:100%;max-width:540px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;">
                <div class="receipt-header" style="text-align:center;margin-bottom:2.2rem;">
                    <div style="font-family:'UnifrakturCook',cursive;font-size:2.3rem;color:#27ae60;letter-spacing:2px;">Aticas Cafe</div>
                    <div style="font-size:1.1rem;color:#888;margin-top:0.2rem;">Order Details</div>
                    <div style="margin-top:0.7rem;font-size:1rem;"><b>Date:</b> ${new Date(order.date).toLocaleString()}</div>
                    <div style="margin-top:0.2rem;font-size:1rem;"><b>Order ID:</b> ${order._id}</div>
                </div>
                <div class="receipt-body" style="padding:2.2rem 0 1.5rem 0;border-top:1px dashed #b2dfdb;border-bottom:1px dashed #b2dfdb;">
                    <div style="margin-bottom:1.1rem;"><b>Customer:</b> ${order.customerName} (${order.customerPhone})</div>
                    <div style="margin-bottom:1.1rem;"><b>Order Type:</b> ${order.orderType ? order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1) : 'N/A'} &nbsp; | &nbsp; <b>Payment:</b> ${order.paymentMethod ? (order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash') : 'N/A'}</div>
                    <div style="margin-bottom:1.1rem;"><b>Status:</b> <span style="color:#27ae60;font-weight:bold;">${order.status}</span></div>
                    ${order.orderType === 'delivery' && order.deliveryLocation ? `
                        <div style="margin-bottom:1.1rem;padding:1rem;background:#f8f9fa;border-radius:8px;border-left:4px solid #27ae60;">
                            <div style="margin-bottom:0.5rem;"><b><i class="fas fa-map-marker-alt" style="color:#27ae60;"></i> Delivery Location:</b></div>
                            <div style="margin-bottom:0.3rem;"><b>Building:</b> ${order.deliveryLocation.buildingName}</div>
                            <div style="margin-bottom:0.3rem;"><b>Address:</b> ${order.deliveryLocation.streetAddress}</div>
                            ${order.deliveryLocation.additionalInfo ? `<div style="margin-bottom:0.3rem;"><b>Additional Info:</b> ${order.deliveryLocation.additionalInfo}</div>` : ''}
                            <div style="margin-bottom:0.3rem;"><b>Coordinates:</b> ${order.deliveryLocation.coordinates.latitude.toFixed(6)}, ${order.deliveryLocation.coordinates.longitude.toFixed(6)}</div>
                            <div style="margin-top:0.5rem;">
                                <a href="https://www.google.com/maps?q=${order.deliveryLocation.coordinates.latitude},${order.deliveryLocation.coordinates.longitude}" target="_blank" style="color:#27ae60;text-decoration:none;font-weight:bold;">
                                    <i class="fas fa-external-link-alt"></i> View on Google Maps
                                </a>
                            </div>
                        </div>
                    ` : ''}
                    ${itemsHtml}
                    <div style="margin-top:1.3rem;font-size:1.15rem;"><b>Total:</b> <span style="color:#27ae60;">Ksh ${Number(order.total).toLocaleString()}</span></div>
                </div>
                <div class="receipt-footer" style="text-align:center;margin-top:2.2rem;font-size:1rem;color:#888;">
                    Thank you for your order!<br>We appreciate your business.
                </div>
            </div>
        `;
        orderDetailsModal.style.display = 'flex';
    }

    closeModalButton.addEventListener('click', () => {
        orderDetailsModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === orderDetailsModal) {
            orderDetailsModal.style.display = 'none';
        }
    });

    // Filter buttons logic
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const status = btn.getAttribute('data-status');
            let filtered = allOrders;
            if (status !== 'all') {
                filtered = allOrders.filter(order => order.status && order.status.toLowerCase() === status);
            }
            // Sort filtered by date descending
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            displayOrders(filtered);
        });
    });

    fetchAndDisplayOrders();
});