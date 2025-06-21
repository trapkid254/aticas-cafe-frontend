// Listen for messages from the webpage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'initiateMpesaPayment') {
        console.log('Initiating M-Pesa payment...');
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'initiateMpesaPayment',
            data: request.data
        })
        .then(response => {
            console.log('Received response from background:', response);
            // Send response back to webpage
            sendResponse(response);
        })
        .catch(error => {
            console.error('Error in content script:', error);
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to process payment'
            });
        });
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
    
    if (request.action === 'checkPaymentStatus') {
        console.log('Checking payment status...');
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'checkPaymentStatus',
            data: request.data
        })
        .then(response => {
            console.log('Received status response:', response);
            // Send response back to webpage
            sendResponse(response);
        })
        .catch(error => {
            console.error('Error checking status:', error);
            sendResponse({ 
                success: false, 
                error: error.message || 'Failed to check payment status'
            });
        });
        
        // Return true to indicate we will send a response asynchronously
        return true;
    }
});

// Function to handle M-Pesa payment
window.handleMpesaPayment = async function(phoneNumber, amount, orderId) {
    console.log('handleMpesaPayment called with:', { phoneNumber, amount, orderId });
    
    try {
        // Format phone number to start with 254
        if (phoneNumber.startsWith('0')) {
            phoneNumber = '254' + phoneNumber.substring(1);
        } else if (!phoneNumber.startsWith('254')) {
            phoneNumber = '254' + phoneNumber;
        }
        
        // Send message to content script
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'initiateMpesaPayment',
                data: {
                    phoneNumber,
                    amount,
                    orderId
                }
            }, response => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
        
        console.log('Payment initiation response:', response);
        
        if (response.success) {
            // Show success message
            alert('Payment initiated successfully! Please check your phone for the M-Pesa prompt.');
            
            // Save order to localStorage before redirecting
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            const order = {
                orderId: orderId,
                timestamp: new Date().toISOString(),
                items: JSON.parse(localStorage.getItem('cart') || '[]'),
                total: amount,
                status: 'pending',
                paymentStatus: 'Pending',
                phoneNumber: phoneNumber,
                paymentMethod: 'mpesa'
            };
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));
            
            // Clear cart
            localStorage.removeItem('cart');
            
            // Start polling for payment status
            pollPaymentStatus(response.checkoutRequestId, orderId);
        } else {
            throw new Error(response.error || 'Failed to initiate payment');
        }
    } catch (error) {
        console.error('Error in handleMpesaPayment:', error);
        alert('Error: ' + (error.message || 'Failed to process payment'));
    }
};

// Function to poll payment status
async function pollPaymentStatus(checkoutRequestId, orderId) {
    console.log('Starting payment status polling...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes total (10 seconds * 30)
    
    const poll = async () => {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'checkPaymentStatus',
                    data: { checkoutRequestId, orderId }
                }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            console.log('Payment status response:', response);
            
            if (response.success) {
                if (response.status === 'Success') {
                    // Update order status in localStorage
                    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                    const orderIndex = orders.findIndex(o => o.orderId === orderId);
                    if (orderIndex !== -1) {
                        orders[orderIndex].status = 'confirmed';
                        orders[orderIndex].paymentStatus = 'Paid';
                        localStorage.setItem('orders', JSON.stringify(orders));
                    }
                    
                    alert('Payment successful! Your order has been placed.');
                    // Redirect to order confirmation page
                    window.location.href = `/order-confirmation.html?orderId=${orderId}`;
                    return;
                } else if (response.status === 'Failed') {
                    alert('Payment failed. Please try again.');
                    return;
                }
            }
            
            // Continue polling if not successful
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(poll, 10000); // Poll every 10 seconds
            } else {
                alert('Payment status check timed out. Please check your order status later.');
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
            alert('Error checking payment status: ' + error.message);
        }
    };
    
    // Start polling
    poll();
}

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