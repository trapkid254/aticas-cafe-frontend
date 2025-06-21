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

function loadEmployees() {
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    const employeesTable = document.getElementById('employees-table');
    if (!employeesTable) return;
    employeesTable.innerHTML = '';
    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${employee.id}</td>
            <td>${employee.name}</td>
            <td>${employee.phone}</td>
            <td>${employee.role}</td>
            <td>${employee.status || 'Active'}</td>
            <td>
                <button class="btn edit-employee" data-id="${employee.id}"><i class="fas fa-edit"></i></button>
                <button class="btn delete-employee" data-id="${employee.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        employeesTable.appendChild(row);
    });
    document.querySelectorAll('.edit-employee').forEach(button => {
        button.addEventListener('click', function() {
            const employeeId = this.getAttribute('data-id');
            editEmployee(employeeId);
        });
    });
    document.querySelectorAll('.delete-employee').forEach(button => {
        button.addEventListener('click', function() {
            const employeeId = this.getAttribute('data-id');
            deleteEmployee(employeeId);
        });
    });
}

function loadAdmins() {
    const admins = JSON.parse(localStorage.getItem('admins')) || [];
    const adminsTable = document.getElementById('admins-table');
    if (!adminsTable) return;
    adminsTable.innerHTML = '';
    admins.forEach(admin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${admin.id}</td>
            <td>${admin.name}</td>
            <td>${admin.email}</td>
            <td>${admin.role}</td>
            <td>${admin.status || 'Active'}</td>
            <td>
                <button class="btn edit-admin" data-id="${admin.id}"><i class="fas fa-edit"></i></button>
                <button class="btn delete-admin" data-id="${admin.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        adminsTable.appendChild(row);
    });
    document.querySelectorAll('.edit-admin').forEach(button => {
        button.addEventListener('click', function() {
            const adminId = this.getAttribute('data-id');
            editAdmin(adminId);
        });
    });
    document.querySelectorAll('.delete-admin').forEach(button => {
        button.addEventListener('click', function() {
            const adminId = this.getAttribute('data-id');
            deleteAdmin(adminId);
        });
    });
}

function loadPayments() {
    const payments = JSON.parse(localStorage.getItem('payments')) || [];
    const paymentsTable = document.getElementById('payments-table');
    if (!paymentsTable) return;
    paymentsTable.innerHTML = '';
    payments.forEach(payment => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${payment.id}</td>
            <td>${payment.orderId}</td>
            <td>${payment.amount}</td>
            <td>${payment.status}</td>
            <td>${payment.method}</td>
            <td>${payment.date ? new Date(payment.date).toLocaleString() : ''}</td>
        `;
        paymentsTable.appendChild(row);
    });
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
        const menuItem = {
            id: formData.get('itemId'),
            name: formData.get('itemName'),
            price: parseFloat(formData.get('itemPrice')),
            category: formData.get('itemCategory'),
            image: formData.get('itemImage'),
            available: formData.get('itemAvailable') === 'on'
        };

        await saveMenuItem(menuItem);
        modal.style.display = 'none';
        loadMenuItems();
    };
}

async function saveMenuItem(item) {
    try {
        let savedItem;
        if (item.id) {
            savedItem = await apiPut(`/api/menuItems/${item.id}`, item);
        } else {
            // Create a new ID for the item before saving
            item.id = `menu-${Date.now()}`;
            savedItem = await apiPost('/api/menuItems', item);
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
        const mealData = {
            id: formData.get('mealId'),
            name: formData.get('mealName'),
            description: formData.get('mealDescription'),
            price: parseFloat(formData.get('mealPrice')),
            image: formData.get('mealImage')
        };
        await saveMeal(mealData);
        modal.style.display = 'none';
        loadMealsOfTheDay();
    };
}

async function saveMeal(meal) {
    try {
        if (meal.id) {
            await apiPut(`/api/mealsOfDay/${meal.id}`, meal);
        } else {
            meal.id = `meal-${Date.now()}`;
            await apiPost('/api/mealsOfDay', meal);
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
                     if (typeof loadPayments === 'function') loadPayments();
                    break;
                case 'reports':
                    if (typeof initializeReports === 'function') initializeReports();
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

function editAdmin(id) {
    // ... needs migration to API
}

function deleteAdmin(id) {
    // ... needs migration to API
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