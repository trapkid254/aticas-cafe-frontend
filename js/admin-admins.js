document.addEventListener('DOMContentLoaded', function() {
    // Fetch admins from API
    async function fetchAdmins() {
        try {
            const res = await fetch('http://localhost:3000/api/admins', {
                headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
            });
            return await res.json();
        } catch (err) {
            return [];
        }
    }
    // Render admins table
    async function renderAdmins() {
        const admins = await fetchAdmins();
        const tbody = document.querySelector('#adminsTable tbody');
        tbody.innerHTML = '';
        admins.forEach(admin => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${admin.employmentNumber}</td>
                <td>${admin.email || ''}</td>
                <td>${admin.role === 'super' ? '<span style=\"color:#27ae60;font-weight:bold;\">Super Admin</span>' : 'Admin'}</td>
                <td>
                    ${admin.role === 'super' ? '<span style="color:#888;">Cannot Remove</span>' : `<button class='action-btn remove-btn' data-id='${admin._id}' style='background:#e74c3c;color:#fff;'>Remove</button>`}
                </td>
            `;
            tbody.appendChild(tr);
        });
        // Remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const adminId = this.dataset.id;
                if (confirm(`Remove admin?`)) {
                    await deleteAdmin(adminId);
                    renderAdmins();
                }
            });
        });
        // Show/hide add section and message
        const addAdminSection = document.getElementById('addAdminSection');
        const notSuperAdminMsg = document.getElementById('notSuperAdminMsg');
        // For demo, always show add section
        if (addAdminSection && notSuperAdminMsg) {
            addAdminSection.querySelector('form').style.display = 'flex';
            notSuperAdminMsg.style.display = 'none';
        }
    }
    renderAdmins();
    // Add admin form
    const addAdminForm = document.getElementById('addAdminForm');
    const addAdminMsg = document.getElementById('addAdminMsg');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const employmentNumber = document.getElementById('adminUsername').value.trim();
            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value;
            const photoInput = document.getElementById('adminPhoto');
            const file = photoInput && photoInput.files && photoInput.files[0];
            if (!employmentNumber || !email || !password) {
                addAdminMsg.textContent = 'Please enter employment number, email, and password.';
                return;
            }
            const admin = { employmentNumber, email, password, role: 'admin' };
            if (file) {
                const reader = new FileReader();
                reader.onload = async function(evt) {
                    admin.photo = evt.target.result;
                    await addAdmin(admin);
                };
                reader.readAsDataURL(file);
            } else {
                await addAdmin(admin);
            }
            addAdminMsg.textContent = 'Admin added successfully!';
            addAdminForm.reset();
            renderAdmins();
            setTimeout(() => addAdminMsg.textContent = '', 2000);
        });
    }
});

async function addAdmin(admin) {
    try {
        await fetch('http://localhost:3000/api/admins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('adminToken') || ''
            },
            body: JSON.stringify(admin)
        });
    } catch (err) {
        alert('Failed to add admin: ' + err.message);
    }
}

async function deleteAdmin(adminId) {
    try {
        await fetch(`http://localhost:3000/api/admins/${adminId}`, {
            method: 'DELETE',
            headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
        });
    } catch (err) {
        alert('Failed to delete admin: ' + err.message);
    }
} 