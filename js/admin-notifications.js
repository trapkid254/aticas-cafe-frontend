// Admin Notifications System
class AdminNotificationSystem {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.pollingInterval = null;
        this.lastCheckTime = new Date();
        this.isDropdownOpen = false;
        this.adminType = localStorage.getItem('adminType') || 'cafeteria';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadNotifications();
        this.startPolling();
    }

    setupEventListeners() {
        const notificationBell = document.getElementById('notificationBell');
        const notificationDropdown = document.getElementById('notificationDropdown');
        const markAllRead = document.getElementById('markAllRead');

        if (notificationBell) {
            notificationBell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });
        }

        if (markAllRead) {
            markAllRead.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationDropdown?.contains(e.target) &&
                !notificationBell?.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    async loadNotifications() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) return;

            // Load notifications from localStorage for persistence
            const savedNotifications = localStorage.getItem(`admin_notifications_${this.adminType}`);
            if (savedNotifications) {
                this.notifications = JSON.parse(savedNotifications);
                this.updateUI();
            }

            // Fetch new notifications
            await this.fetchNewNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    async fetchNewNotifications() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) return;

            // Check for new orders
            await this.checkNewOrders();

            // Check for new bookings
            await this.checkNewBookings();

            this.saveNotifications();
            this.updateUI();
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }

    async checkNewOrders() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            const response = await fetch('https://aticas-backend.onrender.com/api/orders', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'X-Admin-Type': this.adminType
                }
            });

            if (response.ok) {
                const data = await response.json();
                const orders = data.orders || data || [];

                // Filter orders created after last check
                const newOrders = orders.filter(order => {
                    const orderDate = new Date(order.createdAt || order.date);
                    return orderDate > this.lastCheckTime &&
                           order.status === 'pending';
                });

                // Create notifications for new orders
                newOrders.forEach(order => {
                    this.addNotification({
                        id: `order_${order._id}`,
                        type: 'order',
                        title: 'New Order Received',
                        message: `Order #${order._id.slice(-8)} from ${order.customerName || 'Customer'} - Ksh ${order.total}`,
                        timestamp: new Date(order.createdAt || order.date),
                        data: {
                            orderId: order._id,
                            customerName: order.customerName,
                            total: order.total
                        },
                        action: 'orders.html'
                    });
                });
            }
        } catch (error) {
            console.error('Error checking new orders:', error);
        }
    }

    async checkNewBookings() {
        try {
            const adminToken = localStorage.getItem('adminToken');
            const response = await fetch('https://aticas-backend.onrender.com/api/admin/bookings', {
                headers: {
                    'Authorization': `Bearer ${adminToken}`,
                    'X-Admin-Type': this.adminType
                }
            });

            if (response.ok) {
                const data = await response.json();
                const bookings = data.bookings || data || [];

                // Filter bookings created after last check
                const newBookings = bookings.filter(booking => {
                    const bookingDate = new Date(booking.createdAt || booking.date);
                    return bookingDate > this.lastCheckTime &&
                           booking.status === 'pending';
                });

                // Create notifications for new bookings
                newBookings.forEach(booking => {
                    this.addNotification({
                        id: `booking_${booking._id}`,
                        type: 'booking',
                        title: 'New Booking Request',
                        message: `${booking.serviceType} booking from ${booking.customerName} for ${new Date(booking.eventDate).toLocaleDateString()}`,
                        timestamp: new Date(booking.createdAt || booking.date),
                        data: {
                            bookingId: booking._id,
                            customerName: booking.customerName,
                            serviceType: booking.serviceType,
                            eventDate: booking.eventDate
                        },
                        action: 'bookings.html'
                    });
                });
            }
        } catch (error) {
            console.error('Error checking new bookings:', error);
        }
    }

    addNotification(notification) {
        // Check if notification already exists
        const existingIndex = this.notifications.findIndex(n => n.id === notification.id);
        if (existingIndex >= 0) return;

        notification.read = false;
        notification.timestamp = notification.timestamp || new Date();

        // Add to beginning of array (newest first)
        this.notifications.unshift(notification);

        // Limit to 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // Play notification sound (optional)
        this.playNotificationSound();

        // Show browser notification if permission granted
        this.showBrowserNotification(notification);
    }

    updateUI() {
        this.updateNotificationCount();
        this.updateNotificationList();
        this.updateBellAnimation();
    }

    updateNotificationCount() {
        const unreadNotifications = this.notifications.filter(n => !n.read);
        this.unreadCount = unreadNotifications.length;

        const countElement = document.getElementById('notificationCount');
        if (countElement) {
            if (this.unreadCount > 0) {
                countElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                countElement.style.display = 'flex';
            } else {
                countElement.style.display = 'none';
            }
        }
    }

    updateNotificationList() {
        const listElement = document.getElementById('notificationList');
        if (!listElement) return;

        if (this.notifications.length === 0) {
            listElement.innerHTML = '<div class="no-notifications">No notifications</div>';
            return;
        }

        const notificationHTML = this.notifications
            .slice(0, 20) // Show only last 20 notifications
            .map(notification => this.createNotificationHTML(notification))
            .join('');

        listElement.innerHTML = notificationHTML;

        // Add click handlers
        listElement.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.dataset.id;
                this.handleNotificationClick(notificationId);
            });
        });
    }

    createNotificationHTML(notification) {
        const timeAgo = this.getTimeAgo(notification.timestamp);
        const unreadClass = notification.read ? '' : 'unread';

        return `
            <div class="notification-item ${unreadClass}" data-id="${notification.id}">
                <div class="notification-title">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}"></i>
                    ${notification.title}
                </div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
        `;
    }

    getNotificationIcon(type) {
        const icons = {
            'order': 'shopping-cart',
            'booking': 'calendar-check',
            'payment': 'credit-card',
            'system': 'cog',
            'default': 'bell'
        };
        return icons[type] || icons.default;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - new Date(date)) / 60000);

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;

        return new Date(date).toLocaleDateString();
    }

    updateBellAnimation() {
        const bell = document.getElementById('notificationBell');
        if (bell && this.unreadCount > 0) {
            bell.classList.add('has-new');
            setTimeout(() => bell.classList.remove('has-new'), 500);
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        this.isDropdownOpen = !this.isDropdownOpen;

        if (this.isDropdownOpen) {
            dropdown.classList.add('show');
            // Mark notifications as read when dropdown opens
            this.markVisibleAsRead();
        } else {
            dropdown.classList.remove('show');
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
            this.isDropdownOpen = false;
        }
    }

    markVisibleAsRead() {
        let hasUnread = false;
        this.notifications.forEach(notification => {
            if (!notification.read) {
                notification.read = true;
                hasUnread = true;
            }
        });

        if (hasUnread) {
            this.saveNotifications();
            this.updateNotificationCount();
        }
    }

    markAllAsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });

        this.saveNotifications();
        this.updateUI();
    }

    handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Mark as read
        notification.read = true;
        this.saveNotifications();
        this.updateNotificationCount();

        // Navigate to relevant page
        if (notification.action) {
            window.location.href = notification.action;
        }

        this.closeDropdown();
    }

    saveNotifications() {
        try {
            localStorage.setItem(
                `admin_notifications_${this.adminType}`,
                JSON.stringify(this.notifications)
            );
            localStorage.setItem(
                `admin_last_check_${this.adminType}`,
                this.lastCheckTime.toISOString()
            );
        } catch (error) {
            console.error('Error saving notifications:', error);
        }
    }

    startPolling() {
        // Check for new notifications every 30 seconds
        this.pollingInterval = setInterval(() => {
            this.lastCheckTime = new Date();
            this.fetchNewNotifications();
        }, 30000);

        // Also check when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.fetchNewNotifications();
            }
        });
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    playNotificationSound() {
        try {
            // Create audio context for notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Silently fail if audio context not available
        }
    }

    showBrowserNotification(notification) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '../images/aticas.png',
                tag: notification.id,
                requireInteraction: false
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.showBrowserNotification(notification);
                }
            });
        }
    }

    // Method to manually add notification (for testing or external use)
    addCustomNotification(title, message, type = 'system') {
        this.addNotification({
            id: `custom_${Date.now()}`,
            type: type,
            title: title,
            message: message,
            timestamp: new Date(),
            read: false
        });

        this.saveNotifications();
        this.updateUI();
    }

    // Cleanup method
    destroy() {
        this.stopPolling();

        // Remove event listeners
        const notificationBell = document.getElementById('notificationBell');
        if (notificationBell) {
            notificationBell.replaceWith(notificationBell.cloneNode(true));
        }
    }
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on admin pages
    if (window.location.pathname.includes('/admin/')) {
        window.adminNotifications = new AdminNotificationSystem();

        // Add to window for debugging
        window.addTestNotification = function(title, message, type) {
            window.adminNotifications.addCustomNotification(title, message, type);
        };
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (window.adminNotifications) {
        window.adminNotifications.destroy();
    }
});
