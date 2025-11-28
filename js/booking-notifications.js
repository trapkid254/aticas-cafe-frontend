// Booking Notifications System for Customers
class BookingNotifications {
    constructor() {
        this.notifications = [];
        this.token = localStorage.getItem('userToken');
        this.checkInterval = 30000; // Check every 30 seconds
        this.intervalId = null;
        this.lastCheck = localStorage.getItem('lastBookingCheck') || new Date().toISOString();

        this.init();
    }

    init() {
        if (!this.token) return;

        this.createNotificationUI();
        this.startPolling();
        this.checkForPendingResponses();
    }

    createNotificationUI() {
        // Check if notification UI already exists
        if (document.getElementById('bookingNotificationBell')) return;

        // Create notification bell in navbar
        const navbarRight = document.querySelector('.navbar-right');
        if (!navbarRight) return;

        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.style.cssText = `
            position: relative;
            display: inline-block;
            margin-right: 1rem;
        `;

        notificationContainer.innerHTML = `
            <button id="bookingNotificationBell" class="notification-bell" style="
                background: none;
                border: none;
                color: white;
                font-size: 1.2rem;
                cursor: pointer;
                position: relative;
                padding: 0.5rem;
                border-radius: 50%;
                transition: all 0.3s ease;
            ">
                <i class="fas fa-bell"></i>
                <span id="bookingNotificationCount" class="notification-count" style="
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #e74c3c;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    font-size: 0.7rem;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                ">0</span>
            </button>
            <div id="bookingNotificationDropdown" class="notification-dropdown" style="
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                width: 320px;
                max-height: 400px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                border: 1px solid #e1e5e9;
            ">
                <div class="notification-header" style="
                    padding: 1rem;
                    border-bottom: 1px solid #e1e5e9;
                    background: #27ae60;
                    color: white;
                    font-weight: bold;
                    border-radius: 8px 8px 0 0;
                ">
                    <i class="fas fa-calendar-check"></i> Booking Updates
                </div>
                <div id="bookingNotificationList" class="notification-list" style="
                    max-height: 300px;
                    overflow-y: auto;
                ">
                    <div class="no-notifications" style="
                        padding: 2rem;
                        text-align: center;
                        color: #666;
                    ">
                        <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 1rem; color: #adb5bd;"></i>
                        <p>No new booking updates</p>
                    </div>
                </div>
                <div class="notification-footer" style="
                    padding: 1rem;
                    border-top: 1px solid #e1e5e9;
                    text-align: center;
                ">
                    <a href="bookings.html" style="
                        color: #27ae60;
                        text-decoration: none;
                        font-weight: 600;
                    ">View All Bookings</a>
                </div>
            </div>
        `;

        // Insert before the cart icon
        const cartIcon = navbarRight.querySelector('.cart-icon');
        if (cartIcon) {
            navbarRight.insertBefore(notificationContainer, cartIcon);
        } else {
            navbarRight.insertBefore(notificationContainer, navbarRight.firstChild);
        }

        this.attachEventListeners();
    }

    attachEventListeners() {
        const bell = document.getElementById('bookingNotificationBell');
        const dropdown = document.getElementById('bookingNotificationDropdown');

        if (bell && dropdown) {
            bell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('bookingNotificationDropdown');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';

            if (!isVisible) {
                this.markAllAsRead();
            }
        }
    }

    startPolling() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }

        this.intervalId = setInterval(() => {
            this.checkForPendingResponses();
        }, this.checkInterval);
    }

    stopPolling() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async checkForPendingResponses() {
        if (!this.token) return;

        try {
            const response = await fetch('https://aticas-backend.onrender.com/api/bookings/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;

            const result = await response.json();
            const bookings = result.bookings || [];

            // Find bookings that need customer attention
            const pendingResponse = bookings.filter(booking =>
                booking.status === 'price_proposed' ||
                (booking.feedback && booking.feedback.some(f =>
                    f.from === 'admin' &&
                    new Date(f.timestamp) > new Date(this.lastCheck)
                ))
            );

            this.updateNotifications(pendingResponse);
            this.updateLastCheck();

        } catch (error) {
            console.error('Error checking booking notifications:', error);
        }
    }

    updateNotifications(pendingBookings) {
        this.notifications = pendingBookings;
        this.updateUI();
    }

    updateUI() {
        const count = this.notifications.length;
        const countElement = document.getElementById('bookingNotificationCount');
        const listElement = document.getElementById('bookingNotificationList');

        if (countElement) {
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'flex' : 'none';
        }

        if (listElement) {
            if (count === 0) {
                listElement.innerHTML = `
                    <div class="no-notifications" style="
                        padding: 2rem;
                        text-align: center;
                        color: #666;
                    ">
                        <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 1rem; color: #adb5bd;"></i>
                        <p>No new booking updates</p>
                    </div>
                `;
            } else {
                const notificationsHTML = this.notifications.map(booking =>
                    this.createNotificationItem(booking)
                ).join('');
                listElement.innerHTML = notificationsHTML;
            }
        }
    }

    createNotificationItem(booking) {
        const timeAgo = this.getTimeAgo(booking.lastAdminUpdate || booking.updatedAt);
        const isNewPriceProposal = booking.status === 'price_proposed';

        let message, icon, actionText;

        if (isNewPriceProposal) {
            message = `New price proposal for your ${booking.type} booking`;
            icon = 'fa-tag';
            actionText = 'Respond Now';
        } else {
            message = `New message about your ${booking.type} booking`;
            icon = 'fa-comment';
            actionText = 'View Details';
        }

        return `
            <div class="notification-item" onclick="this.handleNotificationClick('${booking._id}')" style="
                padding: 1rem;
                border-bottom: 1px solid #f1f1f1;
                cursor: pointer;
                transition: background-color 0.3s;
            " onmouseover="this.style.backgroundColor='#f8f9fa'" onmouseout="this.style.backgroundColor='white'">
                <div style="display: flex; align-items: start; gap: 1rem;">
                    <div style="
                        background: ${isNewPriceProposal ? '#27ae60' : '#17a2b8'};
                        color: white;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    ">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">
                            ${message}
                        </div>
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">
                            Booking #${booking._id.substr(-6)}
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.7rem; color: #999;">${timeAgo}</span>
                            <span style="
                                background: ${isNewPriceProposal ? '#27ae60' : '#17a2b8'};
                                color: white;
                                padding: 0.25rem 0.5rem;
                                border-radius: 4px;
                                font-size: 0.7rem;
                                font-weight: 600;
                            ">${actionText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    handleNotificationClick(bookingId) {
        // Close dropdown
        const dropdown = document.getElementById('bookingNotificationDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }

        // Navigate to bookings page with focus on specific booking
        window.location.href = `bookings.html?highlight=${bookingId}`;
    }

    getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    markAllAsRead() {
        this.updateLastCheck();
        // Clear notifications that were just admin messages (not price proposals)
        this.notifications = this.notifications.filter(booking =>
            booking.status === 'price_proposed'
        );
        this.updateUI();
    }

    updateLastCheck() {
        this.lastCheck = new Date().toISOString();
        localStorage.setItem('lastBookingCheck', this.lastCheck);
    }

    showBrowserNotification(title, message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/images/1b.jpg',
                tag: 'booking-notification'
            });
        }
    }

    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    destroy() {
        this.stopPolling();
        const container = document.querySelector('.notification-container');
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}

// Global booking notifications instance
let bookingNotifications = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('userToken')) {
        bookingNotifications = new BookingNotifications();

        // Request notification permission after user interaction
        setTimeout(() => {
            if (bookingNotifications) {
                bookingNotifications.requestNotificationPermission();
            }
        }, 5000);
    }
});

// Clean up when user logs out
window.addEventListener('beforeunload', function() {
    if (bookingNotifications) {
        bookingNotifications.destroy();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BookingNotifications;
}
