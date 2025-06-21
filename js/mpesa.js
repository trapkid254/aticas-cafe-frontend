// This file is now drastically simplified for security and correctness.
// All sensitive M-Pesa logic is now handled exclusively by the backend.

// Add this helper to create and save the order to the backend
async function createAndSaveOrder(orderId, amount, phoneNumber, paymentMethod = 'mpesa') {
    const currentUser = getCurrentUser(); // Assumes global function from auth.js
    let items = [];
    try {
        if (currentUser && currentUser.id) {
            const res = await apiGet(`/api/cart?userId=${currentUser.id}`); // Uses global apiGet
            items = res; // Assuming the response is the array of items
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
    await apiPost('/api/orders', order); // Uses global apiPost
}

// Handle M-Pesa payment by calling our own backend
async function handleMpesaPayment(phoneNumber, amount, orderId) {
    console.log('handleMpesaPayment called with:', phoneNumber, amount, orderId);
    try {
        if (!amount || amount <= 0) {
            showNotification('Invalid amount. Please try again.', 'error');
            return;
        }

        // First, create the order in our system with a 'pending' status
        await createAndSaveOrder(orderId, amount, phoneNumber, 'mpesa');

        // Then, ask our backend to trigger the M-Pesa STK push
        const response = await apiPost('/api/mpesa/stkpush', {
            phoneNumber,
            amount: Math.round(amount),
            orderId
        });

        if (response.success) {
            showNotification('M-Pesa prompt sent to your phone. Please complete the payment.', 'success');
            // Redirect to a confirmation page to show the pending status
            const confirmationUrl = `order-confirmation.html?orderId=${orderId}&status=pending`;
            document.location.href = confirmationUrl;
        } else {
            // Use the error message from our backend
            showNotification(response.message || 'Failed to initiate payment. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Payment error:', error);
        showNotification('An error occurred during payment. Please try again.', 'error');
    }
}

// Update order status by calling our own backend
async function updateOrderStatus(orderId, status) {
    try {
        const data = await apiPost('/api/orders/status', { orderId, status });
        console.log('Order status updated:', data);
        return data;
    } catch (error) {
        console.error('Error updating order status:', error);
        throw error;
    }
}

// NOTE: All other functions (popups, polling, etc.) can remain, 
// but the core M-Pesa logic and credential-related functions have been removed.
// This script will rely on the global API helper functions
// defined in 'auth.js', which must be loaded first.

// Export function to be globally accessible
window.handleMpesaPayment = handleMpesaPayment;