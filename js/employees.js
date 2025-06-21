// Employee Management
let employees = JSON.parse(localStorage.getItem('employees')) || [];
let employeeToDelete = null;

// Initialize employee management
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners
    const addEmployeeBtn = document.querySelector('.add-employee-btn');
    const addEmployeeModal = document.getElementById('add-employee-modal');
    const addEmployeeForm = document.getElementById('add-employee-form');
    const closeButtons = document.querySelectorAll('.close');
    const confirmDeleteBtn = document.getElementById('confirm-delete');

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            addEmployeeModal.style.display = 'block';
        });
    }

    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', handleAddEmployee);
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteEmployee);
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // Display employees
    displayEmployees();
});

// Handle adding new employee
function handleAddEmployee(e) {
    e.preventDefault();
    
    const employeeNumber = document.getElementById('employee-number').value;
    const name = document.getElementById('employee-name').value;
    const position = document.getElementById('employee-position').value;
    const phone = document.getElementById('employee-phone').value;
    const email = document.getElementById('employee-email').value;
    
    // Get selected work days
    const workDaysCheckboxes = document.querySelectorAll('input[name="work-days"]:checked');
    const workDays = Array.from(workDaysCheckboxes).map(cb => cb.value);

    // Validate employee number format (e.g., EMP001)
    if (!/^EMP\d{3}$/.test(employeeNumber)) {
        alert('Employee number must be in the format EMP001');
        return;
    }

    // Check if employee number already exists
    if (employees.some(emp => emp.employeeNumber === employeeNumber)) {
        alert('Employee number already exists');
        return;
    }

    const newEmployee = {
        id: generateEmployeeId(),
        employeeNumber,
        name,
        position,
        phone,
        email,
        workDays
    };

    employees.push(newEmployee);
    saveEmployees();
    displayEmployees();
    e.target.reset();
    document.getElementById('add-employee-modal').style.display = 'none';
}

// Display employees in table
function displayEmployees() {
    const tableBody = document.getElementById('employees-table');
    if (!tableBody) return;

    tableBody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.employeeNumber}</td>
            <td>${employee.name}</td>
            <td>${formatPosition(employee.position)}</td>
            <td>${employee.phone}</td>
            <td>${employee.email}</td>
            <td>${formatWorkDays(employee.workDays)}</td>
            <td>
                <button class="btn view-schedule-btn" onclick="viewSchedule('${employee.id}')">
                    <i class="fas fa-calendar-alt"></i> Schedule
                </button>
                <button class="btn edit-btn" onclick="editEmployee('${employee.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn delete-btn" onclick="confirmDelete('${employee.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Format position for display
function formatPosition(position) {
    return position.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Format work days for display
function formatWorkDays(workDays) {
    if (!workDays || workDays.length === 0) return 'Not set';
    return workDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
}

// View employee schedule
function viewSchedule(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const modal = document.getElementById('view-schedule-modal');
    const details = document.getElementById('employee-schedule-details');

    details.innerHTML = `
        <div class="employee-info">
            <h3>${employee.name}</h3>
            <p><strong>Position:</strong> ${employee.position}</p>
        </div>
        <div class="schedule-info">
            <h4>Work Schedule</h4>
            <div class="work-days-list">
                ${employee.workDays.map(day => `
                    <div class="work-day">
                        <i class="fas fa-check-circle"></i>
                        <span>${day.charAt(0).toUpperCase() + day.slice(1)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Edit employee
function editEmployee(employeeId) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    // Populate form with employee data
    document.getElementById('edit-employee-number').value = employee.employeeNumber;
    document.getElementById('edit-employee-name').value = employee.name;
    document.getElementById('edit-employee-position').value = employee.position;
    document.getElementById('edit-employee-phone').value = employee.phone;
    document.getElementById('edit-employee-email').value = employee.email;

    // Check work days
    document.querySelectorAll('input[name="work-days"]').forEach(checkbox => {
        checkbox.checked = employee.workDays.includes(checkbox.value);
    });

    // Show modal
    const modal = document.getElementById('add-employee-modal');
    modal.style.display = 'block';

    // Update form submission handler
    const form = document.getElementById('add-employee-form');
    form.onsubmit = (e) => {
        e.preventDefault();
        updateEmployee(employeeId);
    };
}

// Update employee
function updateEmployee(id) {
    const employeeNumber = document.getElementById('edit-employee-number').value;
    const name = document.getElementById('edit-employee-name').value;
    const position = document.getElementById('edit-employee-position').value;
    const phone = document.getElementById('edit-employee-phone').value;
    const email = document.getElementById('edit-employee-email').value;
    
    const workDaysCheckboxes = document.querySelectorAll('#edit-employee-form input[name="work-days"]:checked');
    const workDays = Array.from(workDaysCheckboxes).map(cb => cb.value);

    // Validate employee number format
    if (!/^EMP\d{3}$/.test(employeeNumber)) {
        alert('Employee number must be in the format EMP001');
        return;
    }

    // Check if employee number already exists (excluding current employee)
    if (employees.some(emp => emp.employeeNumber === employeeNumber && emp.id !== id)) {
        alert('Employee number already exists');
        return;
    }

    const index = employees.findIndex(emp => emp.id === id);
    if (index !== -1) {
        employees[index] = {
            ...employees[index],
            employeeNumber,
            name,
            position,
            phone,
            email,
            workDays
        };
        saveEmployees();
        displayEmployees();
        document.getElementById('edit-employee-modal').style.display = 'none';
    }
}

// Delete employee
function confirmDelete(employeeId) {
    employeeToDelete = employeeId;
    const modal = document.getElementById('delete-employee-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Handle delete employee
function handleDeleteEmployee() {
    if (!employeeToDelete) return;

    const index = employees.findIndex(emp => emp.id === employeeToDelete);
    if (index !== -1) {
        employees.splice(index, 1);
        saveEmployees();
        displayEmployees();
    }

    // Close modal and reset
    document.getElementById('delete-employee-modal').style.display = 'none';
    employeeToDelete = null;
}

// Generate unique employee ID
function generateEmployeeId() {
    return 'EMP' + Date.now().toString().slice(-6);
}

// Save employees to localStorage
function saveEmployees() {
    localStorage.setItem('employees', JSON.stringify(employees));
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