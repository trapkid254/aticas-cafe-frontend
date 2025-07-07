document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');

    if (!adminToken) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('isAdminLoggedIn'); // For legacy compatibility
            window.location.href = 'admin-login.html';
        });
    }

    // Chart instances
    let revenueChart = null;
    let topSellingChart = null;

    // --- API Fetch Functions ---
    const fetchFromApi = async (endpoint) => {
        const response = await fetch(`https://aticas-backend.onrender.com${endpoint}`, {
            headers: { 'Authorization': adminToken }
        });
        if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`);
        return response.json();
    };

    // --- Dashboard Update Functions ---
    async function updateDashboardData() {
        try {
            const [orders, menuItems, mealsToday] = await Promise.all([
                fetchFromApi('/api/orders'),
                fetchFromApi('/api/menu'),
                fetchFromApi('/api/meals')
            ]);

            const totalOrdersElem = document.getElementById('totalOrders');
            if (totalOrdersElem) totalOrdersElem.textContent = orders.length;
            const totalRevenueElem = document.getElementById('totalRevenue');
            if (totalRevenueElem) totalRevenueElem.textContent = `Ksh ${orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}`;
            const totalMenuItemsElem = document.getElementById('totalMenuItems');
            if (totalMenuItemsElem) totalMenuItemsElem.textContent = menuItems.length;
            const mealsTodayElem = document.getElementById('mealsToday');
            if (mealsTodayElem) mealsTodayElem.textContent = mealsToday.length;

            renderRecentOrders(orders.slice(0, 5));
            renderTopSellingChart(orders, menuItems);
            renderRevenueChart(orders);

        } catch (error) {
            console.error('Failed to update dashboard data:', error);
            // You could display an error message to the user here
        }
    }

    function renderRecentOrders(orders) {
        const recentOrdersList = document.getElementById('recentOrdersList');
        if (!recentOrdersList) return;
        recentOrdersList.innerHTML = '';
        orders.forEach(order => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>Order #${order._id.substring(0, 8)}</span>
                <span>${order.customerName}</span>
                <span class="status-${order.status}">${order.status}</span>
            `;
            recentOrdersList.appendChild(li);
        });
    }

    function renderTopSellingChart(orders, menuItems) {
        const ctx = document.getElementById('topSellingChart');
        if (!ctx) return;

        const itemSales = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const id = item.menuItem?._id || item.menuItem;
                if(id) {
                    itemSales[id] = (itemSales[id] || 0) + item.quantity;
                }
            });
        });

        const sortedItems = Object.entries(itemSales).sort(([, a], [, b]) => b - a).slice(0, 5);

        const labels = sortedItems.map(([id, _]) => {
            const menuItem = menuItems.find(item => item._id === id);
            return menuItem ? menuItem.name : 'Unknown';
        });
        const data = sortedItems.map(([_, quantity]) => quantity);

        if (topSellingChart) topSellingChart.destroy();
        topSellingChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity Sold',
                    data: data,
                    backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c', '#9b59b6'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function renderRevenueChart(orders) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const monthlyRevenue = {};
        orders.forEach(order => {
            const month = new Date(order.date).toLocaleString('default', { month: 'long' });
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total;
        });

        const labels = Object.keys(monthlyRevenue);
        const data = Object.values(monthlyRevenue);

        if (revenueChart) revenueChart.destroy();
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue per Month',
                    data: data,
                    borderColor: '#3498db',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // Quick Actions buttons
    const addMealBtn = document.getElementById('addMealBtn');
    const updateMealsBtn = document.getElementById('updateMealsBtn');
    const viewOrdersBtn = document.getElementById('viewOrdersBtn');

    if (addMealBtn) {
        addMealBtn.addEventListener('click', function() {
            const addMealModal = document.getElementById('addMealModal');
            if (addMealModal) addMealModal.style.display = 'flex';
        });
    }
    if (updateMealsBtn) {
        updateMealsBtn.addEventListener('click', function() {
            window.location.href = 'menu-management.html#meals-of-the-day';
        });
    }
    if (viewOrdersBtn) {
        viewOrdersBtn.addEventListener('click', function() {
            window.location.href = 'orders.html';
        });
    }

    // --- Add Meal Modal: Edit and Remove Logic ---
    const addMealForm = document.getElementById('addMealForm');
    if (addMealForm) {
        addMealForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            // Gather form data
            const meal = {
                name: document.getElementById('mealName').value,
                description: document.getElementById('mealDescription').value,
                price: parseFloat(document.getElementById('mealPrice').value),
                category: document.getElementById('mealCategory').value,
                image: document.getElementById('mealImage').value
            };
            // If editing, update; else, add new
            let method = 'POST', url = 'https://aticas-backend.onrender.com/api/menu';
            if (addMealForm.dataset.editing === 'true') {
                method = 'PUT';
                url += '/' + addMealForm.dataset.mealId;
            }
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('adminToken') || '' },
                body: JSON.stringify(meal)
            });
            if (res.ok) {
                addMealForm.reset();
                addMealForm.removeAttribute('data-editing');
                addMealForm.removeAttribute('data-meal-id');
                document.getElementById('addMealModal').style.display = 'none';
                // Optionally refresh menu list here
            }
        });
    }
    // Make Add Meal form editable (example: call this with meal data to edit)
    window.editMeal = function(meal) {
        document.getElementById('mealName').value = meal.name;
        document.getElementById('mealDescription').value = meal.description;
        document.getElementById('mealPrice').value = meal.price;
        document.getElementById('mealCategory').value = meal.category;
        document.getElementById('mealImage').value = meal.image;
        addMealForm.dataset.editing = 'true';
        addMealForm.dataset.mealId = meal._id;
        document.getElementById('addMealModal').style.display = 'flex';
    };
    // Remove meal button logic (for menu list)
    window.removeMeal = async function(mealId) {
        if (!confirm('Are you sure you want to remove this meal?')) return;
        await fetch('https://aticas-backend.onrender.com/api/menu/' + mealId, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
        });
        // Optionally refresh menu list here
    };
    // --- Update Meals of the Day: Remove Logic ---
    const mealsSelection = document.getElementById('mealsSelection');
    if (mealsSelection) {
        mealsSelection.addEventListener('click', async function(e) {
            if (e.target.classList.contains('remove-btn')) {
                const mealId = e.target.dataset.mealId;
                if (!confirm('Remove this meal from Meals of the Day?')) return;
                await fetch('https://aticas-backend.onrender.com/api/meals/' + mealId, {
                    method: 'DELETE',
                    headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
                });
                // Optionally refresh meals of the day list here
            }
        });
    }

    // Modal close button logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = btn.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });

    // Show unviewed orders count badge in admin navbar
    async function updateUnviewedOrdersBadge() {
        const adminToken = localStorage.getItem('adminToken');
        // Horizontal nav
        const ordersTab = document.querySelector('.admin-navbar-tabs a[href="orders.html"]');
        // Sidebar nav
        const sidebarOrdersTab = document.querySelector('.admin-sidebar a[href="orders.html"]');
        if (!ordersTab && !sidebarOrdersTab) return;
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/orders', {
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error('Failed to fetch orders');
            const orders = await res.json();
            // Count unviewed orders that are not completed/cancelled
            const unviewed = orders.filter(o => !o.viewedByAdmin && (!o.status || (o.status !== 'completed' && o.status !== 'cancelled')));
            // Horizontal nav badge
            let badge = ordersTab ? ordersTab.querySelector('.order-badge') : null;
            if (ordersTab && !badge) {
                badge = document.createElement('span');
                badge.className = 'order-badge';
                badge.style.cssText = 'background:#e74c3c;color:#fff;font-size:0.85rem;padding:2px 8px;border-radius:12px;margin-left:7px;vertical-align:middle;';
                ordersTab.appendChild(badge);
            }
            if (badge) {
                badge.textContent = unviewed.length > 0 ? unviewed.length : '';
                badge.style.display = unviewed.length > 0 ? 'inline-block' : 'none';
            }
            // Sidebar badge
            let sidebarBadge = sidebarOrdersTab ? sidebarOrdersTab.querySelector('.order-badge') : null;
            if (sidebarOrdersTab && !sidebarBadge) {
                sidebarBadge = document.createElement('span');
                sidebarBadge.className = 'order-badge';
                sidebarBadge.style.cssText = 'background:#e74c3c;color:#fff;font-size:0.85rem;padding:2px 8px;border-radius:12px;margin-left:7px;vertical-align:middle;';
                sidebarOrdersTab.appendChild(sidebarBadge);
            }
            if (sidebarBadge) {
                sidebarBadge.textContent = unviewed.length > 0 ? unviewed.length : '';
                sidebarBadge.style.display = unviewed.length > 0 ? 'inline-block' : 'none';
            }
        } catch (err) {
            // Hide badges on error
            if (ordersTab) {
                const badge = ordersTab.querySelector('.order-badge');
                if (badge) badge.style.display = 'none';
            }
            if (sidebarOrdersTab) {
                const sidebarBadge = sidebarOrdersTab.querySelector('.order-badge');
                if (sidebarBadge) sidebarBadge.style.display = 'none';
            }
        }
    }
    document.addEventListener('DOMContentLoaded', updateUnviewedOrdersBadge);
    window.updateUnviewedOrdersBadge = updateUnviewedOrdersBadge;

    // --- Add Meal of the Day Logic ---
    const addMealOfDayForm = document.getElementById('addMealOfDayForm');
    if (addMealOfDayForm) {
        addMealOfDayForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('modName').value.trim();
            const price = parseFloat(document.getElementById('modPrice').value);
            const image = document.getElementById('modImage').value.trim();
            const quantity = parseInt(document.getElementById('modQuantity').value) || 10;
            if (!name || !price || !image) {
                alert('Please fill in all fields.');
                return;
            }
            try {
                const res = await fetch('https://aticas-backend.onrender.com/api/meals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('adminToken') || '' },
                    body: JSON.stringify({ name, price, image, quantity })
                });
                const data = await res.json();
                if (data.success) {
                    addMealOfDayForm.reset();
                    document.getElementById('updateMealsModal').style.display = 'none';
                    // Optionally refresh meals of the day list here
                    if (typeof fetchMealsOfDay === 'function') fetchMealsOfDay();
                } else {
                    alert(data.error || 'Failed to add meal of the day.');
                }
            } catch (err) {
                alert('Failed to add meal of the day.');
            }
        });
    }

    let lastUnviewedOrderCount = 0;

    function showAdminOrderToast(message) {
        let toast = document.getElementById('adminOrderToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'adminOrderToast';
            toast.style.position = 'fixed';
            toast.style.top = '30px';
            toast.style.right = '30px';
            toast.style.background = '#27ae60';
            toast.style.color = '#fff';
            toast.style.padding = '16px 28px';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '1.1rem';
            toast.style.zIndex = 3000;
            toast.style.boxShadow = '0 2px 12px rgba(39,174,96,0.18)';
            toast.style.display = 'none';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }

    function showAdminOrderModal(message) {
        let modal = document.getElementById('adminOrderModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'adminOrderModal';
            modal.style.position = 'fixed';
            modal.style.top = 0;
            modal.style.left = 0;
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.25)';
            modal.style.display = 'flex';
            modal.style.alignItems = 'center';
            modal.style.justifyContent = 'center';
            modal.style.zIndex = 4000;
            modal.innerHTML = '<div style="background:#fff;padding:2rem 2.5rem;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,0.12);font-size:1.2rem;color:#222;text-align:center;max-width:90vw;">' +
                '<span id="adminOrderModalMsg"></span><br><br>' +
                '<button id="closeAdminOrderModal" style="padding:0.5rem 1.2rem;background:#27ae60;color:#fff;border:none;border-radius:6px;font-size:1rem;cursor:pointer;">Close</button>' +
                '</div>';
            document.body.appendChild(modal);
            document.getElementById('closeAdminOrderModal').onclick = function() {
                modal.style.display = 'none';
            };
        }
        document.getElementById('adminOrderModalMsg').textContent = message;
        modal.style.display = 'flex';
    }

    async function pollForNewOrders() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            const res = await fetch('https://aticas-backend.onrender.com/api/orders', {
                headers: { 'Authorization': adminToken }
            });
            if (!res.ok) throw new Error('Failed to fetch orders');
            const orders = await res.json();
            const unviewed = orders.filter(o => !o.viewedByAdmin && (!o.status || (o.status !== 'completed' && o.status !== 'cancelled')));
            if (typeof updateUnviewedOrdersBadge === 'function') updateUnviewedOrdersBadge();
            if (unviewed.length > lastUnviewedOrderCount) {
                showAdminOrderToast('New order received!');
                showAdminOrderModal('A new customer order has been placed!');
            }
            lastUnviewedOrderCount = unviewed.length;
        } catch (err) {
            // Optionally handle error
        }
        setTimeout(pollForNewOrders, 10000);
    }

    // Now call updateDashboardData after all functions are defined
    updateDashboardData();
    setTimeout(pollForNewOrders, 10000);
});