document.addEventListener('DOMContentLoaded', function() {
    // Auth check (token-based)
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        window.location.href = '/admin/admin-login.html';
        return;
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('isAdminLoggedIn');
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminType');
            window.location.href = '/admin/admin-login.html';
        });
    }

    // Modal elements
    const addEmployeeModal = document.getElementById('addEmployeeModal');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const closeModalButtons = document.querySelectorAll('.close-modal');

    // Open modal
    if (addEmployeeBtn && addEmployeeModal) {
        addEmployeeBtn.addEventListener('click', function() {
            addEmployeeModal.style.display = 'flex';
        });
    }

    // Close modal via X buttons
    if (addEmployeeModal) {
        closeModalButtons.forEach(button => {
            button.addEventListener('click', function() {
                addEmployeeModal.style.display = 'none';
            });
        });
    }

    // Close when clicking outside
    window.addEventListener('click', function(event) {
        if (addEmployeeModal && event.target === addEmployeeModal) {
            addEmployeeModal.style.display = 'none';
        }
    });

    // Add employee form
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    if (addEmployeeForm) addEmployeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const lastName = document.getElementById('empLastName')?.value || '';
        const employmentNumber = document.getElementById('empNumber')?.value || '';
        const role = document.getElementById('empRole')?.value || '';
        const department = document.getElementById('empDepartment') ? document.getElementById('empDepartment').value : '';
        const email = document.getElementById('empEmail') ? document.getElementById('empEmail').value : '';
        const phone = document.getElementById('empPhone')?.value || '';
        const statusElement = document.getElementById('empStatus');
        if (!statusElement) {
            alert('Status field is missing!');
            return;
        }
        const status = statusElement.value;
        const photoInput = document.getElementById('empPhoto');
        const file = photoInput && photoInput.files && photoInput.files[0];

        const employee = {
            lastName,
            employmentNumber,
            role,
            department,
            email,
            phone,
            status,
            joinDate: new Date().toISOString().split('T')[0]
        };

        const submit = async () => {
            try {
                await fetch('https://aticas-backend.onrender.com/api/employees', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },
                    body: JSON.stringify(employee)
                });
                addEmployeeForm.reset();
                if (addEmployeeModal) addEmployeeModal.style.display = 'none';
                await loadEmployees();
                alert('Employee added successfully!');
            } catch (err) {
                alert('Failed to add employee: ' + (err.message || 'Unknown error'));
            }
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                employee.photo = evt.target.result;
                submit();
            };
            reader.readAsDataURL(file);
        } else {
            submit();
        }
    });

    // Search
    const employeeSearch = document.getElementById('employeeSearch');
    if (employeeSearch) employeeSearch.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#employeesTable tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });

    // Edit modal close
    const closeEditEmployeeModalBtn = document.getElementById('closeEditEmployeeModal');
    if (closeEditEmployeeModalBtn) {
        closeEditEmployeeModalBtn.addEventListener('click', function() {
            const em = document.getElementById('editEmployeeModal');
            if (em) em.style.display = 'none';
        });
    }

    // Load initial table
    loadEmployees();
});

async function loadEmployees() {
    try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch('https://aticas-backend.onrender.com/api/employees', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch employees');
        const employees = await res.json();
        const tableBody = document.querySelector('#employeesTable tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        employees.forEach(employee => {
            const row = document.createElement('tr');

            const roleKey = (employee.role || '').toLowerCase();
            const roleClass = `role-${['chef','waiter','cashier'].includes(roleKey) ? 'staff' : roleKey}`;
            const statusClass = `status-${(employee.status || '').toLowerCase()}`;

            row.innerHTML = `
                <td>
                    <div class="employee-name">
                        <img src="../images/${roleKey === 'chef' ? 'chef' : 'manager'}.jpg" alt="${employee.firstName || ''}" class="employee-avatar">
                        ${(employee.firstName || '')} ${(employee.lastName || '')}
                    </div>
                </td>
                <td>${employee.employmentNumber || ''}</td>
                <td><span class="employee-role ${roleClass}">${(employee.role || '').charAt(0).toUpperCase() + (employee.role || '').slice(1)}</span></td>
                <td>${(employee.department || '').charAt(0).toUpperCase() + (employee.department || '').slice(1)}</td>
                <td><span class="employee-status ${statusClass}">${(employee.status || '').charAt(0).toUpperCase() + (employee.status || '').slice(1)}</span></td>
                <td>${employee.salary ? 'Ksh ' + Number(employee.salary).toLocaleString() : '-'}</td>
                <td>
                    <button class="action-btn edit-btn" data-id="${employee._id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-id="${employee._id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Wire actions
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const employeeId = this.dataset.id;
                editEmployee(employeeId);
            });
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const employeeId = this.dataset.id;
                deleteEmployee(employeeId);
            });
        });
    } catch (err) {
        alert('Failed to load employees: ' + (err.message || 'Unknown error'));
    }
}

async function addEmployee(employee) {
    // Kept for backward compatibility if referenced elsewhere
    try {
        const token = localStorage.getItem('adminToken');
        await fetch('https://aticas-backend.onrender.com/api/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(employee)
        });
        loadEmployees();
    } catch (err) {
        alert('Failed to add employee: ' + (err.message || 'Unknown error'));
    }
}

async function editEmployee(employeeId) {
    try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch('https://aticas-backend.onrender.com/api/employees', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch employees');
        const employees = await res.json();
        const employee = employees.find(emp => emp._id === employeeId);
        if (!employee) return;
        const editModal = document.getElementById('editEmployeeModal');
        if (!editModal) return;
        editModal.style.display = 'flex';
        document.getElementById('editEmpFirstName').value = employee.firstName || '';
        document.getElementById('editEmpLastName').value = employee.lastName || '';
        document.getElementById('editEmpNumber').value = employee.employmentNumber || '';
        document.getElementById('editEmpRole').value = employee.role || '';
        document.getElementById('editEmpDepartment').value = employee.department || '';
        document.getElementById('editEmpEmail').value = employee.email || '';
        document.getElementById('editEmpPhone').value = employee.phone || '';
        document.getElementById('editEmpSalary').value = employee.salary || '';
        document.getElementById('editEmpStatus').value = employee.status || '';
        editModal.dataset.employeeId = employeeId;
    } catch (err) {
        alert('Failed to load employee for editing: ' + (err.message || 'Unknown error'));
    }
}

// Handle edit form submission
const editEmployeeForm = document.getElementById('editEmployeeForm');
if (editEmployeeForm) {
    editEmployeeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const editModal = document.getElementById('editEmployeeModal');
        const employeeId = editModal?.dataset.employeeId;
        const updatedEmployee = {
            firstName: document.getElementById('editEmpFirstName').value,
            lastName: document.getElementById('editEmpLastName').value,
            employmentNumber: document.getElementById('editEmpNumber').value,
            role: document.getElementById('editEmpRole').value,
            department: document.getElementById('editEmpDepartment').value,
            email: document.getElementById('editEmpEmail').value,
            phone: document.getElementById('editEmpPhone').value,
            salary: document.getElementById('editEmpSalary').value,
            status: document.getElementById('editEmpStatus').value
        };
        const photoInput = document.getElementById('editEmpPhoto');
        const file = photoInput && photoInput.files && photoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(evt) {
                updatedEmployee.photo = evt.target.result;
                await updateEmployee(employeeId, updatedEmployee);
            };
            reader.readAsDataURL(file);
        } else {
            await updateEmployee(employeeId, updatedEmployee);
        }
        editEmployeeForm.reset();
        if (editModal) editModal.style.display = 'none';
        loadEmployees();
        alert('Employee updated successfully!');
    });
}

async function updateEmployee(employeeId, updatedEmployee) {
    try {
        const token = localStorage.getItem('adminToken');
        await fetch(`https://aticas-backend.onrender.com/api/employees/${employeeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedEmployee)
        });
    } catch (err) {
        alert('Failed to update employee: ' + (err.message || 'Unknown error'));
    }
}

async function deleteEmployee(employeeId) {
    if (confirm('Are you sure you want to delete this employee?')) {
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`https://aticas-backend.onrender.com/api/employees/${employeeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadEmployees();
            alert('Employee deleted successfully!');
        } catch (err) {
            alert('Failed to delete employee: ' + (err.message || 'Unknown error'));
        }
    }
}
