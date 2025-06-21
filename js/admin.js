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

function loadDashboardStats() {
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    updateDashboardStats(orders);
}
// === END GLOBAL SCOPE FUNCTIONS ===

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin dashboard initializing...');
    // Initialize the page
    loadMenuItems();
    loadOrders();
    loadEmployees();
    loadAdmins();
    
    // Add event listeners for tab switching
    const tabLinks = document.querySelectorAll('.admin-nav li');
    tabLinks.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId === 'menu') {
                loadMenuItems();
                loadMealsOfTheDay();
            } else if (tabId === 'orders') {
                loadOrders();
            } else if (tabId === 'employees') {
                loadEmployees();
            } else if (tabId === 'admins') {
                loadAdmins();
            }
        });
    });

    // Add event listener for Add Menu Item button
    const addItemBtn = document.querySelector('.add-item-btn');
    console.log('Add Item Button:', addItemBtn); // Debug log
    if (addItemBtn) {
        addItemBtn.addEventListener('click', function() {
            console.log('Add Item button clicked'); // Debug log
            showAddMenuItemModal();
        });
    }

    // Add event listener for Add Meal of the Day button
    const addMealBtn = document.querySelector('.add-meal-btn');
    console.log('Add Meal Button:', addMealBtn); // Debug log
    if (addMealBtn) {
        addMealBtn.addEventListener('click', function() {
            console.log('Add Meal button clicked'); // Debug log
            showAddMealModal();
        });
    }

    // Load meals if we're on the menu tab
    if (document.querySelector('.admin-nav li[data-tab="menu"].active')) {
        loadMealsOfTheDay();
    }

    // Add Menu Item Form
    const addMenuItemForm = document.getElementById('add-menu-item-form');
    if (addMenuItemForm) {
        addMenuItemForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const menuItem = {
                id: document.getElementById('menu-item-id').value,
                name: document.getElementById('menu-item-name').value,
                price: parseFloat(document.getElementById('menu-item-price').value),
                category: document.getElementById('menu-item-category').value,
                description: document.getElementById('menu-item-description').value,
                image: document.getElementById('menu-item-image-preview').src,
                available: document.getElementById('menu-item-available').checked
            };
            saveMenuItem(menuItem);
        });
    }
});

// Meals of the Day Management
function loadMealsOfTheDay() {
    console.log('Loading meals of the day');
    const meals = JSON.parse(localStorage.getItem('mealsOfDay')) || [];
    const mealsTable = document.getElementById('meals-of-day-table');
    
    if (!mealsTable) {
        console.log('Meals table not found - not on meals management page');
        return;
    }

    mealsTable.innerHTML = `
        ${meals.map(meal => `
            <tr>
                <td>${meal.image ? `<img src="${meal.image}" alt="${meal.name}" style="width: 50px; height: 50px; object-fit: cover;">` : 'No Image'}</td>
                <td>${meal.name}</td>
                <td>${meal.description || ''}</td>
                <td>Ksh ${meal.price.toFixed(2)}</td>
                <td>
                    <button class="btn edit-meal" data-id="${meal.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn delete-meal" data-id="${meal.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('')}
    `;

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-meal').forEach(button => {
        button.addEventListener('click', function() {
            const mealId = this.getAttribute('data-id');
            editMealOfDay(mealId);
        });
    });

    document.querySelectorAll('.delete-meal').forEach(button => {
        button.addEventListener('click', function() {
            const mealId = this.getAttribute('data-id');
            deleteMealOfDay(mealId);
        });
    });
}

// Add Menu Item Modal
function showAddMenuItemModal() {
    console.log('Showing Add Menu Item Modal');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add Menu Item</h2>
            <form id="add-menu-item-form">
                <div class="form-group">
                    <label for="item-name">Name:</label>
                    <input type="text" id="item-name" required>
                </div>
                <div class="form-group">
                    <label for="item-price">Price (KES):</label>
                    <input type="number" id="item-price" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label for="item-category">Category:</label>
                    <select id="item-category" required>
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="drinks">Drinks</option>
                        <option value="desserts">Desserts</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="item-image">Image (Optional):</label>
                    <input type="file" id="item-image" accept="image/*">
                    <div id="item-image-preview" class="image-preview"></div>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="item-available" checked>
                        Available
                    </label>
                </div>
                <button type="submit" class="btn">Add Item</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function() {
        modal.remove();
    };

    // Handle image preview
    const imageInput = document.getElementById('item-image');
    const imagePreview = document.getElementById('item-image-preview');
    
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const form = document.getElementById('add-menu-item-form');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            console.log('Form submitted');
            
            // Get form elements after they are in the DOM
            const nameInput = modal.querySelector('#item-name');
            const priceInput = modal.querySelector('#item-price');
            const categoryInput = modal.querySelector('#item-category');
            const availableInput = modal.querySelector('#item-available');
            
            if (!nameInput || !priceInput || !categoryInput || !availableInput) {
                console.error('Form elements not found');
                return;
            }
            
            const name = nameInput.value.trim();
            const price = parseFloat(priceInput.value);
            const category = categoryInput.value;
            const available = availableInput.checked;
            
            console.log('Form values:', { name, price, category, available });
            
            if (!name) {
                showPopup('Please enter a name for the item', 'error');
                nameInput.focus();
                return;
            }
            
            if (isNaN(price) || price <= 0) {
                showPopup('Please enter a valid price greater than 0', 'error');
                priceInput.focus();
                return;
            }
            
            const newItem = {
                id: Date.now().toString(),
                name: name,
                price: price,
                category: category,
                available: available
            };

            const imageInput = modal.querySelector('#item-image');
            if (imageInput && imageInput.files && imageInput.files.length > 0) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    newItem.image = e.target.result;
                    saveMenuItem(newItem);
                };
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                saveMenuItem(newItem);
            }
        };
    }

    async function saveMenuItem(item) {
        try {
            // If item has an ID, it's an update (PUT), otherwise it's a new item (POST)
            if (item.id) {
                await apiPut(`/api/menuItems/${item.id}`, item);
                showPopup('Menu item updated successfully!', 'success');
            } else {
                // Remove id field so database can generate it
                delete item.id; 
                await apiPost('/api/menuItems', item);
                showPopup('Menu item added successfully!', 'success');
            }
            closeModal('add-menu-item-modal');
            loadMenuItems(); // Reload the list from the server
        } catch (error) {
            console.error('Error saving menu item:', error);
            showError('Failed to save menu item. Please check the console for details.');
        }
    }
}

// Add Meal of the Day Modal
function showAddMealModal() {
    console.log('Showing Add Meal Modal');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add Meal of the Day</h2>
            <form id="add-meal-form">
                <div class="form-group">
                    <label for="meal-name">Name:</label>
                    <input type="text" id="meal-name" required>
                </div>
                <div class="form-group">
                    <label for="meal-price">Price (KES):</label>
                    <input type="number" id="meal-price" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="meal-image">Image (Optional):</label>
                    <input type="file" id="meal-image" accept="image/*">
                    <div id="meal-image-preview" class="image-preview"></div>
                </div>
                <button type="submit" class="btn">Add Meal</button>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function() {
        modal.remove();
    };

    // Handle image preview
    const imageInput = document.getElementById('meal-image');
    const imagePreview = document.getElementById('meal-image-preview');
    
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    const form = document.getElementById('add-meal-form');
    form.onsubmit = function(e) {
        e.preventDefault();
        
        const imageFile = document.getElementById('meal-image').files[0];
        const newMeal = {
            id: Date.now().toString(),
            name: document.getElementById('meal-name').value,
            price: parseFloat(document.getElementById('meal-price').value)
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                newMeal.image = e.target.result;
                saveMeal(newMeal);
            };
            reader.readAsDataURL(imageFile);
        } else {
            saveMeal(newMeal);
        }
    };

    function saveMeal(meal) {
        const meals = JSON.parse(localStorage.getItem('mealsOfDay')) || [];
        meals.push(meal);
        localStorage.setItem('mealsOfDay', JSON.stringify(meals));
        
        modal.remove();
        loadMealsOfTheDay();
        
        showPopup('Meal of the day added successfully!', 'success');
    }
}

function editMealOfDay(id) {
    const meals = JSON.parse(localStorage.getItem('mealsOfDay')) || [];
    const meal = meals.find(m => m.id === id);
    
    if (!meal) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2>Edit Meal</h2>
            <form id="edit-meal-form">
                <div class="form-group">
                    <label for="meal-name">Name:</label>
                    <input type="text" id="meal-name" value="${meal.name}" required>
                </div>
                <div class="form-group">
                    <label for="meal-price">Price (KES):</label>
                    <input type="number" id="meal-price" step="0.01" value="${meal.price}" required>
                </div>
                <div class="form-group">
                    <label for="meal-image">Image URL:</label>
                    <input type="text" id="meal-image" value="${meal.image}" required>
                </div>
                <button type="submit" class="btn">Save Changes</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.onclick = function() {
        modal.remove();
    };
    
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
    
    // Form submission
    const form = modal.querySelector('#edit-meal-form');
    form.onsubmit = function(e) {
        e.preventDefault();
        
        meal.name = document.getElementById('meal-name').value;
        meal.price = parseFloat(document.getElementById('meal-price').value);
        meal.image = document.getElementById('meal-image').value;
        
        localStorage.setItem('mealsOfDay', JSON.stringify(meals));
        modal.remove();
        loadMealsOfTheDay();
    };
}

function deleteMealOfDay(id) {
    if (confirm('Are you sure you want to delete this meal?')) {
        const meals = JSON.parse(localStorage.getItem('mealsOfDay')) || [];
        const updatedMeals = meals.filter(m => m.id !== id);
        localStorage.setItem('mealsOfDay', JSON.stringify(updatedMeals));
        loadMealsOfTheDay();
    }
}

// Super admin credentials
const SUPER_ADMIN = {
    employmentNumber: 'AC001',
    name: 'Aticas',
    password: 'admin@aticas'
};

// Check if user is logged in
function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
        // Only redirect if we're not on the login page
        if (!window.location.pathname.includes('admin-login.html')) {
            window.location.href = 'admin-login.html';
        }
    } else {
        // If we're on the login page but already logged in, redirect to admin dashboard
        if (window.location.pathname.includes('admin-login.html')) {
            window.location.href = 'admin.html';
        }
        // Update admin name in header
        const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin'));
        const adminNameElement = document.getElementById('admin-name');
        if (adminNameElement && currentAdmin) {
            adminNameElement.textContent = currentAdmin.name;
        }
    }
}

// Handle admin login
const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const employmentNumber = document.getElementById('employmentNumber').value.trim();
        const password = document.getElementById('password').value.trim();

        console.log('Login attempt:', { employmentNumber, password }); // Debug log

        // Check super admin credentials
        if (employmentNumber === SUPER_ADMIN.employmentNumber && password === SUPER_ADMIN.password) {
            console.log('Super admin login successful'); // Debug log
            localStorage.setItem('adminLoggedIn', 'true');
            localStorage.setItem('currentAdmin', JSON.stringify(SUPER_ADMIN));
            window.location.href = 'admin.html';
        } else {
            // Check other admins
            const admins = JSON.parse(localStorage.getItem('admins') || '[]');
            const admin = admins.find(a => a.employmentNumber === employmentNumber && a.password === password);
            
            if (admin) {
                console.log('Admin login successful:', admin); // Debug log
                localStorage.setItem('adminLoggedIn', 'true');
                localStorage.setItem('currentAdmin', JSON.stringify(admin));
                window.location.href = 'admin.html';
            } else {
                console.log('Login failed'); // Debug log
                alert('Invalid credentials. Please try again.');
            }
        }
    });
}

// Handle logout
const logoutBtn = document.querySelector('.logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('currentAdmin');
        window.location.href = 'admin-login.html';
    });
}

// Handle adding new admin
const addAdminForm = document.getElementById('addAdminForm');
if (addAdminForm) {
    addAdminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const employmentNumber = document.getElementById('newEmploymentNumber').value.trim();
        const name = document.getElementById('newName').value.trim();
        const password = document.getElementById('newPassword').value.trim();

        if (!employmentNumber || !name || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Get existing admins
        const admins = JSON.parse(localStorage.getItem('admins') || '[]');

        // Check if employment number already exists
        if (admins.some(admin => admin.employmentNumber === employmentNumber)) {
            alert('Employment number already exists');
            return;
        }

        // Add new admin
        admins.push({ employmentNumber, name, password });
        localStorage.setItem('admins', JSON.stringify(admins));

        // Clear form
        addAdminForm.reset();

        // Refresh admin list
        displayAdmins();
        
        alert('New admin added successfully!');
    });
}

// Display list of admins
function displayAdmins() {
    const adminsList = document.getElementById('adminsList');
    if (adminsList) {
        const admins = JSON.parse(localStorage.getItem('admins') || '[]');
        const allAdmins = [SUPER_ADMIN, ...admins];

        adminsList.innerHTML = allAdmins.map(admin => `
            <div class="admin-card">
                <h3>${admin.name}</h3>
                <p>Employment Number: ${admin.employmentNumber}</p>
            </div>
        `).join('');
    }
}

// Tab switching functionality
const tabLinks = document.querySelectorAll('.admin-nav li');
const tabContents = document.querySelectorAll('.admin-content');

tabLinks.forEach(link => {
    link.addEventListener('click', () => {
        // Remove active class from all links and contents
        tabLinks.forEach(l => l.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked link
        link.classList.add('active');

        // Show corresponding content
        const tabId = link.getAttribute('data-tab');
        const content = document.getElementById(`${tabId}-tab`);
        if (content) {
            content.classList.add('active');
        }

        // Update page title
        document.getElementById('admin-page-title').textContent = link.textContent.trim();

        // Load content for the selected tab only
        if (tabId === 'menu') {
            loadMenuItems();
        } else if (tabId === 'orders') {
            loadOrders();
        } else if (tabId === 'payments') {
            loadPayments();
        } else if (tabId === 'reports') {
            generateReports();
        } else if (tabId === 'dashboard') {
            // Optionally, load dashboard stats
            loadDashboardStats && loadDashboardStats();
        } else if (tabId === 'employees') {
            loadEmployees && loadEmployees();
        } else if (tabId === 'admins') {
            loadAdmins && loadAdmins();
        }
    });
});

// On page load, show only the active tab's content
window.addEventListener('DOMContentLoaded', function() {
    tabContents.forEach(c => c.classList.remove('active'));
    const activeTab = document.querySelector('.admin-nav li.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        const content = document.getElementById(`${tabId}-tab`);
        if (content) {
            content.classList.add('active');
        }
    }
});

// Reports Management Functions
function initializeReports() {
    const reportType = document.getElementById('report-type');
    const timePeriod = document.getElementById('time-period');
    const dateRange = document.querySelector('.date-range');
    const generateBtn = document.querySelector('.generate-btn');

    if (timePeriod) {
        timePeriod.addEventListener('change', () => {
            if (timePeriod.value === 'custom') {
                dateRange.style.display = 'flex';
            } else {
                dateRange.style.display = 'none';
            }
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            generateReport();
        });
    }
}

function generateReports() {
    console.log('Starting report generation...');
    
    // Get orders from localStorage
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    console.log('Retrieved orders:', orders);

    // Get the selected period
    const periodSelect = document.getElementById('reportPeriod');
    const period = periodSelect ? periodSelect.value : 'week';
    console.log('Selected period:', period);

    // Filter orders based on period
    const now = new Date();
    const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.date);
        switch(period) {
            case 'today':
                return orderDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                return orderDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                return orderDate >= monthAgo;
            case 'year':
                const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
                return orderDate >= yearAgo;
            default:
                return true;
        }
    });
    console.log('Filtered orders:', filteredOrders);

    // Create reports tab content if it doesn't exist
    let reportsTab = document.querySelector('.tab-content[data-tab="reports"]');
    if (!reportsTab) {
        reportsTab = document.createElement('div');
        reportsTab.className = 'tab-content';
        reportsTab.setAttribute('data-tab', 'reports');
        document.querySelector('.tabs-content').appendChild(reportsTab);
    }

    // Create reports header
    const reportsHeader = document.createElement('div');
    reportsHeader.className = 'reports-header';
    reportsHeader.innerHTML = `
        <h2>Reports</h2>
        <div class="header-controls">
            <select id="reportPeriod" class="form-control">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
            </select>
            <button type="button" id="generateReportsBtn" class="btn">
                <i class="fas fa-sync-alt"></i> Generate Report
            </button>
        </div>
    `;
    reportsTab.innerHTML = '';
    reportsTab.appendChild(reportsHeader);

    // Create reports grid
    const reportsGrid = document.createElement('div');
    reportsGrid.className = 'reports-grid';
    reportsGrid.innerHTML = `
        <div class="report-card">
            <h3>Sales Overview</h3>
            <div id="salesOverview" class="report-content"></div>
        </div>
        <div class="report-card">
            <h3>Daily Revenue</h3>
            <div id="dailyRevenue" class="report-content"></div>
        </div>
        <div class="report-card">
            <h3>Summary Statistics</h3>
            <div class="summary-stats"></div>
        </div>
    `;
    reportsTab.appendChild(reportsGrid);

    // Calculate total sales
    const totalSales = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    console.log('Total sales:', totalSales);

    // Generate sales overview
    const salesOverview = document.getElementById('salesOverview');
    if (salesOverview) {
        const categories = {};
        filteredOrders.forEach(order => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item && item.category && item.price && item.quantity) {
                        categories[item.category] = (categories[item.category] || 0) + (item.price * item.quantity);
                    }
                });
            }
        });

        salesOverview.innerHTML = `
            <div class="sales-categories">
                ${Object.entries(categories).map(([category, amount]) => `
                    <div class="category-item">
                        <div class="category-name">${category}</div>
                        <div class="category-amount">KES ${amount.toFixed(2)}</div>
                        <div class="category-percentage">${((amount / totalSales) * 100).toFixed(1)}%</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Generate daily revenue
    const dailyRevenue = document.getElementById('dailyRevenue');
    if (dailyRevenue) {
        const dailyData = {};
        filteredOrders.forEach(order => {
            if (order.date && order.total) {
                const date = new Date(order.date).toLocaleDateString();
                dailyData[date] = (dailyData[date] || 0) + (order.total || 0);
            }
        });

        dailyRevenue.innerHTML = `
            <div class="daily-revenue-list">
                ${Object.entries(dailyData).map(([date, amount]) => `
                    <div class="daily-item">
                        <div class="daily-date">${date}</div>
                        <div class="daily-amount">KES ${amount.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Update summary stats
    const summaryStats = document.querySelector('.summary-stats');
    if (summaryStats) {
        const avgOrderValue = filteredOrders.length ? (totalSales / filteredOrders.length).toFixed(2) : 0;
        summaryStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Sales</span>
                <span class="stat-value">KES ${totalSales.toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Total Orders</span>
                <span class="stat-value">${filteredOrders.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Order Value</span>
                <span class="stat-value">KES ${avgOrderValue}</span>
            </div>
        `;
    }

    // Add event listener for period change
    const periodSelector = document.getElementById('reportPeriod');
    if (periodSelector) {
        periodSelector.value = period;
        periodSelector.addEventListener('change', generateReports);
    }

    // Add event listener for generate button
    const generateBtn = document.getElementById('generateReportsBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReports);
    }

    console.log('Report generation completed');
}

// Show error message
function showError(message) {
    const reportsTab = document.getElementById('reports-tab');
    if (reportsTab) {
        reportsTab.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
}

// Show notification
function showPopup(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add event listener for tab switching
document.addEventListener('DOMContentLoaded', function() {
    // Ensure admin container exists
    let adminContainer = document.querySelector('.admin-container');
    if (!adminContainer) {
        adminContainer = document.createElement('div');
        adminContainer.className = 'admin-container';
        document.body.appendChild(adminContainer);
    }

    // Create tabs navigation if it doesn't exist
    let tabsNav = document.querySelector('.tabs-nav');
    if (!tabsNav) {
        tabsNav = document.createElement('ul');
        tabsNav.className = 'tabs-nav';
        tabsNav.innerHTML = `
            <li><a href="#" class="tab-link active" data-tab="ordersTab">Orders</a></li>
            <li><a href="#" class="tab-link" data-tab="reportsTab">Reports</a></li>
        `;
        adminContainer.appendChild(tabsNav);
    }

    // Create tabs content container if it doesn't exist
    let tabsContent = document.querySelector('.tabs-content');
    if (!tabsContent) {
        tabsContent = document.createElement('div');
        tabsContent.className = 'tabs-content';
        adminContainer.appendChild(tabsContent);
    }

    // Add event listeners for tab switching
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Generate reports if reports tab is selected
            if (tabId === 'reportsTab') {
                generateReports();
            }
        });
    });
    
    // Initialize reports if reports tab is active
    if (document.getElementById('reportsTab')?.classList.contains('active')) {
        generateReports();
    }
});

// DELETE FUNCTIONS
async function deleteMenuItem(id) {
    if (confirm('Are you sure you want to delete this menu item?')) {
        try {
            await apiDelete(`/api/menuItems/${id}`);
            showPopup('Menu item deleted successfully!', 'success');
            loadMenuItems(); // Reload the list from the server
        } catch (error) {
            console.error('Error deleting menu item:', error);
            showError('Failed to delete menu item.');
        }
    }
}

// Helper functions for API
async function apiGet(endpoint) {
    const res = await fetch(endpoint);
    return res.json();
}
async function apiPost(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}
async function apiPut(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}
async function apiDelete(endpoint) {
    const res = await fetch(API_BASE_URL + endpoint, { method: 'DELETE' });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message);
    }
    return res.json();
}
