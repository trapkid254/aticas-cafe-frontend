// admin-meat-management.js - Handles Meat Management for ATICAS BUTCHERY Admin
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const meatsOfDayList = document.getElementById('meatsOfDayList');
    const meatMenuList = document.getElementById('meatMenuList');
    const addMeatOfDayBtn = document.getElementById('addMeatOfDayBtn');
    const addMenuMeatBtn = document.getElementById('addMenuMeatBtn');
    const addMeatModal = document.getElementById('addMeatModal');
    const closeModal = addMeatModal?.querySelector('.close-modal');
    const addMeatForm = document.getElementById('addMeatForm');
    
    // State
    let meatItems = [];
    let meatsOfDay = [];
    let editId = null;
    let isSubmitting = false;
    
    // Initialize
    fetchMeatItems();
    fetchMeatsOfDay();
    
    // Event Listeners
    if (addMeatOfDayBtn) addMeatOfDayBtn.onclick = () => openAddModal('mod');
    if (addMenuMeatBtn) addMenuMeatBtn.onclick = () => openAddModal('menu');
    if (closeModal) closeModal.onclick = closeMeatModal;
    if (addMeatForm) addMeatForm.onsubmit = handleSubmit;
    
    // Functions
    async function fetchMeatItems() {
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/meats', {
                headers: { 'Authorization': getToken() }
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            meatItems = await res.json();
            renderMeatMenu();
        } catch (err) {
            console.error('Failed to load meat menu:', err);
            if (meatMenuList) {
                meatMenuList.innerHTML = '<p>Failed to load meat items: ' + err.message + '</p>';
            }
        }
    }
    
    async function fetchMeatsOfDay() {
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/meats', {
                headers: { 'Authorization': getToken() }
            });
            meatsOfDay = await res.json();
            renderMeatsOfDay();
        } catch (err) {
            console.error('Failed to load meats of day:', err);
            meatsOfDayList.innerHTML = '<p>Failed to load meats of day</p>';
        }
    }
    
    function renderMeatMenu() {
        if (!meatItems.length) {
            meatMenuList.innerHTML = '<p>No meat items found</p>';
            return;
        }
        meatMenuList.innerHTML = meatItems.map(meat => `
            <div class="meat-item">
                <img src="${meat.image || 'placeholder.jpg'}" alt="${meat.name}">
                <h4>${meat.name}</h4>
                <p>Ksh ${meat.price}</p>
                <button onclick="editMeat('${meat._id}')">Edit</button>
                <button onclick="deleteMeat('${meat._id}')">Delete</button>
            </div>
        `).join('');
    }
    
    function renderMeatsOfDay() {
        if (!meatsOfDay.length) {
            meatsOfDayList.innerHTML = '<p>No meats of day set</p>';
            return;
        }
        meatsOfDayList.innerHTML = meatsOfDay.map(meat => `
            <div class="meat-of-day">
                <h4>${meat.name}</h4>
                <p>Ksh ${meat.price}</p>
                <button onclick="editMeatOfDay('${meat._id}')">Edit</button>
                <button onclick="removeMeatOfDay('${meat._id}')">Remove</button>
            </div>
        `).join('');
    }
    
    function getToken() {
        let token = localStorage.getItem('adminToken') || '';
        // Ensure we don't add 'Bearer ' prefix multiple times
        if (token && !token.startsWith('Bearer ')) {
            return `Bearer ${token}`;
        }
        return token;
    }
    
    function openAddModal(type) {
        addType = type;
        addMeatModal.style.display = 'flex';
        // Reset form
        if (addMeatForm) addMeatForm.reset();
    }
    
    function closeMeatModal() {
        addMeatModal.style.display = 'none';
        editId = null;
    }
    
    async function handleSubmit(e) {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        
        const formData = new FormData(addMeatForm);
        const meatData = {
            name: formData.get('meatName'),
            price: parseFloat(formData.get('meatPrice')),
            category: formData.get('meatCategory'),
            description: formData.get('meatDescription'),
            quantity: parseInt(formData.get('meatQuantity')) || 10
        };
        
        try {
            const url = editId 
                ? `https://aticas-backend.onrender.com/api/meats/${editId}`
                : 'https://aticas-backend.onrender.com/api/meats';
                
            const method = editId ? 'PUT' : 'POST';
            
            const token = getToken();
            console.log('Using token:', token ? 'Token exists' : 'No token found');
            console.log('Sending request to:', url);
            console.log('Request data:', meatData);
            
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(meatData)
            });
            
            const responseData = await res.json().catch(() => ({}));
            console.log('Response status:', res.status);
            console.log('Response data:', responseData);
            
            if (!res.ok) {
                const errorMsg = responseData.message || `HTTP error! status: ${res.status}`;
                console.error('Error response:', errorMsg);
                throw new Error(errorMsg);
            }
            
            closeMeatModal();
            fetchMeatItems();
            showToast(editId ? 'Meat updated successfully' : 'Meat added successfully');
            
        } catch (err) {
            console.error('Error saving meat:', err);
            showToast('Failed to save meat', 'error');
        } finally {
            isSubmitting = false;
        }
    }
    
    // Global functions
    window.editMeat = function(id) {
        const meat = meatItems.find(m => m._id === id);
        if (!meat) return;
        
        editId = id;
        document.getElementById('meatName').value = meat.name || '';
        document.getElementById('meatPrice').value = meat.price || '';
        document.getElementById('meatCategory').value = meat.category || 'beef';
        document.getElementById('meatDescription').value = meat.description || '';
        document.getElementById('meatQuantity').value = meat.quantity || 10;
        
        openAddModal('menu');
    };
    
    window.deleteMeat = async function(id) {
        if (!confirm('Are you sure you want to delete this meat item?')) return;
        
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/meats/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getToken() }
            });
            
            if (!res.ok) throw new Error('Failed to delete meat');
            
            fetchMeatItems();
            showToast('Meat deleted');
        } catch (err) {
            console.error('Error deleting meat:', err);
            showToast('Failed to delete meat', 'error');
        }
    };
    
    window.removeMeatOfDay = async function(id) {
        if (!confirm('Remove from today\'s specials?')) return;
        
        try {
            const res = await fetch(`https://aticas-backend.onrender.com/api/meats/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': getToken() }
            });
            
            if (!res.ok) throw new Error('Failed to remove');
            
            fetchMeatsOfDay();
            showToast('Removed from today\'s specials');
        } catch (err) {
            console.error('Error removing meat of day:', err);
            showToast('Failed to remove', 'error');
        }
    };
    
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }, 100);
    }
});
