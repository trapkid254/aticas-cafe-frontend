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
            // Use admin events endpoint so admins can manage all events (not just public/upcoming)
            const response = await fetch('https://aticas-backend.onrender.com/api/admin/events', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin/admin-login.html';
                    return;
                }
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to load events');
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.events)) {
                allEvents = data.events;
                displayEvents(allEvents);
                
                // Show message if no events found
                if (allEvents.length === 0) {
                    noResults.style.display = 'block';
                    eventsGrid.innerHTML = '';
                } else {
                    noResults.style.display = 'none';
                }
            } else {
                throw new Error('Invalid data format received from server');
            }
        } catch (error) {
            console.error('Error loading events:', error);
            showError(`Error: ${error.message}`);
            eventsGrid.innerHTML = '';
            noResults.style.display = 'block';
            noResults.textContent = 'Failed to load events. Please try refreshing the page.';
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
            const titleEl = document.getElementById('eventTitle');
            const descEl = document.getElementById('eventDescription');
            const typeEl = document.getElementById('eventType');
            const dateEl = document.getElementById('eventDate');
            const locEl = document.getElementById('eventLocation');
            const capEl = document.getElementById('eventCapacity');
            const priceEl = document.getElementById('eventPrice');
            const activeEl = document.getElementById('eventActive'); // matches events.html

            if (titleEl) titleEl.value = event.title || '';
            if (descEl) descEl.value = event.description || '';
            if (typeEl) typeEl.value = event.type || '';

            // Format date for datetime-local input
            if (dateEl && event.date) {
                const date = new Date(event.date);
                const formattedDate = date.toISOString().slice(0, 16);
                dateEl.value = formattedDate;
            }
            
            if (locEl) locEl.value = event.location || '';
            if (capEl) capEl.value = event.capacity || '';
            if (priceEl) priceEl.value = event.price || '';
            if (activeEl) activeEl.checked = event.active !== false;
        } else {
            // Add new mode
            modalTitle.textContent = 'Add New Event';
            if (form) form.reset();
            const activeEl = document.getElementById('eventActive');
            if (activeEl) activeEl.checked = true;
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
        if (!eventId) {
            showError('Invalid event ID');
            return;
        }

        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }

        try {
            showLoading(true);
            // Use admin delete endpoint that exists on the backend
            const response = await fetch(`https://aticas-backend.onrender.com/api/admin/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Safely parse JSON if available; fall back to generic message
            let data = null;
            let rawText = '';
            try {
                rawText = await response.text();
                data = rawText ? JSON.parse(rawText) : null;
            } catch {
                data = null;
            }

            if (!response.ok) {
                if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin/admin-login.html';
                    return;
                } else if (response.status === 404) {
                    throw new Error('Event not found or already deleted');
                } else {
                    const serverMessage = data && (data.message || data.error);
                    throw new Error(serverMessage || `Failed to delete event (status ${response.status})`);
                }
            }

            showSuccess('Event deleted successfully');
            await loadEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            showError(error.message || 'Failed to delete event. Please try again.');
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
