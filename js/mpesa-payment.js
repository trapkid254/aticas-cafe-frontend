// M-Pesa Payment Integration
const MPESA_CONFIG = {
    env: 'sandbox',
    shortcode: '174379', // Sandbox shortcode
    consumerKey: '054TZRXJNbDmPjhJBD8fVnJGhqVc3aI8aicf8USfapFfqEBO',
    consumerSecret: 'e7FmKAQqMmyjT0bGP7tOEpfnvn0chC6fuMsmilF8vJtoi3QPNMnGEjChJybQnCbt',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', // Sandbox passkey
    callbackUrl: 'https://4626-41-204-18.ngrok-free.app/api/mpesa/callback' // ngrok callback URL
};

// Helper functions for API
async function apiGet(endpoint) {
    const res = await fetch(endpoint);
    return res.json();
}
async function apiPost(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}
async function apiPut(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return res.json();
}

// Process M-Pesa payment
async function processMpesaPayment(phoneNumber, amount, orderId) {
    try {
        console.log('Processing M-Pesa payment...');
        console.log('Phone:', phoneNumber);
        console.log('Amount:', amount);
        console.log('Order ID:', orderId);

        // Show processing state
        document.querySelector('.payment-processing').style.display = 'flex';

        // Make request to initiate STK Push
        const response = await fetch('http://localhost:3000/api/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phoneNumber,
                amount,
                orderId
            })
        });

        const data = await response.json();
        console.log('STK Push response:', data);

        if (data.ResponseCode === '0') {
            // Successfully initiated payment
            showNotification('Please check your phone for the M-Pesa prompt', 'success');
            
            // Start polling for payment status
            const checkoutRequestId = data.CheckoutRequestID;
            let attempts = 0;
            const maxAttempts = 12; // Poll for 1 minute (5 seconds * 12)
            
            const pollPaymentStatus = async () => {
                try {
                    const statusResponse = await fetch(`http://localhost:3000/api/mpesa/status/${checkoutRequestId}`);
                    const statusData = await statusResponse.json();
                    
                    if (statusData.errorCode === '500.001.1001') {
                        // Still processing
                        if (attempts < maxAttempts) {
                            attempts++;
                            setTimeout(pollPaymentStatus, 5000); // Poll every 5 seconds
                        } else {
                            showNotification('Payment is taking longer than expected. Please check your order status.', 'info');
                            document.querySelector('.payment-processing').style.display = 'none';
                        }
                    } else if (statusData.ResultCode === 0) {
                        // Payment successful
                        showNotification('Payment successful!', 'success');
                        document.querySelector('.payment-processing').style.display = 'none';
                        // Update order status
                        updateOrderStatus(orderId, 'paid');
                        // Redirect to confirmation page
                        setTimeout(() => {
                            window.location.href = 'order-confirmation.html';
                        }, 2000);
                    } else {
                        // Payment failed
                        showNotification('Payment failed. Please try again.', 'error');
                        document.querySelector('.payment-processing').style.display = 'none';
                    }
                } catch (error) {
                    console.error('Error checking payment status:', error);
                    showNotification('Error checking payment status. Please check your order status.', 'error');
                    document.querySelector('.payment-processing').style.display = 'none';
                }
            };

            // Start polling
            setTimeout(pollPaymentStatus, 5000);
        } else {
            // Failed to initiate payment
            showNotification(data.ResponseDescription || 'Failed to initiate payment. Please try again.', 'error');
            document.querySelector('.payment-processing').style.display = 'none';
        }
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        document.querySelector('.payment-processing').style.display = 'none';
    }
}

// Update order status
function updateOrderStatus(orderId, status) {
    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = status;
        orders[orderIndex].paymentStatus = status === 'paid' ? 'Paid' : 'Pending';
        localStorage.setItem('orders', JSON.stringify(orders));
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`
}