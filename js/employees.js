// Employee Management
let employeeToDelete = null;

// Initialize employee management
document.addEventListener('DOMContentLoaded', function() {
    const addEmployeeBtn = document.querySelector('.add-employee-btn');
    const addEmployeeModal = document.getElementById('add-employee-modal');
    const addEmployeeForm = document.getElementById('add-employee-form');
    const closeButtons = document.querySelectorAll('.close');
    const confirmDeleteBtn = document.getElementById('confirm-delete');

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            // Reset form for adding new employee
            addEmployeeForm.reset();
            const formTitle = document.getElementById('form-title');
            if(formTitle) formTitle.textContent = 'Add New Employee';
            addEmployeeForm.onsubmit = handleAddEmployee;
            addEmployeeModal.style.display = 'block';
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', handleDeleteEmployee);
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    loadEmployees();
});

async function loadEmployees() {
    try {
        const employees = await apiGet('/api/employees');
        renderEmployees(employees);
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

function renderEmployees(employees) {
    const tableBody = document.getElementById('employees-table');
    if (!tableBody) return;

    tableBody.innerHTML = employees.map(employee => `
        <tr>
            <td>${employee.employeeNumber || ''}</td>
            <td>${employee.name || ''}</td>
            <td>${formatPosition(employee.position)}</td>
            <td>${employee.phone || ''}</td>
            <td>${employee.email || ''}</td>
            <td>${formatWorkDays(employee.workDays)}</td>
            <td>
                <button class="btn view-schedule-btn" onclick='viewSchedule(${JSON.stringify(employee)})'>
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

async function handleAddEmployee(e) {
    e.preventDefault();
    
    const employeeData = {
        employeeNumber: document.getElementById('employee-number').value,
        name: document.getElementById('employee-name').value,
        position: document.getElementById('employee-position').value,
        phone: document.getElementById('employee-phone').value,
        email: document.getElementById('employee-email').value,
        workDays: Array.from(document.querySelectorAll('#add-employee-form input[name="work-days"]:checked')).map(cb => cb.value)
    };

    if (!/^EMP\d{3}$/.test(employeeData.employeeNumber)) {
        alert('Employee number must be in the format EMP001');
        return;
    }

    try {
        await apiPost('/api/employees', employeeData);
        loadEmployees();
        e.target.reset();
        document.getElementById('add-employee-modal').style.display = 'none';
    } catch (error) {
        console.error('Error adding employee:', error);
        alert('Failed to add employee. Please try again.');
    }
}

function formatPosition(position) {
    if(!position) return '';
    return position.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatWorkDays(workDays) {
    if (!workDays || workDays.length === 0) return 'Not set';
    return workDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
}

function viewSchedule(employee) {
    if (!employee) return;

    const modal = document.getElementById('view-schedule-modal');
    const details = document.getElementById('employee-schedule-details');

    details.innerHTML = `
        <div class="employee-info">
            <h3>${employee.name}</h3>
            <p><strong>Position:</strong> ${formatPosition(employee.position)}</p>
        </div>
        <div class="schedule-info">
            <h4>Work Schedule</h4>
            <div class="work-days-list">
                ${(employee.workDays || []).map(day => `
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

async function editEmployee(employeeId) {
    try {
        const employee = await apiGet(`/api/employees/${employeeId}`);
        if (!employee) {
            alert('Employee not found');
            return;
        }

        document.getElementById('employee-number').value = employee.employeeNumber;
        document.getElementById('employee-name').value = employee.name;
        document.getElementById('employee-position').value = employee.position;
        document.getElementById('employee-phone').value = employee.phone;
        document.getElementById('employee-email').value = employee.email;

        document.querySelectorAll('#add-employee-form input[name="work-days"]').forEach(checkbox => {
            checkbox.checked = (employee.workDays || []).includes(checkbox.value);
        });
        
        const formTitle = document.getElementById('form-title');
        if(formTitle) formTitle.textContent = 'Edit Employee';

        const modal = document.getElementById('add-employee-modal');
        modal.style.display = 'block';

        const form = document.getElementById('add-employee-form');
        form.onsubmit = (e) => {
            e.preventDefault();
            updateEmployee(employee.id);
        };
    } catch (error) {
        console.error('Error fetching employee for edit:', error);
    }
}

async function updateEmployee(id) {
    const employeeData = {
        employeeNumber: document.getElementById('employee-number').value,
        name: document.getElementById('employee-name').value,
        position: document.getElementById('employee-position').value,
        phone: document.getElementById('employee-phone').value,
        email: document.getElementById('employee-email').value,
        workDays: Array.from(document.querySelectorAll('#add-employee-form input[name="work-days"]:checked')).map(cb => cb.value)
    };

    if (!/^EMP\d{3}$/.test(employeeData.employeeNumber)) {
        alert('Employee number must be in the format EMP001');
        return;
    }
    
    try {
        await apiPut(`/api/employees/${id}`, employeeData);
        loadEmployees();
        document.getElementById('add-employee-modal').style.display = 'none';
    } catch (error) {
        console.error('Error updating employee:', error);
        alert('Failed to update employee. Please try again.');
    }
}

function confirmDelete(employeeId) {
    employeeToDelete = employeeId;
    const modal = document.getElementById('delete-employee-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

async function handleDeleteEmployee() {
    if (!employeeToDelete) return;

    try {
        await apiDelete(`/api/employees/${employeeToDelete}`);
        loadEmployees();
    } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee. Please try again.');
    } finally {
        document.getElementById('delete-employee-modal').style.display = 'none';
        employeeToDelete = null;
    }
}