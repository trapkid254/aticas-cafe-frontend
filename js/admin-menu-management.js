// admin-menu-management.js
// Handles Menu Management page logic for ATICAS CAFE' Admin

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const mealsOfDayList = document.getElementById('mealsOfDayList');
    const menuMealsList = document.getElementById('menuMealsList');
    const addMealOfDayBtn = document.getElementById('addMealOfDayBtn');
    const addMenuMealBtn = document.getElementById('addMenuMealBtn');
    const addMealModal = document.getElementById('addMealModal');
    const closeModal = addMealModal.querySelector('.close-modal');
    const addMealForm = document.getElementById('addMealForm');
    const addMealModalTitle = document.getElementById('addMealModalTitle');
    const categoryGroup = document.getElementById('categoryGroup');
    const mealCategory = document.getElementById('mealCategory');
    const quantityGroup = document.getElementById('quantityGroup');
    const mealQuantity = document.getElementById('mealQuantity');
    const modQuantityGroup = document.getElementById('modQuantityGroup');
    const modMealQuantity = document.getElementById('modMealQuantity');
    const addPriceOptionBtn = document.getElementById('add-price-option-btn');
    const priceOptionsWrapper = document.getElementById('price-options-wrapper');

    let addType = 'menu'; // 'menu' or 'mod'
    let editId = null; // id of meal being edited
    let isSubmitting = false; // Prevent double submission
    let menuItems = [];
    let mealsOfDay = [];

    // Fetch menu items from API
    async function fetchMenuItems() {
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/menu', {
                headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
            });
            menuItems = await res.json();
            renderMenuMeals();
        } catch (err) {
            menuMealsList.innerHTML = '<p style="color:#888;">Failed to load menu meals.</p>';
        }
    }
    // Fetch meals of the day from API
    async function fetchMealsOfDay() {
        try {
            const res = await fetch('https://aticas-backend.onrender.com/api/meals', {
                headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
            });
            mealsOfDay = await res.json();
            renderMealsOfDay();
        } catch (err) {
            mealsOfDayList.innerHTML = '<p style="color:#888;">Failed to load meals of the day.</p>';
        }
    }
    // Render Meals of the Day
    function renderMealsOfDay() {
        if (!mealsOfDay.length) {
            mealsOfDayList.innerHTML = '<p style="color:#888;">No meals of the day set.</p>';
            return;
        }
        // Only show butchery items
        const filteredMealsOfDay = mealsOfDay.filter(meal => meal.type === 'butchery');
        mealsOfDayList.innerHTML = '<div class="recent-orders"><table><thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Quantity</th><th>Action</th></tr></thead><tbody>' +
            filteredMealsOfDay.map(meal => {
                const item = meal.menuItem || meal; // Use menuItem if it exists, otherwise use meal
                const imageSrc = item.image && item.image.trim() ? item.image : 'https://via.placeholder.com/120x90?text=No+Image';
                
                let priceDisplay = `Ksh ${Number(item.price).toLocaleString()}`;
                if (item.priceOptions && item.priceOptions.length > 0) {
                    priceDisplay = item.priceOptions.map(p => `Ksh ${Number(p.price).toLocaleString()}`).join(' / ');
                }

                return `
                <tr style="background: #ffffff;">
                    <td><img src="${imageSrc}" alt="${item.name}" style="width:44px;height:44px;object-fit:cover;border-radius:7px;"></td>
                    <td><b>${item.name}</b></td>
                    <td>${priceDisplay}</td>
                    <td>${meal.quantity ?? 10}</td>
                    <td>
                        <button class="action-btn" title="Edit" style="background:#27ae60;color:#fff;margin-right:8px;" onclick="editMealOfDay('${meal._id}')"><i class="fas fa-pen"></i></button>
                        <button class="action-btn" title="Delete" style="background:#e74c3c;color:#fff;" onclick="removeMealOfDay('${meal._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
                `;
            }).join('') + '</tbody></table></div>';
    }
    // Render Menu Meals
    function renderMenuMeals() {
        if (!menuItems.length) {
            menuMealsList.innerHTML = '<p style="color:#888;">No menu meals added yet.</p>';
            return;
        }
        // Only show butchery items
        const filteredMenuItems = menuItems.filter(meal => meal.type === 'butchery');
        const menuMealsListHTML = '<div class="recent-orders"><table><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Quantity</th><th>Action</th></tr></thead><tbody>' +
            filteredMenuItems.map(meal => {
                let priceDisplay = `Ksh ${Number(meal.price).toLocaleString()}`;
                if (meal.priceOptions && meal.priceOptions.length > 0) {
                    priceDisplay = meal.priceOptions.map(p => `${p.size}: Ksh ${Number(p.price).toLocaleString()}`).join('<br>');
                }

                return `
                <tr style="background: #ffffff;">
                    <td><img src="${meal.image}" alt="${meal.name}" style="width:44px;height:44px;object-fit:cover;border-radius:7px;"></td>
                    <td><b>${meal.name}</b></td>
                    <td>${meal.category}</td>
                    <td>${priceDisplay}</td>
                    <td>${meal.quantity ?? 10}</td>
                    <td>
                        <button class="action-btn" title="Edit" style="background:#27ae60;color:#fff;margin-right:8px;" onclick="editMenuMeal('${meal._id}')"><i class="fas fa-pen"></i></button>
                        <button class="action-btn" title="Delete" style="background:#e74c3c;color:#fff;" onclick="removeMenuMeal('${meal._id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
                `
            }).join('') + '</tbody></table></div>';
        menuMealsList.innerHTML = menuMealsListHTML;
    }
    // Remove meal from Meals of the Day (by id)
    window.removeMealOfDay = async function(id) {
        try {
            await fetch('https://aticas-backend.onrender.com/api/meals/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
            });
            fetchMealsOfDay();
        } catch (err) {
            alert('Failed to delete meal of the day');
        }
    };
    // Remove meal from Menu (by id)
    window.removeMenuMeal = async function(id) {
        try {
            await fetch('https://aticas-backend.onrender.com/api/menu/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': localStorage.getItem('adminToken') || '' }
            });
            fetchMenuItems();
            fetchMealsOfDay(); // In case it was also a meal of the day
        } catch (err) {
            alert('Failed to delete menu meal');
        }
    };
    // Add Meal Modal logic
    if (addMealOfDayBtn) {
        addMealOfDayBtn.onclick = function() {
            addType = 'mod';
            addMealModalTitle.textContent = 'Add Meal of the Day';
            categoryGroup.style.display = 'none';
            quantityGroup.style.display = 'none';
            modQuantityGroup.style.display = 'flex';
            addMealModal.style.display = 'flex';
            addMealModal.querySelector('.modal-content').style.background = 'yellow';
        };
    }
    if (addMenuMealBtn) {
        addMenuMealBtn.onclick = function() {
            addType = 'menu';
            addMealModalTitle.textContent = 'Add Menu Meal';
            categoryGroup.style.display = 'block';
            quantityGroup.style.display = 'flex';
            modQuantityGroup.style.display = 'none';
            mealQuantity.value = 10;
            addMealModal.style.display = 'flex';
            addMealModal.querySelector('.modal-content').style.background = 'yellow';
        };
    }
    closeModal.onclick = function() {
        addMealModal.style.display = 'none';
        addMealForm.reset();
        priceOptionsWrapper.innerHTML = ''; // Clear price options on modal close
    };
    window.onclick = function(e) {
        if (e.target === addMealModal) {
            addMealModal.style.display = 'none';
            addMealForm.reset();
            priceOptionsWrapper.innerHTML = ''; // Clear price options on modal close
        }
    };

    // Function to render price options in the modal
    function renderPriceOptions(priceOptions = []) {
        priceOptionsWrapper.innerHTML = '';
        if (priceOptions.length === 0) {
            // Add a default empty option if none exist
            addPriceOption();
        } else {
            priceOptions.forEach(option => addPriceOption(option));
        }
    }

    // Function to add a new price option field
    function addPriceOption(option = {}) {
        const div = document.createElement('div');
        div.className = 'price-option-item';
        div.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
        div.innerHTML = `
            <input type="text" class="price-option-size" placeholder="e.g., Small" value="${option.size || ''}" style="flex: 1; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px;">
            <input type="number" class="price-option-price" placeholder="Price" value="${option.price || ''}" style="flex: 1; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px;">
            <button type="button" class="remove-price-option-btn" style="padding: 0.6rem; background: #e74c3c; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                <i class="fas fa-trash"></i>
            </button>
        `;
        priceOptionsWrapper.appendChild(div);
    }

    // Event listener for adding a new price option
    addPriceOptionBtn.addEventListener('click', () => addPriceOption());

    // Event listener for removing a price option
    priceOptionsWrapper.addEventListener('click', function(e) {
        if (e.target.closest('.remove-price-option-btn')) {
            e.target.closest('.price-option-item').remove();
        }
    });

    // Edit meal function
    window.editMenuMeal = function(id) {
        const meal = menuItems.find(m => m._id === id);
        if (!meal) return;
        addType = 'edit';
        editId = id;
        addMealModalTitle.textContent = 'Edit Menu Meal';
        categoryGroup.style.display = 'block';
        quantityGroup.style.display = 'flex';
        modQuantityGroup.style.display = 'none';
        document.getElementById('mealName').value = meal.name;
        var mealDescriptionInput = document.getElementById('mealDescription');
        if (mealDescriptionInput) mealDescriptionInput.value = meal.description || '';
        document.getElementById('mealPrice').value = meal.price;
        document.getElementById('mealCategory').value = meal.category;
        mealQuantity.value = meal.quantity || 10;
        document.getElementById('mealImage').value = '';
        document.getElementById('mealImage').setAttribute('data-existing', meal.image || '');
        
        renderPriceOptions(meal.priceOptions); // Render existing price options

        addMealModal.style.display = 'flex';
        addMealModal.querySelector('.modal-content').style.background = 'yellow';
    };
    // Edit meal of the day function
    window.editMealOfDay = function(id) {
        const meal = mealsOfDay.find(m => m._id === id);
        if (!meal) return;
        addType = 'mod-edit';
        editId = id;
        addMealModalTitle.textContent = 'Edit Meal of the Day';
        categoryGroup.style.display = 'none';
        quantityGroup.style.display = 'none';
        modQuantityGroup.style.display = 'flex';
        document.getElementById('mealName').value = meal.menuItem?.name || meal.name ||'';
        modMealQuantity.value = meal.quantity ?? 10;
        document.getElementById('mealImage').value = '';
        document.getElementById('mealImage').setAttribute('data-existing', meal.menuItem?.image || meal.image || '');
        addMealModal.style.display = 'flex';
        addMealModal.querySelector('.modal-content').style.background = 'yellow';
    };
    // Add Meal Form submit
    addMealForm.onsubmit = async function(e) {
        e.preventDefault();
        if (isSubmitting) return; // Prevent double submission
        isSubmitting = true;
        const imageInput = document.getElementById('mealImage');
        const file = imageInput.files && imageInput.files[0];
        const useExistingImage = imageInput.getAttribute('data-existing') || '';
        
        // Collect price options
        const priceOptions = [];
        const priceOptionItems = priceOptionsWrapper.querySelectorAll('.price-option-item');
        priceOptionItems.forEach(item => {
            const size = item.querySelector('.price-option-size').value.trim();
            const price = parseFloat(item.querySelector('.price-option-price').value);
            if (size && !isNaN(price)) {
                priceOptions.push({ size, price });
            }
        });

        const processMeal = async (imageData) => {
            if (addType === 'menu') {
                // Add new menu meal
                const meal = {
                    name: document.getElementById('mealName').value,
                    description: document.getElementById('mealDescription') ? document.getElementById('mealDescription').value : '',
                    price: parseFloat(document.getElementById('mealPrice').value),
                    image: imageData,
                    category: mealCategory ? mealCategory.value : '',
                    quantity: parseInt(mealQuantity.value, 10) || 0,
                    priceOptions: priceOptions,
                    type: 'butchery'
                };
                await fetch('https://aticas-backend.onrender.com/api/menu', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('adminToken') || ''
                    },
                    body: JSON.stringify(meal)
                });
                fetchMenuItems();
                addMealModal.style.display = 'none';
                addMealForm.reset();
                addType = 'menu';
                editId = null;
                isSubmitting = false;
            } else if (addType === 'edit') {
                // Edit menu meal
                const meal = {
                    name: document.getElementById('mealName').value,
                    description: document.getElementById('mealDescription') ? document.getElementById('mealDescription').value : '',
                    price: parseFloat(document.getElementById('mealPrice').value),
                    image: imageData,
                    category: mealCategory ? mealCategory.value : '',
                    quantity: parseInt(mealQuantity.value, 10) || 0,
                    priceOptions: priceOptions,
                    type: 'butchery'
                };
                await fetch('https://aticas-backend.onrender.com/api/menu/' + editId, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('adminToken') || ''
                    },
                    body: JSON.stringify(meal)
                });
                fetchMenuItems();
                addMealModal.style.display = 'none';
                addMealForm.reset();
                addType = 'menu';
                editId = null;
                isSubmitting = false;
            } else if (addType === 'mod') {
                // Add to Meals of the Day (standalone)
                const name = document.getElementById('mealName').value.trim();
                const price = parseFloat(document.getElementById('mealPrice').value);
                const image = imageData;
                const quantity = parseInt(modMealQuantity.value, 10) || 10;
                if (!name || !price || !image) {
                    alert('Please fill in all fields for Meal of the Day.');
                    isSubmitting = false;
                    return;
                }
                const meal = { name, price, image, quantity, type: 'butchery' };
                await fetch('https://aticas-backend.onrender.com/api/meals', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('adminToken') || ''
                    },
                    body: JSON.stringify(meal)
                });
                fetchMealsOfDay();
                addMealModal.style.display = 'none';
                addMealForm.reset();
                addType = 'menu';
                editId = null;
                isSubmitting = false;
            } else if (addType === 'mod-edit') {
                // Edit meal of the day
                const mealData = {
                    quantity: parseInt(modMealQuantity.value, 10) || 0
                };
                await fetch('https://aticas-backend.onrender.com/api/meals/' + editId, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('adminToken') || ''
                    },
                    body: JSON.stringify(mealData)
                });
                fetchMealsOfDay();
                addMealModal.style.display = 'none';
                addMealForm.reset();
                addType = 'menu';
                editId = null;
                isSubmitting = false;
                return;
            } else {
                alert('Unknown addType: ' + addType);
                isSubmitting = false;
            }
        };
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                processMeal(evt.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            processMeal(useExistingImage);
        }
    };
    // Initial fetch
    fetchMenuItems();
    fetchMealsOfDay();
}); 