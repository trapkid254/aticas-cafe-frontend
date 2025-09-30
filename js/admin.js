document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    // Derive adminType robustly: from localStorage, adminData, or JWT payload
    let adminType = localStorage.getItem('adminType'); // 'cafeteria' or 'butchery'
    const storedAdminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    if (!adminType && storedAdminData && typeof storedAdminData === 'object') {
        adminType = storedAdminData.adminType || adminType;
    }
    const decodeJwt = (t) => {
        try {
            const parts = String(t).split('.');
            if (parts.length !== 3) return null;
            const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(json);
        } catch { return null; }
    };
    if (!adminType && adminToken) {
        const payload = decodeJwt(adminToken);
        if (payload?.adminType) {
            adminType = payload.adminType;
            try { localStorage.setItem('adminType', adminType); } catch {}
        }
    }

    // Fallback: compute dashboard stats and recent orders on client from /api/orders
    async function buildStatsFromOrdersFallback() {
        try {
            const adminType = localStorage.getItem('adminType') || 'cafeteria';
            const orders = await fetchFromApi('/api/orders');
            if (!Array.isArray(orders)) return null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = orders.filter(o => {
                const d = new Date(o.createdAt || o.date);
                return d >= today;
            });
            const stats = {
                todayOrders: todayOrders.length,
                todayRevenue: todayOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0),
                pendingOrders: orders.filter(o => o.status === 'pending').length,
                completedOrders: orders.filter(o => o.status === 'completed').length,
            };
            // recentOrders: latest 5
            const recentOrders = [...orders]
                .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                .slice(0, 5);
            console.info('Dashboard data built from orders fallback.');
            return { success: true, stats, recentOrders };
        } catch (e) {
            console.error('Fallback build from orders failed:', e);
            return null;
        }
    }

    // If no token at all, go to login (do not force dashboard redirects here)
    if (!adminToken) {
        window.location.href = '/admin/admin-login.html';
        return;
    }

    // Do not force-redirect to dashboard; allow navigation within admin sections

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminType');
            localStorage.removeItem('isAdminLoggedIn');
            const isButchery = (localStorage.getItem('adminType') || adminType) === 'butchery';
            window.location.href = isButchery 
                ? '/butchery-admin/butcheryadmin-login.html' 
                : '/admin/admin-login.html';
        });
    }

    // Chart instances
    let revenueChart = null;
    let topSellingChart = null;

    // --- API Fetch Functions ---
    const fetchFromApi = async (endpoint, options = {}) => {
        const url = new URL(`https://aticas-backend.onrender.com${endpoint}`);
        
        // Base headers for all requests (avoid custom headers that trigger CORS preflight failures)
        const headers = {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        };
        
        // Add type parameter for relevant endpoints
        const shouldAddTypeParam = [
            '/api/orders', 
            '/api/dashboard',
            '/api/menu',
            '/api/meats',
            '/api/employees',
            '/api/payments'
        ].some(prefix => endpoint.startsWith(prefix));
        
        if (shouldAddTypeParam) {
            url.searchParams.append('type', adminType);
        }
        // Merge auth headers correctly (avoid overriding with duplicate keys)
        const authHeaders = getAuthHeaders();
        const response = await fetch(url, {
            ...options,
            headers: { ...headers, ...(authHeaders || {}), ...(options.headers || {}) }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized: clear and redirect once, then throw to let callers handle UI
                try {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminType');
                } catch (e) {}
                window.location.href = adminType === 'butchery' 
                    ? '/butchery-admin/butcheryadmin-login.html'
                    : '/admin/admin-login.html';
                throw new Error('401 Unauthorized');
            }
            throw new Error(`Failed to fetch from ${endpoint}`);
        }
        return response.json();
    };

    // --- Dashboard Update Functions ---
    async function updateDashboardData() {
        try {
            // Show loading state
            const contentArea = document.querySelector('.admin-content') || document.querySelector('.main-content') || document.body;
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            loadingDiv.textContent = 'Loading dashboard data...';
            if (contentArea) {
                contentArea.insertBefore(loadingDiv, contentArea.firstChild);
            }

            try {
                // Get admin type from localStorage
                const adminType = localStorage.getItem('adminType') || 'cafeteria';
                
                // Fetch dashboard stats with admin type
                let response = await fetchFromApi(`/api/dashboard/stats?adminType=${adminType}`);
                
                // Remove loading indicator
                if (loadingDiv.parentNode) {
                    loadingDiv.remove();
                }

                // Validate response
                if (!response || response.success === false || !response.stats) {
                    console.warn('Dashboard stats endpoint missing or invalid. Falling back to compute from orders.');
                    response = await buildStatsFromOrdersFallback();
                    if (!response) throw new Error('No dashboard data returned');
                } else {
                    // Safety net: if stats look empty but there are orders, recompute from orders
                    try {
                        const orders = await fetchFromApi('/api/orders');
                        if (Array.isArray(orders) && orders.length > 0) {
                            const allZero = !response.stats.todayOrders && !response.stats.todayRevenue && !response.stats.pendingOrders && !response.stats.completedOrders;
                            if (allZero) {
                                console.warn('Backend stats look empty while orders exist. Recomputing from orders.');
                                const fallback = await buildStatsFromOrdersFallback();
                                if (fallback && fallback.stats) {
                                    response = fallback;
                                }
                            }
                        }
                    } catch (ignore) {}
                }
                // Update dashboard stats
                const stats = response.stats;
                const isButchery = adminType === 'butchery';

                // Cafeteria IDs
                const todayOrdersEl = document.getElementById('todayOrders');
                const totalRevenueEl = document.getElementById('totalRevenue');
                const pendingOrdersEl = document.getElementById('pendingOrders');
                const completedOrdersEl = document.getElementById('completedOrders');

                // Butchery IDs
                const totalOrdersElB = document.getElementById('totalOrders');
                const totalRevenueElB = document.getElementById('totalRevenue');
                const totalMeatItemsElB = document.getElementById('totalMeatItems');
                const meatsTodayElB = document.getElementById('meatsToday');

                // Update card titles based on admin type (only if elements exist)
                const cardTitles = document.querySelectorAll('.dashboard-card h3');
                if (cardTitles.length >= 4) {
                    if (isButchery) {
                        // For butchery page, titles are already set in HTML; skip changing text
                    } else {
                        cardTitles[0].textContent = "Today's Orders";
                        cardTitles[1].textContent = "Today's Revenue";
                        cardTitles[2].textContent = "Pending Orders";
                        cardTitles[3].textContent = "Completed Orders";
                    }
                }

                // Populate values for cafeteria
                if (!isButchery) {
                    if (todayOrdersEl) todayOrdersEl.textContent = (stats.todayOrders || 0).toLocaleString();
                    if (totalRevenueEl) totalRevenueEl.textContent = `Ksh ${(stats.todayRevenue || 0).toLocaleString()}`;
                    if (pendingOrdersEl) pendingOrdersEl.textContent = (stats.pendingOrders || 0).toLocaleString();
                    if (completedOrdersEl) completedOrdersEl.textContent = (stats.completedOrders || 0).toLocaleString();
                } else {
                    // Populate butchery cards
                    if (totalOrdersElB) totalOrdersElB.textContent = ((stats.todayOrders || 0) + (stats.pendingOrders || 0) + (stats.completedOrders || 0)).toLocaleString();
                    if (totalRevenueElB) totalRevenueElB.textContent = `Ksh ${(stats.todayRevenue || 0).toLocaleString()}`;
                    // Fetch meat items for counts
                    try {
                        const meats = await fetchFromApi('/api/meats');
                        if (Array.isArray(meats)) {
                            if (totalMeatItemsElB) totalMeatItemsElB.textContent = meats.length.toLocaleString();
                            // If you later track "meats of the day", compute here; using 0 for now
                            if (meatsTodayElB) meatsTodayElB.textContent = '0';
                        }
                    } catch {}
                }
                
                // Update page title
                const pageTitle = document.querySelector('.admin-content h2');
                if (pageTitle) {
                    pageTitle.textContent = isButchery ? 'Butchery Admin Dashboard' : 'Cafeteria Admin Dashboard';
                }

                // Render recent orders if available
                if (response.recentOrders && Array.isArray(response.recentOrders)) {
                    renderRecentOrders(response.recentOrders);
                    
                    // If we need to show charts, we can use the recent orders data
                    if (response.recentOrders.length > 0) {
                        try {
                            const menuItems = await fetchFromApi('/api/menu');
                            renderTopSellingChart(response.recentOrders, menuItems);
                            renderRevenueChart(response.recentOrders);
                        } catch (chartError) {
                            console.error('Failed to load chart data:', chartError);
                            // Continue without charts if they fail
                        }
                    }
                } else {
                    // Handle case when no recent orders
                    const tableBody = document.querySelector('#recentOrdersTable tbody');
                    if (tableBody) {
                        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No recent orders found</td></tr>';
                    }
                }

                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.textContent = 'Dashboard updated successfully';
                if (contentArea) {
                    contentArea.insertBefore(successMessage, contentArea.firstChild);
                }
                
                // Remove success message after 3 seconds
                setTimeout(() => {
                    if (successMessage.parentNode) {
                        successMessage.style.opacity = '0';
                        setTimeout(() => successMessage.remove(), 500);
                    }
                }, 3000);

            } catch (fetchError) {
                // Remove loading indicator if still present
                if (loadingDiv.parentNode) {
                    loadingDiv.remove();
                }
                throw fetchError; // Re-throw to be caught by outer catch
            }

        } catch (error) {
            console.error('Failed to update dashboard data:', error);
// Show error message to user
const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Failed to load dashboard data. ' + 
                (error.message || 'Please try again later.');
                
            const contentArea = document.querySelector('.admin-content') || document.querySelector('.main-content') || document.body;
            if (contentArea) {
                contentArea.insertBefore(errorDiv, contentArea.firstChild);
                
                // Remove error message after 5 seconds
                setTimeout(() => {
                    if (errorDiv.parentNode) {
                        errorDiv.style.opacity = '0';
                        setTimeout(() => errorDiv.remove(), 500);
                    }
                }, 5000);
            }
            
            // If we have a token but still get an error, the token might be invalid
            if (error.message && error.message.includes('401')) {
                localStorage.removeItem('adminToken');
                window.location.href = 'admin-login.html';
            }
        }
    }

    function renderRecentOrders(orders) {
        const tableBody = document.querySelector('#recentOrdersTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = ''; // Clear existing rows
        
        if (!orders || orders.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center;">No recent orders found</td>';
            tableBody.appendChild(row);
            return;
        }
        
        orders.forEach(order => {
            const row = document.createElement('tr');
            
            // Format order items for display
            let itemsText = order.items
                .slice(0, 2) // Show only first 2 items
                .map(item => {
                    const itemName = item.menuItem?.name || 'Unknown Item';
                    return `${item.quantity}x ${itemName}`;
                })
                .join(', ');
                
            if (order.items.length > 2) {
                itemsText += `, +${order.items.length - 2} more`;
            }
            
            // Format date
            const orderDate = new Date(order.date).toLocaleString();
            
            // Format status with appropriate class
            const statusClass = order.status === 'completed' ? 'status-completed' : 
                              order.status === 'cancelled' ? 'status-cancelled' : 'status-pending';
            
            row.innerHTML = `
                <td>#${order._id.substring(0, 8)}</td>
                <td>${order.customerName || 'Walk-in'}</td>
                <td>Ksh ${order.total?.toLocaleString() || '0'}</td>
                <td><span class="${statusClass}">${order.status}</span></td>
                <td>
                    <button class="action-btn view-order-btn" data-order-id="${order._id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            
            // Add event listener to view order button
            const viewBtn = row.querySelector('.view-order-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => {
                    // Redirect to order details page or show a modal
                    window.location.href = `orders.html?orderId=${order._id}`;
                });
            }
            
            tableBody.appendChild(row);
        });
    }

    function renderTopSellingChart(orders, menuItems) {
        const ctx = document.getElementById('topSellingChart');
        if (!ctx) return;

        // Get admin type
        const adminType = localStorage.getItem('adminType') || 'cafeteria';
        const isButchery = adminType === 'butchery';

        // Filter menu items by admin type if needed
        const filteredMenuItems = (menuItems || []).filter(item => item.adminType === adminType);

        // If no orders or menu items, don't show the chart
        if (!orders || orders.length === 0 || filteredMenuItems.length === 0) {
            ctx.parentElement.innerHTML = `<p>No ${isButchery ? 'meat' : 'menu'} items data available for top selling items</p>`;
            return;
        }

        const itemSales = {};
        
        // Count quantities per item id
        orders.forEach(order => {
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const id = item.menuItem?._id || item.menuItem;
                    if (id) {
                        itemSales[String(id)] = (itemSales[String(id)] || 0) + (item.quantity || 1);
                    }
                });
            }
        });

        // Sort and get top 5 items
        const sortedItems = Object.entries(itemSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // Map item ids to names
        const idToName = new Map(filteredMenuItems.map(i => [String(i._id || i.id), i.name]));
        const labels = sortedItems.map(([id]) => idToName.get(String(id)) || 'Unknown');
        const data = sortedItems.map(([, qty]) => qty);

        // Destroy existing chart if any
        if (topSellingChart) topSellingChart.destroy();

        // Create new chart
        topSellingChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantity Sold',
                    data: data,
                    backgroundColor: [
                        '#2ecc71',
                        '#3498db',
                        '#f1c40f',
                        '#e74c3c',
                        '#9b59b6'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    title: {
                        display: true,
                        text: isButchery ? 'Top Selling Meat Items' : 'Top Selling Menu Items',
                        font: { size: 16 }
                    }
                }
            }
        });
    }

    function renderRevenueChart(orders) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        // Get admin type
        const adminType = localStorage.getItem('adminType') || 'cafeteria';
        const isButchery = adminType === 'butchery';

        // If no orders, don't show the chart
        if (!orders || orders.length === 0) {
            ctx.parentElement.innerHTML = `<p>No ${isButchery ? 'meat' : 'revenue'} data available</p>`;
            return;
        }

        // Group revenue by month
        const monthlyRevenue = {};
        const currentYear = new Date().getFullYear();
        
        // Initialize all months with 0
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthNames.forEach(month => {
            monthlyRevenue[month] = 0;
        });

        // Calculate revenue for each month
        orders.forEach(order => {
            if (order.date) {
                const orderDate = new Date(order.date);
                // Only include orders from current year
                if (orderDate.getFullYear() === currentYear) {
                    const month = monthNames[orderDate.getMonth()];
                    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (order.total || 0);
                }
            }
        });

        // Convert to arrays for chart
        const labels = Object.keys(monthlyRevenue);
        const data = Object.values(monthlyRevenue);

        // Check if we have any revenue data
        const hasRevenueData = data.some(amount => amount > 0);
        
        if (!hasRevenueData) {
            ctx.parentElement.innerHTML = '<p>No revenue data available for the current year</p>';
            return;
        }

        // Destroy existing chart if it exists
        if (revenueChart) revenueChart.destroy();
        
        // Create new chart
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Revenue (Ksh)',
                    data: data,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#3498db',
                    pointHoverBorderColor: '#fff',
                    pointHitRadius: 10,
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: isButchery ? 'Meat Sales Trends' : 'Revenue Trends',
                        font: {
                            size: 16
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Ksh ${context.raw.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Ksh ' + value.toLocaleString();
                            }
                        },
                        title: {
                            display: true,
                            text: 'Amount (Ksh)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    }
                }
            }
        });
    }

    // Helper function to get auth headers
    function getAuthHeaders() {
        const token = localStorage.getItem('adminToken');
        if (!token) return {};
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
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
                headers: getAuthHeaders(),
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

    // Handle meal removal
    window.removeMeal = async function(mealId) {
        if (!confirm('Are you sure you want to remove this meal?')) return;
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/menu/' + mealId, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Error removing meal:', error);
            alert('Failed to remove meal. Please try again.');
        }
    };

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
            const token = localStorage.getItem('adminToken');
            if (!token) return;
            
            // Use unified orders endpoint; backend filters by admin type via JWT
            const endpoint = '/api/orders';
            const res = await fetch(`https://aticas-backend.onrender.com${endpoint}`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) return;
            
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
            console.error('Error updating unviewed orders badge:', err);
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
                    headers: getAuthHeaders(),
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

    // Polling with simple exponential backoff on errors
    let pollDelayMs = 10000; // start with 10s
    async function pollForNewOrders() {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                console.error('No admin token found');
                return;
            }

            const orders = await fetchFromApi('/api/orders');
            const unviewed = orders.filter(o => !o.viewedByAdmin && (!o.status || (o.status !== 'completed' && o.status !== 'cancelled')));

            if (typeof updateUnviewedOrdersBadge === 'function') {
                updateUnviewedOrdersBadge();
            }

            if (unviewed.length > lastUnviewedOrderCount) {
                showAdminOrderToast('New order received!');
            }
            lastUnviewedOrderCount = unviewed.length;

            // Success: reset delay to baseline
            pollDelayMs = 10000;
        } catch (err) {
            console.error('Error polling for orders:', err);
            if (err.message && err.message.includes('401')) {
                console.error('Authentication failed. Redirecting to login...');
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminType');
                window.location.href = adminType === 'butchery' 
                    ? '/butchery-admin/butcheryadmin-login.html' 
                    : '/admin/admin-login.html';
                return;
            }
            // Backoff on transient errors
            pollDelayMs = Math.min(pollDelayMs * 2, 60000); // cap at 60s
        }
        setTimeout(pollForNewOrders, pollDelayMs);
    }

    // Initialize only where applicable
    const isDashboardPage = !!document.querySelector('.admin-content .dashboard-cards');
    if (isDashboardPage) {
        updateDashboardData();
        updateUnviewedOrdersBadge();
        setTimeout(pollForNewOrders, 10000);
    }
});