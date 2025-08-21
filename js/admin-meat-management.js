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
        
        // Remove any existing 'Bearer ' prefix to prevent duplication
        const cleanToken = token.replace(/^Bearer\s+/i, '');
        console.log('Cleaned token:', cleanToken.substring(0, 15) + '...');
        
        return cleanToken;
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
    
    // Add image preview functionality
    document.getElementById('meatImage')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('previewImage');
        const previewContainer = document.getElementById('imagePreview');
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                previewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            preview.src = '#';
            previewContainer.style.display = 'none';
        }
    });

    async function handleSubmit(e) {
        e.preventDefault();
        
        if (isSubmitting) return;
        isSubmitting = true;
        
        try {
            // Get form elements
            const name = document.getElementById('meatName')?.value?.trim();
            const price = document.getElementById('meatPrice')?.value;
            const description = document.getElementById('meatDescription')?.value?.trim() || '';
            const quantity = document.getElementById('meatQuantity')?.value || '1';
            const category = document.getElementById('meatCategory')?.value || 'beef';
            const imageInput = document.getElementById('meatImage');
            
            // Basic validation
            if (!name) throw new Error('Meat name is required');
            if (!price) throw new Error('Price is required');
            
            const priceNum = parseFloat(price);
            if (isNaN(priceNum) || priceNum <= 0) {
                throw new Error('Price must be a valid positive number');
            }
            
            // Handle image file
            const file = imageInput.files[0];
            
            if (!file && !editId) {
                throw new Error('Please select an image');
            }
            
            // Create form data object
            const formData = new FormData();
            formData.append('name', name);
            formData.append('price', priceNum);
            formData.append('description', description);
            formData.append('quantity', parseInt(quantity) || 1);
            formData.append('category', category);
            formData.append('adminType', 'butchery');
            
            // If editing and no new image, keep the existing one
            if (editId && !file) {
                const existingMeat = meatItems.find(m => m._id === editId);
                if (existingMeat?.image) {
                    formData.append('image', existingMeat.image);
                }
            }

            const token = getToken();
            if (!token) {
                window.location.href = '/butchery-admin/butcheryadmin-login.html';
                return;
            }

            const url = 'https://aticas-backend.onrender.com/api/meats';
            const method = editId ? 'PUT' : 'POST';
            const requestUrl = editId ? `${url}/${editId}` : url;

            console.log('Submitting form to:', requestUrl);
            console.log('Request method:', method);

            try {
                // If we have a file, append it to the form data
                if (file) {
                    console.log('Appending file:', file.name, file.type, file.size);
                    formData.append('image', file);
                }
                
                // Log form data entries
                for (let pair of formData.entries()) {
                    console.log('FormData:', pair[0], pair[1]);
                }
                
                const response = await fetch(requestUrl, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                        // Don't set Content-Type header - let the browser set it with the correct boundary
                    },
                    body: formData,
                    credentials: 'same-origin' // Only send credentials for same-origin requests
                });

                let responseData;
                try {
                    responseData = await response.json();
                } catch (e) {
                    console.error('Failed to parse JSON response:', e);
                    throw new Error('Invalid response from server');
                }
                
                if (!response.ok) {
                    console.error('Server responded with status:', response.status);
                    console.error('Response data:', responseData);
                    const errorMessage = responseData?.message || `Server error: ${response.status} ${response.statusText}`;
                    throw new Error(errorMessage);
                }

                // If successful, close the modal and refresh the list
                closeMeatModal();
                fetchMeatItems();
                showToast(editId ? 'Meat updated successfully!' : 'Meat added successfully!', 'success');
                
            } catch (error) {
                console.error('Error saving meat:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                const errorMessage = error.message || 'Failed to save meat. Please try again.';
                showToast(errorMessage, 'error');
                
                // Show alert for all errors with more details
                alert(`Error: ${errorMessage}\n\nPlease check the console for more details.`);
            }
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
