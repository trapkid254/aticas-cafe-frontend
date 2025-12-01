document.addEventListener('DOMContentLoaded', function() {
    // Get the event ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');
    
    // DOM elements
    const eventContainer = document.getElementById('eventContainer');
    const loadingDiv = document.getElementById('loading');
    const errorContainer = document.getElementById('errorContainer');
    const errorText = document.getElementById('errorText');
    
    // Show loading state
    loadingDiv.style.display = 'block';
    eventContainer.style.display = 'none';
    errorContainer.style.display = 'none';
    
    // Fetch event details
    async function fetchEventDetails(eventId) {
        try {
            const response = await fetch(`https://aticas-backend.onrender.com/api/events`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.events && Array.isArray(data.events)) {
                // Find the specific event by ID from the events array
                const event = data.events.find(e => e._id === eventId);
                
                if (event) {
                    displayEventDetails(event);
                } else {
                    throw new Error('Event not found');
                }
            } else {
                throw new Error('Invalid events data received');
            }
        } catch (error) {
            console.error('Error fetching event details:', error);
            showError(`Failed to load event: ${error.message}. Please try again later.`);
        } finally {
            loadingDiv.style.display = 'none';
        }
    }
    
    // Display event details
    function displayEventDetails(event) {
        // Format date
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Handle image URL
        let imageUrl = 'images/1b.jpg'; // Default fallback
        if (event.image) {
            if (event.image.startsWith('http')) {
                imageUrl = event.image;
            } else if (event.image.startsWith('/uploads/')) {
                imageUrl = `https://aticas-backend.onrender.com${event.image}`;
            }
        }
        
        // Create event details HTML
        const eventHTML = `
            <div class="event-details">
                <div class="event-header">
                    <img src="${imageUrl}" alt="${event.title}" class="event-image" onerror="this.src='images/1b.jpg';">
                    <div class="event-info">
                        <h1 class="event-title">${event.title}</h1>
                        <div class="event-meta">
                            <div class="meta-item">
                                <i class="far fa-calendar-alt"></i>
                                <span>${eventDate}</span>
                            </div>
                            ${event.location ? `
                            <div class="meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${event.location}</span>
                            </div>` : ''}
                            ${event.price ? `
                            <div class="meta-item">
                                <i class="fas fa-tag"></i>
                                <span>Ksh ${event.price.toLocaleString()} ${event.priceType || 'per person'}</span>
                            </div>` : ''}
                        </div>
                        ${event.description ? `
                        <div class="event-description">
                            <h3>About This Event</h3>
                            <p>${event.description}</p>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="booking-form">
                    <h2>Book This Event</h2>
                    ${renderBookingForm(event)}
                </div>
            </div>
        `;
        
        eventContainer.innerHTML = eventHTML;
        eventContainer.style.display = 'block';
        
        // Add event listeners for the booking form
        setupBookingForm(event);
    }
    
    // Render booking form based on event type
    function renderBookingForm(event) {
        const isLoggedIn = localStorage.getItem('userToken') !== null;
        const loginPrompt = !isLoggedIn ? `
            <div class="login-prompt">
                Already have an account? <a href="login.html?redirect=event-booking.html?id=${event._id}">Log in</a> to book faster.
            </div>
        ` : '';
        
        if (event.price) {
            return `
                <form id="bookingForm">
                    <div class="form-group">
                        <label for="attendees">Number of People</label>
                        <input type="number" id="attendees" class="form-control" min="1" value="1" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="specialRequests">Special Requests (Optional)</label>
                        <textarea id="specialRequests" class="form-control" rows="3"></textarea>
                    </div>
                    
                    <div class="price-summary">
                        <div class="price-row">
                            <span>Price per person:</span>
                            <span>Ksh ${event.price.toLocaleString()}</span>
                        </div>
                        <div class="price-row">
                            <span>Number of people:</span>
                            <span id="attendeeCount">1</span>
                        </div>
                        <div class="price-row total-price">
                            <span>Total:</span>
                            <span id="totalPrice">Ksh ${event.price.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    ${isLoggedIn ? `
                        <button type="submit" class="btn-book">Continue to Payment</button>
                    ` : `
                        <a href="login.html?redirect=event-booking.html?id=${event._id}" class="btn btn-book">Log In to Book</a>
                    `}
                    
                    ${loginPrompt}
                    
                    <div id="bookingError" class="error-message"></div>
                    <div id="bookingSuccess" class="success-message"></div>
                </form>
            `;
        } else {
            return `
                <form id="bookingForm">
                    <div class="form-group">
                        <label for="specialRequests">Special Requests (Optional)</label>
                        <textarea id="specialRequests" class="form-control" rows="3"></textarea>
                    </div>
                    
                    ${isLoggedIn ? `
                        <button type="submit" class="btn-book">Book Now</button>
                    ` : `
                        <a href="login.html?redirect=event-booking.html?id=${event._id}" class="btn btn-book">Log In to Book</a>
                    `}
                    
                    ${loginPrompt}
                    
                    <div id="bookingError" class="error-message"></div>
                    <div id="bookingSuccess" class="success-message"></div>
                </form>
            `;
        }
    }
    
    // Setup booking form event listeners
    function setupBookingForm(event) {
        const bookingForm = document.getElementById('bookingForm');
        if (!bookingForm) return;
        
        // Update price when number of attendees changes
        const attendeesInput = document.getElementById('attendees');
        const attendeeCount = document.getElementById('attendeeCount');
        const totalPrice = document.getElementById('totalPrice');
        
        if (attendeesInput && event.price) {
            attendeesInput.addEventListener('input', (e) => {
                const count = parseInt(e.target.value) || 0;
                const total = count * event.price;
                
                if (attendeeCount) attendeeCount.textContent = count;
                if (totalPrice) totalPrice.textContent = `Ksh ${total.toLocaleString()}`;
            });
        }
        
        // Handle form submission
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Check if user is logged in
            const token = localStorage.getItem('userToken');
            if (!token) {
                window.location.href = `login.html?redirect=event-booking.html?id=${event._id}`;
                return;
            }
            
            const bookingData = {
                eventId: event._id,
                attendees: event.price ? parseInt(attendeesInput?.value) || 1 : 1,
                specialRequests: document.getElementById('specialRequests')?.value || '',
                totalPrice: event.price ? (event.price * (parseInt(attendeesInput?.value) || 1)) : 0
            };
            
            try {
                const response = await fetch('https://aticas-backend.onrender.com/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(bookingData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to book event');
                }
                
                // Show success message
                showBookingSuccess('Booking successful! Redirecting to your bookings...');
                
                // Redirect to bookings page after a short delay
                setTimeout(() => {
                    window.location.href = 'my-bookings.html';
                }, 2000);
                
            } catch (error) {
                console.error('Booking error:', error);
                showBookingError(error.message || 'Failed to book event. Please try again.');
            }
        });
    }
    
    // Show error message
    function showError(message) {
        errorText.textContent = message;
        errorContainer.style.display = 'block';
    }
    
    // Show booking error
    function showBookingError(message) {
        const errorDiv = document.getElementById('bookingError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }
    
    // Show booking success
    function showBookingSuccess(message) {
        const successDiv = document.getElementById('bookingSuccess');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'block';
        }
    }
    
    // Initialize the page
    if (!eventId) {
        showError('No event ID provided');
        loadingDiv.style.display = 'none';
    } else {
        fetchEventDetails(eventId);
    }
});
