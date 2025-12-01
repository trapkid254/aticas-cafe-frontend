document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        window.location.href = '/admin/admin-login.html';
        return;
    }

    // State
    let allEvents = [];
    let editingEventId = null;

    // DOM Elements
    const eventsGrid = document.getElementById('eventsGrid');
    const loadingDiv = document.getElementById('loading');
    const errorMsg = document.getElementById('errorMsg');
    const noResults = document.getElementById('noResults');
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const addEventBtn = document.getElementById('addEventBtn');
    const eventModal = document.getElementById('eventModal');
    const closeModalBtn = document.getElementById('closeEventModal');
    const eventForm = document.getElementById('eventForm');
    const modalTitle = document.getElementById('modalTitle');

    // Event Listeners
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => openEventModal());
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => closeEventModal());
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterEvents);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', filterEvents);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterEvents);
    }
    
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === eventModal) {
            closeEventModal();
        }
    });

    // Initialize
    loadEvents();

    // Functions
    async function loadEvents() {
        showLoading(true);
        try {
            const response = await fetch('https://aticas-backend.onrender.com/api/events', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load events');
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.events)) {
                allEvents = data.events;
                displayEvents(allEvents);
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error('Error loading events:', error);
            showError('Failed to load events. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    function displayEvents(events) {
        if (!events || events.length === 0) {
            noResults.style.display = 'block';
            eventsGrid.style.display = 'none';
            return;
        }

        noResults.style.display = 'none';
        eventsGrid.style.display = 'grid';
        eventsGrid.innerHTML = '';

        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <div class="event-image-container">
                    <img src="${event.image || '../images/1b.jpg'}" alt="${event.title}" onerror="this.src='../images/1b.jpg';">
                    <span class="event-type ${event.type}">${event.type}</span>
                </div>
                <div class="event-details">
                    <h3>${event.title}</h3>
                    <p class="event-date">
                        <i class="far fa-calendar-alt"></i> 
                        ${new Date(event.date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                    <p class="event-location">
                        <i class="fas fa-map-marker-alt"></i> 
                        ${event.location || 'Location not specified'}
                    </p>
                    <div class="event-actions">
                        <button class="btn btn-edit" onclick="editEvent('${event._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-delete" onclick="deleteEvent('${event._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            eventsGrid.appendChild(eventCard);
        });
    }

    function filterEvents() {
        const searchTerm = searchInput.value.toLowerCase();
        const type = typeFilter.value;
        const status = statusFilter.value;

        const filtered = allEvents.filter(event => {
            const matchesSearch = event.title.toLowerCase().includes(searchTerm) || 
                                event.description.toLowerCase().includes(searchTerm);
            const matchesType = !type || event.type === type;
            const matchesStatus = !status || 
                                (status === 'active' ? isEventActive(event) : !isEventActive(event));
            
            return matchesSearch && matchesType && matchesStatus;
        });

        displayEvents(filtered);
    }

    function isEventActive(event) {
        const now = new Date();
        const eventDate = new Date(event.date);
        return eventDate > now;
    }

    function openEventModal(eventId = null) {
        editingEventId = eventId;
        const form = document.getElementById('eventForm');
        
        if (eventId) {
            // Edit mode
            const event = allEvents.find(e => e._id === eventId);
            if (!event) return;
            
            modalTitle.textContent = 'Edit Event';
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventType').value = event.type;
            
            // Format date for datetime-local input
            const date = new Date(event.date);
            const formattedDate = date.toISOString().slice(0, 16);
            document.getElementById('eventDate').value = formattedDate;
            
            document.getElementById('eventLocation').value = event.location || '';
            document.getElementById('eventCapacity').value = event.capacity || '';
            document.getElementById('eventPrice').value = event.price || '';
            document.getElementById('isActive').checked = event.isActive !== false;
        } else {
            // Add new mode
            modalTitle.textContent = 'Add New Event';
            form.reset();
            document.getElementById('isActive').checked = true;
        }
        
        eventModal.style.display = 'flex';
    }

    function closeEventModal() {
        eventModal.style.display = 'none';
        eventForm.reset();
        editingEventId = null;
    }

    async function handleEventSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(eventForm);
        const eventData = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            date: formData.get('date'),
            location: formData.get('location') || undefined,
            capacity: formData.get('capacity') ? parseInt(formData.get('capacity')) : undefined,
            price: formData.get('price') ? parseFloat(formData.get('price')) : undefined,
            isActive: formData.get('isActive') === 'on'
        };

        // Basic validation
        if (!eventData.title || !eventData.description || !eventData.type || !eventData.date) {
            showError('Please fill in all required fields');
            return;
        }

        try {
            showLoading(true);
            const url = editingEventId 
                ? `https://aticas-backend.onrender.com/api/events/${editingEventId}`
                : 'https://aticas-backend.onrender.com/api/events';
            
            const method = editingEventId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${adminToken}`
                },
                body: JSON.stringify(eventData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to save event');
            }

            showSuccess(editingEventId ? 'Event updated successfully' : 'Event created successfully');
            closeEventModal();
            await loadEvents();
        } catch (error) {
            console.error('Error saving event:', error);
            showError(error.message || 'Failed to save event');
        } finally {
            showLoading(false);
        }
    }

    // Make these functions available globally for inline handlers
    window.editEvent = async function(eventId) {
        openEventModal(eventId);
    };

    window.deleteEvent = async function(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }

        try {
            showLoading(true);
            const adminType = window.getAdminType ? window.getAdminType() : 'cafeteria';
            const response = await fetch(`https://aticas-backend.onrender.com/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'X-Admin-Type': adminType,
                    'Content-Type': 'application/json'
                }
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                const errorMessage = responseData.message || 'Failed to delete event';
                throw new Error(errorMessage);
            }

            showSuccess('Event deleted successfully');
            await loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            const errorMessage = error.message || 'Failed to delete event. Please try again.';
            showError(errorMessage);
            
            // If unauthorized, redirect to login
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                localStorage.removeItem('adminToken');
                window.location.href = '/admin/admin-login.html';
            }
        } finally {
            showLoading(false);
        }
    };

    // Helper functions
    function showLoading(show) {
        loadingDiv.style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 5000);
    }

    function showSuccess(message) {
        // You can implement a success notification system here
        alert(message);
    }
});
