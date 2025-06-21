// M-Pesa Integration
const MPESA_CONFIG = {
    env: 'sandbox',
    shortcode: '174379', // Sandbox shortcode
    consumerKey: '054TZRXJNbDmPjhJBD8fVnJGhqVc3aI8aicf8USfapFfqEBO',
    consumerSecret: 'e7FmKAQqMmyjT0bGP7tOEpfnvn0chC6fuMsmilF8vJtoi3QPNMnGEjChJybQnCbt',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', // Sandbox passkey
    callbackUrl: 'https://4626-41-204-18.ngrok-free.app/api/mpesa/callback' // ngrok callback URL
};

// Generate access token
async function getAccessToken() {
    console.log('Getting access token...');
    const auth = btoa(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`);
    try {
        const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        const data = await response.json();
        console.log('Access token response:', data);
        if (!data.access_token) {
            throw new Error('Failed to get access token');
        }
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

// Generate timestamp
function getTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
}

// Generate password
function generatePassword() {
    const timestamp = getTimestamp();
    const str = MPESA_CONFIG.shortcode + MPESA_CONFIG.passkey + timestamp;
    return btoa(str);
}

// Initiate STK Push
async function initiateSTKPush(phoneNumber, amount, orderId) {
    console.log('Initiating STK Push...');
    console.log('Phone:', phoneNumber);
    console.log('Amount:', amount);
    console.log('Order ID:', orderId);
    
    try {
        const accessToken = await getAccessToken();
        console.log('Got access token');
        
        const timestamp = getTimestamp();
        const password = generatePassword();
        
        // Ensure amount is a whole number
        const amountInt = Math.round(amount);
        
        const requestBody = {
            BusinessShortCode: MPESA_CONFIG.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amountInt,
            PartyA: phoneNumber,
            PartyB: MPESA_CONFIG.shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: MPESA_CONFIG.callbackUrl,
            AccountReference: "Atikas Cafe",
            TransactionDesc: `Payment for order ${orderId}`
        };
        
        console.log('STK Push request body:', requestBody);

        const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        console.log('STK Push response:', data);
        
        if (!data.CheckoutRequestID) {
            throw new Error('Failed to initiate STK Push: ' + JSON.stringify(data));
        }
        
        return data;
    } catch (error) {
        console.error('Error initiating STK Push:', error);
        throw error;
    }
}

// Add this helper to create and save the order to backend
async function createAndSaveOrder(orderId, amount, phoneNumber, paymentMethod = 'mpesa') {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let items = [];
    try {
        // Fetch cart items from backend
        if (currentUser && currentUser.id) {
            const res = await fetch(`/api/cart?userId=${currentUser.id}`);
            items = await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch cart items for order:', e);
    }
    const order = {
        orderId: orderId,
        timestamp: new Date().toISOString(),
        items: items,
        total: amount,
        status: 'pending',
        paymentStatus: 'Pending',
        paymentMethod: paymentMethod,
        phoneNumber: phoneNumber,
        customerPhone: currentUser ? currentUser.phone : phoneNumber,
        customerName: currentUser ? currentUser.name : 'Guest',
        orderType: document.querySelector('input[name="orderType"]:checked')?.value || 'delivery',
        userId: currentUser ? currentUser.id : undefined
    };
    await apiPost('/api/orders', order);
}

// Handle M-Pesa payment
async function handleMpesaPayment(phoneNumber, amount, orderId) {
    console.log('handleMpesaPayment called with:', phoneNumber, amount, orderId);
    try {
        console.log('Checking amount...');
        if (!amount || amount <= 0) {
            console.log('Amount invalid:', amount);
            showNotification('Invalid amount. Please try again.', 'error');
            return;
        }
        console.log('Amount valid, creating order...');
        await createAndSaveOrder(orderId, amount, phoneNumber, 'mpesa');
        // Format phone number
        let formattedPhone = phoneNumber;
        if (phoneNumber.startsWith('0')) {
            formattedPhone = '254' + phoneNumber.substring(1);
        } else if (phoneNumber.startsWith('7')) {
            formattedPhone = '254' + phoneNumber;
        } else if (!phoneNumber.startsWith('254')) {
            formattedPhone = '254' + phoneNumber;
        }
        console.log('Formatted phone:', formattedPhone);
        console.log('Sending request to /api/mpesa/stkpush...');
        const response = await fetch('http://localhost:3000/api/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber: formattedPhone,
                amount: Math.round(amount),
                orderId
            })
        });
        console.log('Response received:', response);
        if (!response.ok) {
            console.log('Response not ok:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Response JSON:', data);
        if (data.success) {
            showNotification('M-Pesa prompt sent to your phone. Please complete the payment.', 'success');
            await updateOrderStatus(orderId, 'pending');
            const confirmationUrl = `order-confirmation.html?orderId=${orderId}&status=pending`;
            console.log('Redirecting to:', confirmationUrl);
            document.location.href = confirmationUrl;
        } else {
            showNotification(data.ResponseDescription || 'Failed to initiate payment. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Export functions
window.handleMpesaPayment = handleMpesaPayment;

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch('http://localhost:3000/api/orders/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId,
                status
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Order status updated:', data);
        return data;
    } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
}

// Show loading popup
function showLoadingPopup(message) {
    const popup = document.createElement('div');
    popup.className = 'loading-popup';
    popup.innerHTML = `
        <div class="loading-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${message}</p>
        </div>
    `;
    document.body.appendChild(popup);
}

// Hide loading popup
function hideLoadingPopup() {
    const popup = document.querySelector('.loading-popup');
    if (popup) {
        popup.remove();
    }
}

// Format phone number for M-Pesa
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
        // Convert 0XXXXXXXXX to 254XXXXXXXXX
        return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
        // Already in correct format
        return cleaned;
    } else if (cleaned.startsWith('7')) {
        // Convert 7XXXXXXXX to 2547XXXXXXXX
        return '254' + cleaned;
    }
    
    return cleaned;
}

// Generate unique order ID
function generateOrderId() {
    return 'ORDER-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Calculate total amount from cart
function calculateTotal() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Poll for payment status
async function startPaymentStatusPolling(checkoutRequestId, orderId) {
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts
    const interval = 3000; // 3 seconds
    
    const pollStatus = async () => {
        try {
            console.log('Checking payment status...');
            const response = await fetch(`http://localhost:3000/api/mpesa/status/${checkoutRequestId}`);
            const data = await response.json();
            console.log('Payment status response:', data);
            
            if (data.status === 'completed' || data.resultCode === '0') {
                hideLoadingPopup();
                showNotification('Payment completed successfully!', 'success');
                // Redirect to order confirmation page
                window.location.href = `order-confirmation.html?orderId=${orderId}`;
                return;
            } else if (data.status === 'failed' || data.resultCode === '1') {
                hideLoadingPopup();
                showNotification('Payment failed: ' + data.message, 'error');
                return;
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(pollStatus, interval);
            } else {
                hideLoadingPopup();
                showNotification('Payment status check timed out. Please check your order status.', 'warning');
                // Redirect to order status page
                window.location.href = `order-status.html?orderId=${orderId}`;
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
            hideLoadingPopup();
            showNotification('Error checking payment status', 'error');
        }
    };
    
    pollStatus();
}

// M-Pesa Payment Integration
const mpesaStyles = document.createElement('style');
mpesaStyles.textContent = `
    .mpesa-payment-form {
        max-width: 400px;
        margin: 0 auto;
        padding: 20px;
    }
    .mpesa-input {
        width: 100%;
        padding: 10px;
        margin-bottom: 15px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    .mpesa-button {
        background-color: #007AFF;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
    }
    .mpesa-button:hover {
        background-color: #0056b3;
    }
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 4px;
        color: white;
        z-index: 1000;
    }
    .notification.success {
        background-color: #28a745;
    }
    .notification.error {
        background-color: #dc3545;
    }
    .notification.info {
        background-color: #17a2b8;
    }
    .loading-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .loading-content {
        background: white;
        padding: 20px;
        border-radius: 4px;
        text-align: center;
    }
    .payment-processing-popup {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    .payment-processing-content {
        background: white;
        padding: 30px;
        border-radius: 8px;
        text-align: center;
        max-width: 400px;
        width: 90%;
    }
    .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #007AFF;
        border-radius: 50%;
        margin: 0 auto 20px;
        animation: spin 1s linear infinite;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    .payment-processing-content h3 {
        margin: 0 0 10px 0;
        color: #333;
    }
    .payment-processing-content p {
        margin: 5px 0;
        color: #666;
    }
    .payment-processing-content .countdown {
        color: #007AFF;
        font-weight: bold;
        margin-top: 15px;
    }
`;
document.head.appendChild(mpesaStyles);

function showMpesaPopup() {
    // Remove any existing popup first
    const existingPopup = document.querySelector('.mpesa-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
    const popup = document.createElement('div');
    popup.className = 'mpesa-popup';
    
    popup.innerHTML = `
        <div class="mpesa-content">
            <h3>Pay with M-Pesa</h3>
            <div class="input-group">
                <label for="mpesa-phone">Enter M-Pesa Phone Number:</label>
                <input type="tel" id="mpesa-phone" placeholder="e.g., 0712345678" pattern="^(?:254|\+254|0)?([7-9]{1}[0-9]{8})$" required>
            </div>
            <div class="button-group">
                <button class="cancel-btn" onclick="closeMpesaPopup()">Cancel</button>
                <button class="pay-btn" onclick="initiateMpesaPayment()">Pay</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);

    // Add event listener for the pay button
    const payButton = popup.querySelector('.pay-btn');
    if (payButton) {
        payButton.addEventListener('click', () => {
            const phoneInput = popup.querySelector('#mpesa-phone');
            if (!phoneInput) {
                showNotification('Phone number input not found. Please try again.', 'error');
                return;
            }

            const phoneNumber = phoneInput.value.trim();
            
            // Validate phone number
            if (!phoneNumber) {
                showNotification('Please enter your M-Pesa phone number.', 'error');
                return;
            }

            // Generate order ID
            const orderId = 'ORDER-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            
            // Close the popup
            closeMpesaPopup();
            
            // Initiate payment
            handleMpesaPayment(phoneNumber, 0, orderId);
        });
    }
}

function closeMpesaPopup() {
    const popup = document.querySelector('.mpesa-popup');
    if (popup) {
        popup.remove();
    }
}

// Helper functions for API
async function apiGet(endpoint) {
    const res = await fetch(API_BASE + endpoint);
    return res.json();
}
async function apiPost(endpoint, data) {
    const res = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}
async function apiPut(endpoint, data) {
    const res = await fetch(API_BASE + endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}