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
        // Get the raw token from localStorage
        const token = localStorage.getItem('adminToken');
        
        if (!token) {
            console.error('No admin token found in localStorage');
            return '';
        }
        
        // Debug log the raw token (first 10 chars only for security)
        console.log('Raw token from localStorage:', token.substring(0, 10) + '...');
        
        // Check if token is a valid JWT (3 parts separated by dots)
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
            console.error('Invalid JWT format in token');
            return '';
        }
        
        // Ensure the token has the Bearer prefix
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log('Formatted token:', formattedToken.substring(0, 15) + '...');
        
        return formattedToken;
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
        
        const formData = new FormData(addMeatForm);
        const meatData = {
            name: formData.get('name'),
            price: parseFloat(formData.get('price')),
            description: formData.get('description') || '',
            quantity: parseInt(formData.get('quantity')) || 1,
            image: formData.get('image')
        };

        const token = getToken();
        console.log('Using token for request:', token ? 'Token exists' : 'No token');
        
        if (!token) {
            alert('Please log in to continue');
            window.location.href = '/butchery-admin/butcheryadmin-login.html';
            return;
        }

        const url = 'https://aticas-backend.onrender.com/api/meats';
        const method = editId ? 'PUT' : 'POST';
        const requestUrl = editId ? `${url}/${editId}` : url;

        try {
            console.log('Sending request to:', requestUrl);
            console.log('Request method:', method);
            console.log('Request payload:', meatData);
            
            const response = await fetch(requestUrl, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify(meatData)
            });

            const responseData = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', responseData);

            if (!response.ok) {
                throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
            }

            closeMeatModal();
            fetchMeatItems();
        } catch (error) {
            console.error('Error saving meat:', error);
            const errorMessage = error.message || 'Failed to save meat. Please try again.';
            alert(`Error: ${errorMessage}`);
            showToast(errorMessage, 'error');
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
