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
        
        // Check if user is admin
        const isAdmin = localStorage.getItem('adminToken') !== null;
        const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
        const adminType = adminData.type || 'cafeteria';
        
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
        const isAdmin = localStorage.getItem('adminToken') !== null;
        const loginPrompt = !isLoggedIn ? `
            <div class="login-prompt">
                Already have an account? <a href="login.html?redirect=event-booking.html?id=${event._id}">Log in</a> to book faster.
            </div>
        ` : '';
        
        // Check if negotiation is active
        const hasNegotiation = event.negotiation && event.negotiation.status;
        const isNegotiationActive = hasNegotiation && 
                                  event.negotiation.status !== 'rejected' && 
                                  event.negotiation.status !== 'cancelled';
        
        // If event has a fixed price, show standard booking form
        if (event.price && !event.allowNegotiation) {
            return renderStandardBookingForm(event, isLoggedIn, loginPrompt);
        }
        
        // If negotiation is active, show negotiation status and messages
        if (hasNegotiation) {
            return renderNegotiationStatus(event, isLoggedIn, isAdmin);
        }
        
        // Show negotiation form for non-fixed price events
        return renderNegotiationForm(event, isLoggedIn, loginPrompt);
    }
    
    // Render standard booking form for fixed price events
    function renderStandardBookingForm(event, isLoggedIn, loginPrompt) {
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
                
                ${isLoggedIn 
                    ? '<button type="submit" class="btn-book">Continue to Payment</button>'
                    : `<a href="login.html?redirect=event-booking.html?id=${event._id}" class="btn btn-book">Log In to Book</a>`
                }
                
                ${loginPrompt}
                
                <div id="bookingError" class="error-message"></div>
                <div id="bookingSuccess" class="success-message"></div>
            </form>
        `;
    }
    
    // Render negotiation status and messages
    function renderNegotiationStatus(event, isLoggedIn, isAdmin) {
        const { negotiation } = event;
        const isCustomer = !isAdmin && isLoggedIn;
        const isPending = negotiation.status === 'pending';
        const isCountered = negotiation.status === 'countered';
        const isAccepted = negotiation.status === 'accepted';
        
        let actionButtons = '';
        
        if (isCustomer) {
            if (isCountered) {
                actionButtons = `
                    <div class="negotiation-actions">
                        <button type="button" class="btn btn-success" id="acceptOfferBtn">
                            Accept Offer (Ksh ${negotiation.proposedPrice?.toLocaleString()})
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="counterOfferBtn">
                            Make Counter Offer
                        </button>
                    </div>
                `;
            } else if (isPending) {
                actionButtons = `
                    <div class="alert alert-info">
                        Your price proposal of Ksh ${negotiation.proposedPrice?.toLocaleString()} is under review.
                    </div>
                `;
            }
        } else if (isAdmin) {
            if (isPending || isCountered) {
                actionButtons = `
                    <div class="negotiation-actions">
                        <button type="button" class="btn btn-success" id="acceptNegotiationBtn">
                            Accept (Ksh ${negotiation.proposedPrice?.toLocaleString()})
                        </button>
                        <button type="button" class="btn btn-warning" id="counterNegotiationBtn">
                            Counter Offer
                        </button>
                        <button type="button" class="btn btn-danger" id="rejectNegotiationBtn">
                            Reject
                        </button>
                    </div>
                `;
            }
        }
        
        const messages = (negotiation.messages || []).map(msg => `
            <div class="message ${msg.sender === 'admin' ? 'admin-message' : 'user-message'}">
                <div class="message-header">
                    <strong>${msg.sender === 'admin' ? 'Admin' : 'You'}</strong>
                    <small>${new Date(msg.timestamp).toLocaleString()}</small>
                </div>
                <div class="message-content">
                    ${msg.text}
                    ${msg.price ? `<div class="message-price">Proposed: Ksh ${msg.price?.toLocaleString()}</div>` : ''}
                </div>
            </div>
        `).join('');
        
        return `
            <div class="negotiation-container">
                <h3>Price Negotiation</h3>
                <div class="negotiation-status alert alert-${isAccepted ? 'success' : isPending ? 'info' : 'warning'}">
                    Status: <strong>${negotiation.status.toUpperCase()}</strong>
                    ${isAccepted ? `- Agreed Price: Ksh ${negotiation.agreedPrice?.toLocaleString()}` : ''}
                </div>
                
                <div class="negotiation-messages">
                    ${messages}
                </div>
                
                ${actionButtons}
                
                <div id="counterOfferForm" style="display: none; margin-top: 20px;">
                    <div class="form-group">
                        <label for="counterPrice">Your Price (Ksh)</label>
                        <input type="number" id="counterPrice" class="form-control" 
                               min="1" step="100" required>
                    </div>
                    <div class="form-group">
                        <label for="counterMessage">Message (Optional)</label>
                        <textarea id="counterMessage" class="form-control" rows="3"></textarea>
                    </div>
                    <button type="button" class="btn btn-primary" id="submitCounterOffer">
                        Submit Counter Offer
                    </button>
                    <button type="button" class="btn btn-link" id="cancelCounterOffer">
                        Cancel
                    </button>
                </div>
            </div>
            
            <div class="booking-actions mt-4">
                ${isAccepted ? `
                    <button type="button" class="btn btn-primary" id="proceedToBooking">
                        Proceed with Booking (Ksh ${negotiation.agreedPrice?.toLocaleString()})
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    // Render negotiation form for non-fixed price events
    function renderNegotiationForm(event, isLoggedIn, loginPrompt) {
        return `
            <div class="negotiation-container">
                <h3>Request a Custom Price</h3>
                <p>This event doesn't have a fixed price. Please submit your proposed price and we'll get back to you shortly.</p>
                
                ${!isLoggedIn ? `
                    <div class="alert alert-warning">
                        Please <a href="login.html?redirect=event-booking.html?id=${event._id}">log in</a> to submit a price request.
                    </div>
                ` : `
                    <form id="negotiationForm">
                        <div class="form-group">
                            <label for="proposedPrice">Your Proposed Price (Ksh)</label>
                            <input type="number" id="proposedPrice" class="form-control" 
                                   min="1" step="100" required>
                        </div>
                        <div class="form-group">
                            <label for="attendees">Number of People</label>
                            <input type="number" id="attendees" class="form-control" min="1" value="1" required>
                        </div>
                        <div class="form-group">
                            <label for="specialRequests">Special Requests (Optional)</label>
                            <textarea id="specialRequests" class="form-control" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            Submit Price Request
                        </button>
                    </form>
                    ${loginPrompt}
                `}
            </div>
        `;
    }
    
    // Setup negotiation form handlers
    function setupNegotiationForm(event, form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const proposedPrice = parseFloat(document.getElementById('proposedPrice').value);
            const attendees = parseInt(document.getElementById('attendees').value) || 1;
            const specialRequests = document.getElementById('specialRequests').value || '';
            
            if (isNaN(proposedPrice) || proposedPrice <= 0) {
                showError('Please enter a valid price');
                return;
            }
            
            try {
                const token = localStorage.getItem('userToken');
                if (!token) {
                    window.location.href = `login.html?redirect=event-booking.html?id=${event._id}`;
                    return;
                }
                
                const response = await fetch(`https://aticas-backend.onrender.com/api/events/${event._id}/negotiate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        proposedPrice,
                        attendees,
                        specialRequests,
                        message: 'Initial price proposal'
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to submit price proposal');
                }
                
                const data = await response.json();
                if (data.success) {
                    // Reload the page to show the updated negotiation status
                    window.location.reload();
                } else {
                    throw new Error(data.message || 'Failed to submit price proposal');
                }
            } catch (error) {
                console.error('Error submitting price proposal:', error);
                showError(error.message || 'Failed to submit price proposal');
            }
        });
        
        // Setup counter offer button handlers if they exist
        setupCounterOfferHandlers(event);
    }
    
    // Setup counter offer button handlers
    function setupCounterOfferHandlers(event) {
        // Show/hide counter offer form
        const counterOfferBtn = document.getElementById('counterOfferBtn');
        const counterNegotiationBtn = document.getElementById('counterNegotiationBtn');
        const counterOfferForm = document.getElementById('counterOfferForm');
        const cancelCounterOffer = document.getElementById('cancelCounterOffer');
        
        const showCounterForm = () => {
            if (counterOfferForm) counterOfferForm.style.display = 'block';
        };
        
        const hideCounterForm = () => {
            if (counterOfferForm) counterOfferForm.style.display = 'none';
        };
        
        if (counterOfferBtn) {
            counterOfferBtn.addEventListener('click', showCounterForm);
        }
        
        if (counterNegotiationBtn) {
            counterNegotiationBtn.addEventListener('click', showCounterForm);
        }
        
        if (cancelCounterOffer) {
            cancelCounterOffer.addEventListener('click', hideCounterForm);
        }
        
        // Handle counter offer submission
        const submitCounterOffer = document.getElementById('submitCounterOffer');
        if (submitCounterOffer) {
            submitCounterOffer.addEventListener('click', async () => {
                const priceInput = document.getElementById('counterPrice');
                const messageInput = document.getElementById('counterMessage');
                
                const price = parseFloat(priceInput.value);
                const message = messageInput.value.trim() || 'Counter offer';
                
                if (isNaN(price) || price <= 0) {
                    showError('Please enter a valid price');
                    return;
                }
                
                try {
                    const token = localStorage.getItem(localStorage.getItem('adminToken') ? 'adminToken' : 'userToken');
                    if (!token) {
                        window.location.href = 'login.html';
                        return;
                    }
                    
                    const response = await fetch(`https://aticas-backend.onrender.com/api/events/${event._id}/counter`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'X-Admin-Type': 'cafeteria' // This will be overridden by the actual admin type from localStorage
                        },
                        body: JSON.stringify({
                            proposedPrice: price,
                            message
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to submit counter offer');
                    }
                    
                    const data = await response.json();
                    if (data.success) {
                        window.location.reload();
                    } else {
                        throw new Error(data.message || 'Failed to submit counter offer');
                    }
                } catch (error) {
                    console.error('Error submitting counter offer:', error);
                    showError(error.message || 'Failed to submit counter offer');
                }
            });
        }
        
        // Handle accept/reject actions
        setupNegotiationActionButtons(event);
    }
    
    // Setup accept/reject negotiation buttons
    function setupNegotiationActionButtons(event) {
        // Accept offer (customer)
        const acceptOfferBtn = document.getElementById('acceptOfferBtn');
        if (acceptOfferBtn) {
            acceptOfferBtn.addEventListener('click', () => handleNegotiationAction(event, 'accept'));
        }
        
        // Accept negotiation (admin)
        const acceptNegotiationBtn = document.getElementById('acceptNegotiationBtn');
        if (acceptNegotiationBtn) {
            acceptNegotiationBtn.addEventListener('click', () => handleNegotiationAction(event, 'accept'));
        }
        
        // Reject negotiation (admin)
        const rejectNegotiationBtn = document.getElementById('rejectNegotiationBtn');
        if (rejectNegotiationBtn) {
            rejectNegotiationBtn.addEventListener('click', () => handleNegotiationAction(event, 'reject'));
        }
        
        // Proceed to booking
        const proceedToBooking = document.getElementById('proceedToBooking');
        if (proceedToBooking) {
            proceedToBooking.addEventListener('click', () => {
                // This would redirect to the booking confirmation page
                window.location.href = `booking-confirmation.html?eventId=${event._id}`;
            });
        }
    }
    
    // Handle negotiation actions (accept/reject)
    async function handleNegotiationAction(event, action) {
        try {
            const isAdmin = localStorage.getItem('adminToken') !== null;
            const token = isAdmin ? localStorage.getItem('adminToken') : localStorage.getItem('userToken');
            
            if (!token) {
                window.location.href = isAdmin ? 'admin-login.html' : 'login.html';
                return;
            }
            
            const response = await fetch(`https://aticas-backend.onrender.com/api/events/${event._id}/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Admin-Type': 'cafeteria' // This will be overridden by the actual admin type from localStorage
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to ${action} negotiation`);
            }
            
            const data = await response.json();
            if (data.success) {
                window.location.reload();
            } else {
                throw new Error(data.message || `Failed to ${action} negotiation`);
            }
        } catch (error) {
            console.error(`Error ${action}ing negotiation:`, error);
            showError(error.message || `Failed to ${action} negotiation`);
        }
    }
    
    // Setup booking form event listeners
    function setupBookingForm(event) {
        const bookingForm = document.getElementById('bookingForm');
        const negotiationForm = document.getElementById('negotiationForm');
        
        if (negotiationForm) {
            setupNegotiationForm(event, negotiationForm);
            return; // Skip the rest of the booking form setup
        }
        
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
            
            // Get form values
            const attendees = event.price ? parseInt(attendeesInput?.value) || 1 : 1;
            const specialRequests = document.getElementById('specialRequests')?.value || '';
            const totalPrice = event.price ? (event.price * attendees) : 0;
            
            // Basic validation
            if (isNaN(attendees) || attendees < 1) {
                showBookingError('Please enter a valid number of attendees');
                return;
            }
            
            const bookingData = {
                eventId: event._id,
                attendees: attendees,
                specialRequests: specialRequests,
                totalPrice: totalPrice,
                // Add any additional required fields expected by the backend
                eventTitle: event.title,
                eventDate: event.date,
                eventType: event.type
            };
            
            console.log('Submitting booking:', bookingData);
            
            try {
                const response = await fetch('https://aticas-backend.onrender.com/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(bookingData),
                    credentials: 'include' // Include cookies if needed
                });
                
                console.log('Booking response status:', response.status);
                
                // Handle non-JSON responses
                let data;
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                    console.log('Booking response data:', data);
                } else {
                    const text = await response.text();
                    console.log('Non-JSON response:', text);
                    throw new Error('Invalid response from server');
                }
                
                if (!response.ok) {
                    throw new Error(data.message || `Server error: ${response.status}`);
                }
                
                // Show success message
                showBookingSuccess('Booking successful! Redirecting to your bookings...');
                
                // Redirect to bookings page after a short delay
                setTimeout(() => {
                    window.location.href = 'my-bookings.html';
                }, 2000);
                
            } catch (error) {
                console.error('Booking error:', {
                    error: error,
                    message: error.message,
                    stack: error.stack
                });
                
                // More specific error messages based on error type
                let errorMessage = 'Failed to book event. Please try again later.';
                
                if (error instanceof TypeError) {
                    errorMessage = 'Network error. Please check your connection.';
                } else if (error.message.includes('401')) {
                    errorMessage = 'Session expired. Please log in again.';
                    localStorage.removeItem('userToken');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                } else if (error.message.includes('500')) {
                    errorMessage = 'Server error. Our team has been notified. Please try again later.';
                }
                
                showBookingError(errorMessage);
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
