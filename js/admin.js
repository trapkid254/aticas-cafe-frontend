document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    const adminType = localStorage.getItem('adminType'); // 'cafeteria' or 'butchery'

    if (!adminToken || !adminType) {
        window.location.href = 'index.html';
        return;
    }

    // Redirect to specific admin page based on type
    if (window.location.pathname.endsWith('admin.html')) {
        const targetPage = adminType === 'butchery' ? 'butchery-admin.html' : 'cafeteria-admin.html';
        if (!window.location.pathname.endsWith(targetPage)) {
            window.location.href = targetPage;
        }
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminType');
            localStorage.removeItem('isAdminLoggedIn');
            window.location.href = 'admin-login.html';
        });
    }

    // Chart instances
    let revenueChart = null;
    let topSellingChart = null;

    // --- API Fetch Functions ---
    const fetchFromApi = async (endpoint) => {
        const url = new URL(`https://aticas-backend.onrender.com${endpoint}`);
        
        // Add type parameter for order-related endpoints
        if (endpoint.startsWith('/api/orders')) {
            url.searchParams.append('type', adminType);
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': adminToken }
        });
        if (!response.ok) throw new Error(`Failed to fetch from ${endpoint}`);
        return response.json();
    };

    // --- Dashboard Update Functions ---
    async function updateDashboardData() {
        try {
            const endpoint = adminType === 'butchery' ? '/api/butchery-orders' : '/api/orders';
            const [orders, menuItems, mealsToday] = await Promise.all([
                fetchFromApi(endpoint),
                fetchFromApi('/api/menu'),
                adminType === 'cafeteria' ? fetchFromApi('/api/meals') : Promise.resolve([])
            ]);

            // Update dashboard stats
            const totalOrdersElem = document.getElementById('totalOrders');
            if (totalOrdersElem) totalOrdersElem.textContent = orders.length;
            
            const totalRevenueElem = document.getElementById('totalRevenue');
            if (totalRevenueElem) totalRevenueElem.textContent = `Ksh ${orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}`;
            
            const totalMenuItemsElem = document.getElementById('totalMenuItems');
            if (totalMenuItemsElem) totalMenuItemsElem.textContent = menuItems.length;
            
            if (adminType === 'cafeteria') {
                const mealsTodayElem = document.getElementById('mealsToday');
                if (mealsTodayElem) mealsTodayElem.textContent = mealsToday.length;
            }

            renderRecentOrders(orders.slice(0, 5));
            renderTopSellingChart(orders, menuItems);
            renderRevenueChart(orders);

        } catch (error) {
            console.error('Failed to update dashboard data:', error);
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

    // Quick Actions buttons - hide/show based on admin type
    const addMealBtn = document.getElementById('addMealBtn');
    const updateMealsBtn = document.getElementById('updateMealsBtn');
    const viewOrdersBtn = document.getElementById('viewOrdersBtn');

    if (addMealBtn) addMealBtn.style.display = adminType === 'cafeteria' ? 'block' : 'none';
    if (updateMealsBtn) updateMealsBtn.style.display = adminType === 'cafeteria' ? 'block' : 'none';
    if (viewOrdersBtn) viewOrdersBtn.style.display = 'block'; // Visible to both

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
            const meal = {
                name: document.getElementById('mealName').value,
                description: document.getElementById('mealDescription').value,
                price: parseFloat(document.getElementById('mealPrice').value),
                category: document.getElementById('mealCategory').value,
                image: document.getElementById('mealImage').value,
                type: adminType // Include admin type in the meal data
            };

            let method = 'POST', url = 'https://aticas-backend.onrender.com/api/menu';
            if (addMealForm.dataset.editing === 'true') {
                method = 'PUT';
                url += '/' + addMealForm.dataset.mealId;
            }
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                body: JSON.stringify(meal)
            });
            
            if (res.ok) {
                addMealForm.reset();
                addMealForm.removeAttribute('data-editing');
                addMealForm.removeAttribute('data-meal-id');
                document.getElementById('addMealModal').style.display = 'none';
            }
        });
    }

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

    window.removeMeal = async function(mealId) {
        if (!confirm('Are you sure you want to remove this meal?')) return;
        await fetch('https://aticas-backend.onrender.com/api/menu/' + mealId, {
            method: 'DELETE',
            headers: { 'Authorization': adminToken }
        });
    };

    // --- Update Meals of the Day: Remove Logic ---
    const mealsSelection = document.getElementById('mealsSelection');
    if (mealsSelection && adminType === 'cafeteria') {
        mealsSelection.addEventListener('click', async function(e) {
            if (e.target.classList.contains('remove-btn')) {
                const mealId = e.target.dataset.mealId;
                if (!confirm('Remove this meal from Meals of the Day?')) return;
                await fetch('https://aticas-backend.onrender.com/api/meals/' + mealId, {
                    method: 'DELETE',
                    headers: { 'Authorization': adminToken }
                });
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
        const ordersTab = document.querySelector('.admin-navbar-tabs a[href="orders.html"]');
        const sidebarOrdersTab = document.querySelector('.admin-sidebar a[href="orders.html"]');
        if (!ordersTab && !sidebarOrdersTab) return;
        
        try {
            const endpoint = adminType === 'butchery' ? '/api/butchery-orders' : '/api/orders';
            const res = await fetch(`https://aticas-backend.onrender.com${endpoint}`, {
                headers: { 'Authorization': adminToken }
            });
            const orders = await res.json();
            const unviewed = orders.filter(o => !o.viewedByAdmin && (!o.status || (o.status !== 'completed' && o.status !== 'cancelled')));

            // Update badges
            [ordersTab, sidebarOrdersTab].forEach(tab => {
                if (!tab) return;
                let badge = tab.querySelector('.order-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'order-badge';
                    badge.style.cssText = 'background:#e74c3c;color:#fff;font-size:0.85rem;padding:2px 8px;border-radius:12px;margin-left:7px;vertical-align:middle;';
                    tab.appendChild(badge);
                }
                badge.textContent = unviewed.length > 0 ? unviewed.length : '';
                badge.style.display = unviewed.length > 0 ? 'inline-block' : 'none';
            });
        } catch (err) {
            // Hide badges on error
            document.querySelectorAll('.order-badge').forEach(badge => {
                badge.style.display = 'none';
            });
        }
    }

    // --- Add Meal of the Day Logic ---
    const addMealOfDayForm = document.getElementById('addMealOfDayForm');
    if (addMealOfDayForm && adminType === 'cafeteria') {
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
                    headers: { 'Content-Type': 'application/json', 'Authorization': adminToken },
                    body: JSON.stringify({ name, price, image, quantity })
                });
                
                if (res.ok) {
                    addMealOfDayForm.reset();
                    document.getElementById('updateMealsModal').style.display = 'none';
                } else {
                    alert('Failed to add meal of the day.');
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
            toast.style.zIndex = '3000';
            toast.style.boxShadow = '0 2px 12px rgba(39,174,96,0.18)';
            toast.style.display = 'none';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 4000);
    }

    async function pollForNewOrders() {
        try {
            const endpoint = adminType === 'butchery' ? '/api/butchery-orders' : '/api/orders';
            const res = await fetch(`https://aticas-backend.onrender.com${endpoint}`, {
                headers: { 'Authorization': adminToken }
            });
            const orders = await res.json();
            const unviewed = orders.filter(o => !o.viewedByAdmin && (!o.status || (o.status !== 'completed' && o.status !== 'cancelled')));
            
            if (typeof updateUnviewedOrdersBadge === 'function') updateUnviewedOrdersBadge();
            
            if (unviewed.length > lastUnviewedOrderCount) {
                showAdminOrderToast('New order received!');
            }
            lastUnviewedOrderCount = unviewed.length;
        } catch (err) {
            console.error('Error polling for orders:', err);
        }
        setTimeout(pollForNewOrders, 10000);
    }

    // Initialize the dashboard
    updateDashboardData();
    updateUnviewedOrdersBadge();
    setTimeout(pollForNewOrders, 10000);
});