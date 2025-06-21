// === GLOBAL SCOPE FUNCTIONS ===
async function loadMenuItems() {
    console.log('Loading menu items from API');
    try {
        const menuItems = await apiGet('/api/menuItems');
        const menuTable = document.getElementById('menu-table');
        
        if (!menuTable) {
            console.log('Menu table not found - not on menu management page');
            return;
        }

        menuTable.innerHTML = `
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Available</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${menuItems.map(item => `
                    <tr>
                        <td>${item.id || 'N/A'}</td>
                        <td>${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;">` : 'No Image'}</td>
                        <td>${item.name || 'Unknown Item'}</td>
                        <td>Ksh ${item.price ? item.price.toFixed(2) : '0.00'}</td>
                        <td>${item.category || 'Uncategorized'}</td>
                        <td>${item.available ? 'Yes' : 'No'}</td>
                        <td>
                            <button class="btn edit-item" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn delete-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                editMenuItem(itemId);
            });
        });

        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                deleteMenuItem(itemId);
            });
        });
    } catch (error) {
        console.error("Failed to load menu items:", error);
        const menuTable = document.getElementById('menu-table');
        if(menuTable) menuTable.innerHTML = "<tr><td colspan='7'>Error loading menu items.</td></tr>";
    }
}

async function loadOrders() {
    try {
        const orders = await apiGet('/api/orders');
        const ordersTable = document.getElementById('orders-table');
        const recentOrdersTable = document.getElementById('recent-orders-table');
        
        if (ordersTable) {
            const tableBody = ordersTable.querySelector('tbody') || ordersTable;
            tableBody.innerHTML = ''; // Clear existing rows
            orders.forEach(order => {
                const orderData = {
                    id: order.id || 'N/A',
                    customerName: order.customerName || 'Guest',
                    date: order.date || order.timestamp || new Date().toISOString(),
                    items: order.items || [],
                    total: order.total || 0,
                    status: order.status || 'pending',
                    paymentStatus: order.paymentStatus || 'Pending'
                };
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${orderData.id}</td>
                    <td>${orderData.customerName}</td>
                    <td>${new Date(orderData.date).toLocaleString()}</td>
                    <td>${orderData.items.map(item => `${item.name || 'Unknown'} (${item.quantity || 0})`).join(', ')}</td>
                    <td>KES ${orderData.total.toFixed(2)}</td>
                    <td><span class="status ${orderData.status}">${orderData.status}</span></td>
                    <td><span class="payment-status ${orderData.paymentStatus}">${orderData.paymentStatus}</span></td>
                    <td>
                        ${orderData.paymentStatus === 'Paid' ? 
                            '<span class="paid-badge">Paid</span>' : 
                            `<button class="btn update-status" data-id="${orderData.id}">Update Status</button>
                             ${orderData.status === 'completed' ? 
                                `<button class="btn mark-paid" data-id="${orderData.id}">Mark as Paid</button>` : 
                                ''}`
                        }
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        if (recentOrdersTable) {
            const tableBody = recentOrdersTable.querySelector('tbody') || recentOrdersTable;
            tableBody.innerHTML = ''; // Clear existing rows
            const recentOrders = orders.slice(-5).reverse();
            recentOrders.forEach(order => {
                const orderData = {
                    id: order.id || 'N/A',
                    customerName: order.customerName || 'Guest',
                    items: order.items || [],
                    total: order.total || 0,
                    status: order.status || 'pending'
                };
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${orderData.id}</td>
                    <td>${orderData.customerName}</td>
                    <td>${orderData.items.map(item => `${item.name || 'Unknown'} (${item.quantity || 0})`).join(', ')}</td>
                    <td>KES ${orderData.total.toFixed(2)}</td>
                    <td><span class="status ${orderData.status}">${orderData.status}</span></td>
                    <td>
                        <button class="btn view-details" data-id="${orderData.id}">View Details</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
        updateDashboardStats(orders);
    } catch (error) {
        console.error("Failed to load orders:", error);
        const ordersTable = document.getElementById('orders-table');
        if(ordersTable) ordersTable.innerHTML = "<tr><td colspan='8'>Error loading orders.</td></tr>";
    }
}

async function loadEmployees() {
    const employeesTable = document.getElementById('employees-table').querySelector('tbody');
    if (!employeesTable) return;
    try {
        const employees = await apiGet('/api/employees');
        if (employees.length === 0) {
            employeesTable.innerHTML = '<tr><td colspan="6">No employees found.</td></tr>';
            return;
        }
        employeesTable.innerHTML = employees.map(emp => `
            <tr id="emp-${emp.id}">
                <td>${emp.id}</td>
                <td>${emp.name}</td>
                <td>${emp.role}</td>
                <td>${emp.email}</td>
                <td>${emp.phone}</td>
                <td>
                    <button class="btn btn-sm btn-edit" onclick="editEmployee('${emp.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-delete" onclick="deleteEmployee('${emp.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        employeesTable.innerHTML = '<tr><td colspan="6">Error loading employees.</td></tr>';
        console.error('Error loading employees:', error);
        showPopup(`Error: ${error.message}`, 'error');
    }
}

async function loadAdmins() {
    const adminsTable = document.getElementById('admins-table').querySelector('tbody');
    if (!adminsTable) return;
    try {
        const users = await apiGet('/api/users');
        adminsTable.innerHTML = users.map(user => `
            <tr id="user-${user.id}">
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                <td>
                    <button class="btn btn-sm btn-edit" onclick="editAdmin('${user.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-delete" onclick="deleteAdmin('${user.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        adminsTable.innerHTML = `<tr><td colspan="5">Error loading users: ${error.message}</td></tr>`;
        console.error('Error loading users:', error);
    }
}

let salesChart = null; // To hold the chart instance

function setupReports() {
    console.log('Reports tab loaded');
    const reportTypeSelect = document.getElementById('report-type');
    const customDateRange = document.getElementById('custom-date-range');
    
    reportTypeSelect.addEventListener('change', () => {
        if (reportTypeSelect.value === 'custom') {
            customDateRange.style.display = 'block';
        } else {
            customDateRange.style.display = 'none';
function loadPayments() {
    const paymentsTable = document.getElementById('payments-table');
    if (!paymentsTable) return;
    try {
        const orders = await apiGet('/api/orders');
        const completedOrders = orders.filter(o => o.status === 'Completed');

        if (completedOrders.length === 0) {
            paymentsTable.innerHTML = '<tr><td colspan="6">No completed payments found.</td></tr>';
            return;
        }

        paymentsTable.innerHTML = completedOrders.map(order => `
            <tr>
                <td>${order.mpesaReceiptCode || 'N/A'}</td>
                <td>${order.id}</td>
                <td>${new Date(order.date).toLocaleDateString()}</td>
                <td>KES ${order.total.toFixed(2)}</td>
                <td>${order.paymentMethod}</td>
                <td><span class="status-completed">${order.status}</span></td>
            </tr>
        `).join('');
    } catch (error) {
        paymentsTable.innerHTML = '<tr><td colspan="6">Error loading payments.</td></tr>';
        console.error('Error loading payments:', error);
        showPopup(`Error: ${error.message}`, 'error');
    }
}

function updateDashboardStats(orders) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(order => {
        const orderDate = new Date(order.date || order.timestamp || 0).toDateString();
        return orderDate === today;
    });
    document.getElementById('today-orders').textContent = todayOrders.length;
    document.getElementById('today-revenue').textContent = 'KES ' + 
        todayOrders.reduce((sum, order) => sum + (order.total || 0), 0).toFixed(2);
    
    // Fetch menu items count from API instead of localStorage
    apiGet('/api/menuItems').then(menuItems => {
        document.getElementById('menu-items-count').textContent = menuItems.length;
    }).catch(err => {
        console.error("Could not fetch menu items count", err);
        document.getElementById('menu-items-count').textContent = 'N/A';
    });

    document.getElementById('pending-orders').textContent = 
        orders.filter(order => (order.status || 'pending') === 'pending').length;
}

async function loadMealsOfTheDay() {
    try {
        const meals = await apiGet('/api/mealsOfDay');
        const container = document.getElementById('meals-of-the-day-container');
        if (!container) return;

        container.innerHTML = `
            <div class="meals-header">
                <h3>Meals of the Day</h3>
                <button id="add-meal-btn" class="btn"><i class="fas fa-plus"></i> Add Meal</button>
            </div>
            <div class="meals-list">
                ${meals.map(meal => `
                    <div class="meal-item" data-id="${meal.id}">
                        <img src="${meal.image}" alt="${meal.name}">
                        <div class="meal-info">
                            <h4>${meal.name}</h4>
                            <p>${meal.description}</p>
                            <span class="price">KES ${meal.price.toFixed(2)}</span>
                        </div>
                        <div class="meal-actions">
                             <button class="btn-icon edit-meal-btn" onclick="editMealOfDay('${meal.id}')"><i class="fas fa-edit"></i></button>
                             <button class="btn-icon delete-meal-btn" onclick="deleteMealOfDay('${meal.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('add-meal-btn').addEventListener('click', showAddMealModal);

    } catch (error) {
        console.error('Error loading meals of the day:', error);
    }
}

async function editMenuItem(id) {
    try {
        const item = await apiGet(`/api/menuItems/${id}`);
        showAddMenuItemModal(item);
    } catch (error) {
        console.error(`Error fetching menu item ${id}:`, error);
        showError('Could not load item details for editing.');
    }
}


function showAddMenuItemModal(item = null) {
    const modal = document.getElementById('add-item-modal');
    const form = document.getElementById('add-item-form');
    const title = document.getElementById('modal-title');

    if (item) {
        title.textContent = 'Edit Menu Item';
        form.elements['itemId'].value = item.id;
        form.elements['itemName'].value = item.name;
        form.elements['itemPrice'].value = item.price;
        form.elements['itemCategory'].value = item.category;
        form.elements['itemImage'].value = item.image;
        form.elements['itemAvailable'].checked = item.available;
    } else {
        title.textContent = 'Add New Menu Item';
        form.reset();
        form.elements['itemId'].value = '';
    }

    modal.style.display = 'block';

    // Close button
    modal.querySelector('.close').onclick = () => {
        modal.style.display = 'none';
    };

    // Form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        await saveMenuItem(formData);
        modal.style.display = 'none';
        loadMenuItems();
    };
}

async function saveMenuItem(formData) {
    try {
        const itemId = formData.get('itemId');
        let savedItem;
        if (itemId) {
            savedItem = await apiPutFormData(`/api/menuItems/${itemId}`, formData);
        } else {
            savedItem = await apiPostFormData('/api/menuItems', formData);
        }
        showPopup('Menu item saved successfully!', 'success');
        return savedItem;
    } catch (error) {
        console.error('Error saving menu item:', error);
        showPopup(`Error saving menu item: ${error.message}`, 'error');
    }
}

function showAddMealModal(meal = null) {
    const modal = document.getElementById('add-meal-modal');
    const form = document.getElementById('add-meal-form');
    const title = document.getElementById('meal-modal-title');

    if (meal) {
        title.textContent = 'Edit Meal of the Day';
        form.elements['mealId'].value = meal.id;
        form.elements['mealName'].value = meal.name;
        form.elements['mealDescription'].value = meal.description;
        form.elements['mealPrice'].value = meal.price;
        form.elements['mealImage'].value = meal.image;
    } else {
        title.textContent = 'Add New Meal of the Day';
        form.reset();
        form.elements['mealId'].value = '';
    }

    modal.style.display = 'block';

    modal.querySelector('.close').onclick = () => {
        modal.style.display = 'none';
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        await saveMeal(formData);
        modal.style.display = 'none';
        loadMealsOfTheDay();
    };
}

async function saveMeal(formData) {
    try {
        const mealId = formData.get('mealId');
        if (mealId) {
            await apiPutFormData(`/api/mealsOfDay/${mealId}`, formData);
        } else {
            await apiPostFormData('/api/mealsOfDay', formData);
        }
        showPopup('Meal of the day saved!', 'success');
    } catch (error) {
        console.error('Error saving meal:', error);
        showPopup('Failed to save meal of the day.', 'error');
    }
}

async function editMealOfDay(id) {
    try {
        const meal = await apiGet(`/api/mealsOfDay/${id}`);
        showAddMealModal(meal);
    } catch (error) {
        console.error('Error fetching meal for editing:', error);
    }
}

async function deleteMealOfDay(id) {
    if (!confirm('Are you sure you want to delete this meal of the day?')) {
        return;
    }
    try {
        await apiDelete(`/api/mealsOfDay/${id}`);
        showPopup('Meal of the Day deleted!', 'success');
        loadMealsOfTheDay();
    } catch (error) {
        console.error('Error deleting meal:', error);
        showPopup('Failed to delete meal.', 'error');
    }
}

function initializeTabNavigation() {
    const tabs = document.querySelectorAll('.admin-nav li[data-tab]');
    const contents = document.querySelectorAll('.admin-content');
    const title = document.getElementById('admin-page-title');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(`${targetId}-tab`);

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            contents.forEach(c => c.classList.remove('active'));
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // Update page title
            if (title) {
                title.textContent = tab.textContent;
            }

            // Load content for the new tab
            switch (targetId) {
                case 'dashboard':
                    loadOrders();
                    loadMealsOfTheDay();
                    break;
                case 'menu':
                    loadMenuItems();
                    loadMealsOfTheDay();
                    break;
                case 'orders':
                    loadOrders();
                    break;
                case 'employees':
                    // Assuming you have a loadEmployees function
                    if (typeof loadEmployees === 'function') loadEmployees();
                    break;
                case 'payments':
                    loadPayments();
                    break;
                case 'reports':
                    setupReports();
                    break;
                case 'admins':
                    if (typeof loadAdmins === 'function') loadAdmins();
                    break;
            }
        });
    });
}

// MAIN INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication on page load
    if (!checkAuth()) {
        // If not authenticated, redirect to login page
        // window.location.href = 'admin-login.html';
        console.log("Not authenticated, but on admin page. Allowing for now.");
    }


    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
            window.location.href = 'admin-login.html';
        });
    }

    initializeTabNavigation();

    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'admin.html') {
        loadOrders();
        loadMealsOfTheDay();
    }

    // by the initial state set in the HTML. We can trigger a click to be sure.
    document.querySelector('.admin-nav li[data-tab="dashboard"]').click();

    // Add event listeners for the 'Add' buttons
    const addItemBtn = document.querySelector('.add-item-btn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => showAddMenuItemModal());
    }

    const addMealBtn = document.querySelector('.add-meal-btn');
    if (addMealBtn) {
        addMealBtn.addEventListener('click', () => showAddMealModal());
    }

    setupEmployeeModal();
    setupAdminModal();
});

function checkAuth() {
    // In a real app, this would check a token
    const loggedInUser = localStorage.getItem('loggedInUser');
    const adminUser = JSON.parse(loggedInUser);
    
    if (adminUser && (adminUser.role === 'admin' || adminUser.role === 'superadmin')) {
        const adminNameEl = document.getElementById('admin-name');
        if (adminNameEl) {
            adminNameEl.textContent = adminUser.name;
        }
        return true;
    }
    return false;
}

function logout() {
    localStorage.removeItem('loggedInUser');
}

// =================================================================
// The following sections are for features that still use localStorage
// and need to be migrated to API calls.
// =================================================================


// EMPLOYEE MANAGEMENT (localStorage version)
function editEmployee(id) {
    // ... needs migration to API
    console.log("Editing employee " + id);
}

function deleteEmployee(id) {
    // ... needs migration to API
    console.log("Deleting employee " + id);
}

// ADMIN MANAGEMENT (localStorage version)
function displayAdmins() {
    // ... needs migration to API
}

function addAdmin() {
    // ... needs migration to API
}

async function saveAdmin(event) {
    event.preventDefault();
    const form = event.target;
    const adminId = form.querySelector('#adminId').value;
    const password = form.querySelector('#adminPassword').value;
    const adminData = {
        username: form.querySelector('#adminName').value,
        email: form.querySelector('#adminEmail').value,
        role: form.querySelector('#adminRole').value,
    };
    if (password) {
        adminData.password = password;
    }

    try {
        if (adminId) {
            await apiPut(`/api/users/${adminId}`, adminData);
            showPopup('User updated successfully!', 'success');
        } else {
            if (!password) {
                showPopup('Password is required for new users.', 'error');
                return;
            }
            await apiPost('/api/users', adminData);
            showPopup('User created successfully!', 'success');
        }
        document.getElementById('add-admin-modal').style.display = 'none';
        loadAdmins();
    } catch (error) {
        console.error('Error saving user:', error);
        showPopup(`Error saving user: ${error.message}`, 'error');
    }
}

async function editAdmin(userId) {
    try {
        const user = await apiGet(`/api/users/${userId}`);
        if (!user) {
            showPopup('User not found.', 'error');
            return;
        }
        const modal = document.getElementById('add-admin-modal');
        const form = document.getElementById('add-admin-form');
        modal.querySelector('#admin-modal-title').textContent = 'Edit User';
        form.querySelector('#adminId').value = user.id;
        form.querySelector('#adminName').value = user.username;
        form.querySelector('#adminEmail').value = user.email;
        form.querySelector('#adminRole').value = user.role;
        form.querySelector('#adminPassword').value = '';
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching user for edit:', error);
        showPopup(`Error: ${error.message}`, 'error');
    }
}

async function deleteAdmin(userId) {
    if (!confirm('Are you sure you want to delete this user? This is irreversible.')) return;
    try {
        await apiDelete(`/api/users/${userId}`);
        showPopup('User deleted successfully', 'success');
        loadAdmins();
    } catch (error) {
        showPopup(`Error deleting user: ${error.message}`, 'error');
        console.error('Error deleting user:', error);
    }
}

// REPORTS
function initializeReports() {
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) {
        generateReportBtn.addEventListener('click', generateReports);
    }
}

async function generateReports() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const reportOutput = document.getElementById('report-output');

    if (!startDate || !endDate) {
        reportOutput.innerHTML = '<p class="error">Please select a start and end date.</p>';
        return;
    }

    reportOutput.innerHTML = '<p>Generating report...</p>';

    try {
        const orders = await apiGet('/api/orders');
        const filteredOrders = orders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
        });

        let content = `<h2>${reportType.replace('-', ' ').toUpperCase()} Report</h2>
                       <p>From: ${startDate} To: ${endDate}</p>`;

        if (reportType === 'sales-summary') {
            const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
            const totalOrders = filteredOrders.length;
            const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            
            content += `
                <div class="report-summary">
                    <div>Total Revenue: <span>KES ${totalRevenue.toFixed(2)}</span></div>
                    <div>Total Orders: <span>${totalOrders}</span></div>
                    <div>Average Order Value: <span>KES ${averageOrderValue.toFixed(2)}</span></div>
                </div>
            `;

        } else if (reportType === 'detailed-sales') {
            content += `
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredOrders.map(order => `
                            <tr>
                                <td>${order.id}</td>
                                <td>${new Date(order.date).toLocaleString()}</td>
                                <td>${order.customerName}</td>
                                <td>${order.items.map(i => i.name).join(', ')}</td>
                                <td>KES ${order.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
        reportOutput.innerHTML = content;
    } catch (error) {
        console.error("Error generating report:", error);
        reportOutput.innerHTML = '<p class="error">Failed to generate report.</p>';
    }
}

// UTILITY FUNCTIONS
function showError(message) {
    const errorPopup = document.getElementById('error-popup');
    if (errorPopup) {
        errorPopup.textContent = message;
        errorPopup.style.display = 'block';
        setTimeout(() => {
            errorPopup.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

function showPopup(message, type = 'info') {
    const popup = document.createElement('div');
    popup.className = `popup ${type}`;
    popup.textContent = message;

    document.body.appendChild(popup);

    // Trigger reflow to apply animation
    popup.offsetHeight; 

    popup.classList.add('show');

    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 500);
    }, 3000);
}


// DELETE FUNCTIONS
async function deleteMenuItem(id) {
    if (!confirm('Are you sure you want to delete this menu item?')) {
        return;
    }
    try {
        await apiDelete(`/api/menuItems/${id}`);
        showPopup('Menu item deleted successfully!', 'success');
        loadMenuItems();
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showPopup('Failed to delete menu item.', 'error');
    }
}

// New API helpers for FormData
async function apiPostFormData(endpoint, formData) {
    const token = getToken();
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(API_BASE_URL + endpoint, {
        method: 'POST',
        headers: headers, // No 'Content-Type', browser sets it for FormData
        body: formData
    });
    const responseData = await res.json();
    if (!res.ok) {
        throw new Error(responseData.message || 'An unknown error occurred');
    }
    return responseData;
}

async function apiPutFormData(endpoint, formData) {
    const token = getToken();
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(API_BASE_URL + endpoint, {
        method: 'PUT',
        headers: headers, // No 'Content-Type'
        body: formData
    });
    const responseData = await res.json();
    if (!res.ok) {
        throw new Error(responseData.message || 'An unknown error occurred');
    }
    return responseData;
}

// Placeholder functions for new sections
function setupReports() {
    console.log('Reports tab loaded');
    const reportTypeSelect = document.getElementById('report-type');
    const customDateRange = document.getElementById('custom-date-range');
    
    reportTypeSelect.addEventListener('change', () => {
        if (reportTypeSelect.value === 'custom') {
            customDateRange.style.display = 'block';
        } else {
            customDateRange.style.display = 'none';
        }
    });

    // Chart.js example
    const ctx = document.getElementById('sales-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Sales (KES)',
                data: [1200, 1900, 3000, 5000, 2300, 4100, 5500],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Modal handling for Add Employee
function setupEmployeeModal() {
    const addEmployeeModal = document.getElementById('add-employee-modal');
    const addEmployeeBtn = document.querySelector('.add-employee-btn');
    if (!addEmployeeModal || !addEmployeeBtn) return;
    
    const form = document.getElementById('add-employee-form');
    const closeBtn = addEmployeeModal.querySelector('.close');

    addEmployeeBtn.onclick = () => {
        form.reset();
        addEmployeeModal.querySelector('#employee-modal-title').textContent = 'Add New Employee';
        form.querySelector('#employeeId').value = '';
        addEmployeeModal.style.display = 'block';
    }
    
    closeBtn.onclick = () => {
        addEmployeeModal.style.display = 'none';
    }

    window.addEventListener('click', (event) => {
        if (event.target == addEmployeeModal) {
            addEmployeeModal.style.display = 'none';
        }
    });

    form.onsubmit = saveEmployee;
}

async function saveEmployee(event) {
    event.preventDefault();
    const form = event.target;
    const employeeId = form.querySelector('#employeeId').value;
    const employeeData = {
        name: form.querySelector('#employeeName').value,
        role: form.querySelector('#employeeRole').value,
        email: form.querySelector('#employeeEmail').value,
        phone: form.querySelector('#employeePhone').value,
    };

    try {
        if (employeeId) {
            await apiPut(`/api/employees/${employeeId}`, employeeData);
            showPopup('Employee updated successfully!', 'success');
        } else {
            await apiPost('/api/employees', employeeData);
            showPopup('Employee added successfully!', 'success');
        }
        document.getElementById('add-employee-modal').style.display = 'none';
        loadEmployees();
    } catch (error) {
        console.error('Error saving employee:', error);
        showPopup(`Error saving employee: ${error.message}`, 'error');
    }
}

async function editEmployee(employeeId) {
    try {
        const employee = await apiGet(`/api/employees/${employeeId}`);
        if (!employee) {
            showPopup('Employee not found.', 'error');
            return;
        }
        const modal = document.getElementById('add-employee-modal');
        const form = document.getElementById('add-employee-form');
        modal.querySelector('#employee-modal-title').textContent = 'Edit Employee';
        form.querySelector('#employeeId').value = employee.id;
        form.querySelector('#employeeName').value = employee.name;
        form.querySelector('#employeeRole').value = employee.role;
        form.querySelector('#employeeEmail').value = employee.email;
        form.querySelector('#employeePhone').value = employee.phone;
        modal.style.display = 'block';
    } catch(error) {
        console.error('Error fetching employee for edit:', error);
        showPopup(`Error: ${error.message}`, 'error');
    }
}

async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
        await apiDelete(`/api/employees/${id}`);
        showPopup('Employee deleted successfully', 'success');
        loadEmployees(); // Refresh the list
    } catch (error) {
        showPopup(`Error deleting employee: ${error.message}`, 'error');
        console.error('Error deleting employee:', error);
    }
}

// Modal handling for Add Admin
function setupAdminModal() {
    const modal = document.getElementById('add-admin-modal');
    const btn = document.querySelector('.add-admin-btn');
    if (!modal || !btn) return;
    const form = document.getElementById('add-admin-form');
    const closeBtn = modal.querySelector('.close');
    btn.onclick = () => {
        form.reset();
        modal.querySelector('#admin-modal-title').textContent = 'Add New User';
        form.querySelector('#adminId').value = '';
        modal.style.display = 'block';
    }
    closeBtn.onclick = () => { modal.style.display = 'none'; }
    window.addEventListener('click', (event) => {
        if (event.target == modal) { modal.style.display = 'none'; }
    });
    form.onsubmit = saveAdmin;
}