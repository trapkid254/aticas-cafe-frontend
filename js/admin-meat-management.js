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
            const res = await fetch('https://aticas-backend.onrender.com/api/meats');
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const allMeatItems = await res.json();
            meatItems = Array.isArray(allMeatItems) ? allMeatItems : [];
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
            const res = await fetch('https://aticas-backend.onrender.com/api/meats');
            
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Server responded with status:', res.status, errorText);
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Expected JSON but got:', contentType, text);
                throw new Error('Response was not JSON');
            }
            
            const allMeatItems = await res.json();
            meatsOfDay = Array.isArray(allMeatItems) ? allMeatItems : [];
            renderMeatsOfDay();
        } catch (err) {
            console.error('Failed to load meats of day:', err);
            meatsOfDayList.innerHTML = `<p>Failed to load meats of day: ${err.message}</p>`;
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
            // Verify current admin profile is butchery before proceeding
            try {
                const profRes = await fetch('https://aticas-backend.onrender.com/api/admin/profile', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (!profRes.ok) {
                    const status = profRes.status;
                    const text = await profRes.text().catch(() => '');
                    console.warn('Profile check failed', status, text);
                    showToast('Please log in as a Butchery admin to continue.', 'error');
                    try {
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminData');
                        localStorage.removeItem('adminType');
                        localStorage.removeItem('isAdminLoggedIn');
                    } catch(_) {}
                    window.location.href = '/butchery-admin/butcheryadmin-login.html';
                    return;
                }
                const prof = await profRes.json();
                const at = prof?.admin?.adminType;
                console.log('Detected adminType from profile:', at);
                if (at !== 'butchery') {
                    showToast(`You are logged in as ${at || 'a different'} admin. Please log in as Butchery admin.`, 'error');
                    try {
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminData');
                        localStorage.removeItem('adminType');
                        localStorage.removeItem('isAdminLoggedIn');
                    } catch(_) {}
                    window.location.href = '/butchery-admin/butcheryadmin-login.html';
                    return;
                }
            } catch (pfErr) {
                console.warn('Admin profile verification error:', pfErr?.message || pfErr);
                showToast('Authentication required. Please log in as Butchery admin.', 'error');
                try {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('adminData');
                    localStorage.removeItem('adminType');
                    localStorage.removeItem('isAdminLoggedIn');
                } catch(_) {}
                window.location.href = '/butchery-admin/butcheryadmin-login.html';
                return;
            }

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
            
            // Create request payload
            const payload = {
                name,
                price: priceNum,
                description,
                quantity: parseInt(quantity) || 1,
                category,
                adminType: 'butchery'
            };
            
            // If editing and no new image, keep the existing image
            if (editId && !file) {
                const existingMeat = meatItems.find(m => m._id === editId);
                if (existingMeat?.image) {
                    payload.image = existingMeat.image;
                }
            }
            
            // If we have a file, convert it to base64
            if (file) {
                payload.image = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(file);
                });
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
                // Ensure payload is a valid object
                if (!payload || typeof payload !== 'object') {
                    throw new Error('Invalid payload format');
                }

                // Log the payload being sent
                const requestBody = JSON.stringify(payload);
                console.log('Sending request to:', requestUrl);
                console.log('Request method:', method);
                console.log('Request headers:', {
                    'Authorization': `Bearer ${token.substring(0, 10)}...`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                });
                console.log('Request body:', requestBody);

                // Create a simple, clean payload with only the fields the server expects
                const cleanPayload = {
                    name: String(payload.name || ''),
                    price: Number(payload.price || 0),
                    description: String(payload.description || ''),
                    quantity: Number(payload.quantity || 1),
                    category: String(payload.category || 'beef'),
                    image: String(payload.image || '')
                };
                
                // Log the payload being sent
                console.log('Sending clean payload:', cleanPayload);
                
                // Create a new headers object
                const headers = new Headers();
                headers.append('Authorization', `Bearer ${token}`);
                headers.append('Content-Type', 'application/json');
                headers.append('Accept', 'application/json');
                
                // Create the request with explicit headers
                const response = await fetch(requestUrl, {
                    method,
                    headers,
                    mode: 'cors',
                    cache: 'no-cache',
                    credentials: 'same-origin',
                    body: JSON.stringify(cleanPayload)
                });
                
                console.log('Request headers:', Object.fromEntries(headers.entries()));

                console.log('Response status:', response.status, response.statusText);
                console.log('Response headers:');
                response.headers.forEach((value, key) => {
                    console.log(`  ${key}: ${value}`);
                });

                let responseData;
                let responseText;
                try {
                    responseText = await response.text();
                    responseData = responseText ? JSON.parse(responseText) : {};
                } catch (e) {
                    console.error('Failed to parse JSON response. Response text:', responseText);
                    throw new Error('Invalid response from server');
                }
                
                if (!response.ok) {
                    console.error('Server responded with status:', response.status);
                    console.error('Response headers:', Object.fromEntries(response.headers.entries()));
                    console.error('Response data:', responseData);
                    
                    // Try to extract a meaningful error message
                    let errorMessage = 'Failed to save meat';
                    if (responseData && typeof responseData === 'object') {
                        errorMessage = responseData.message || 
                                     responseData.error || 
                                     JSON.stringify(responseData);
                    } else if (responseText) {
                        errorMessage = responseText.length > 100 ? 
                                     `${responseText.substring(0, 100)}...` : 
                                     responseText;
                    }
                    
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
            const token = getToken();
            const res = await fetch(`https://aticas-backend.onrender.com/api/meats/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!res.ok) {
                let msg = `Failed to delete meat (status ${res.status})`;
                try {
                    const text = await res.text();
                    msg = (() => { try { const j = JSON.parse(text); return j.message || j.error || msg; } catch { return text || msg; } })();
                } catch {}
                if (res.status === 401 || res.status === 403) {
                    showToast('Session expired. Please log in again.', 'error');
                    try {
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminData');
                        localStorage.removeItem('adminType');
                        localStorage.removeItem('isAdminLoggedIn');
                    } catch(_) {}
                    window.location.href = '/butchery-admin/butcheryadmin-login.html';
                    return;
                }
                throw new Error(msg);
            }
            
            fetchMeatItems();
            showToast('Meat deleted');
        } catch (err) {
            console.error('Error deleting meat:', err);
            alert(`Error deleting meat: ${err.message}`);
            showToast('Failed to delete meat', 'error');
        }
    };
    
    window.removeMeatOfDay = async function(id) {
        if (!confirm('Remove from today\'s specials?')) return;
        
        try {
            const token = getToken();
            const res = await fetch(`https://aticas-backend.onrender.com/api/meats/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!res.ok) {
                let msg = `Failed to remove (status ${res.status})`;
                try {
                    const text = await res.text();
                    msg = (() => { try { const j = JSON.parse(text); return j.message || j.error || msg; } catch { return text || msg; } })();
                } catch {}
                if (res.status === 401 || res.status === 403) {
                    showToast('Session expired. Please log in again.', 'error');
                    try {
                        localStorage.removeItem('adminToken');
                        localStorage.removeItem('adminData');
                        localStorage.removeItem('adminType');
                        localStorage.removeItem('isAdminLoggedIn');
                    } catch(_) {}
                    window.location.href = '/butchery-admin/butcheryadmin-login.html';
                    return;
                }
                throw new Error(msg);
            }
            
            fetchMeatsOfDay();
            showToast('Removed from today\'s specials');
        } catch (err) {
            console.error('Error removing meat of day:', err);
            alert(`Error removing: ${err.message}`);
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
