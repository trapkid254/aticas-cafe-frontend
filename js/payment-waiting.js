// payment-waiting.js

const timerElement = document.getElementById('timer');
const statusMessage = document.getElementById('statusMessage');
const cancelBtn = document.getElementById('cancelPaymentBtn');

// Set countdown time (in seconds)
let timeLeft = 180; // 3 minutes
let intervalId;
let pollIntervalId;

// Get order identifier (e.g., from localStorage or query param)
const orderKey = 'pendingMpesaOrderId';
const orderId = localStorage.getItem(orderKey) || new URLSearchParams(window.location.search).get('orderId');

// Get merchantRequestId from localStorage or query param
const merchantRequestIdKey = 'pendingMerchantRequestId';
const merchantRequestId = localStorage.getItem(merchantRequestIdKey) || new URLSearchParams(window.location.search).get('merchantRequestId');

function updateTimerDisplay() {
    const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const sec = String(timeLeft % 60).padStart(2, '0');
    timerElement.textContent = `${min}:${sec}`;
}

function redirectToCancelled(orderId) {
    window.location.href = `order-confirmation.html?orderId=${orderId}&cancelled=1`;
}

async function cancelOrderAndRedirect() {
    if (!merchantRequestId) return;
    try {
        // Try to cancel the order by merchantRequestId
        const res = await fetch('https://aticas-backend.onrender.com/api/orders/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchantRequestId })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.order && data.order._id) {
                // Remove pending merchantRequestId from localStorage
                localStorage.removeItem(merchantRequestIdKey);
                // Redirect to order confirmation page (showing cancelled order)
                redirectToCancelled(data.order._id);
                return;
            }
        }
        // If no order was created, show a cancelled message page
        localStorage.removeItem(merchantRequestIdKey);
        window.location.href = 'order-cancelled.html';
    } catch (err) {
        // Fallback: just redirect to cancelled page
        localStorage.removeItem(merchantRequestIdKey);
        window.location.href = 'order-cancelled.html';
    }
}

cancelBtn.addEventListener('click', cancelOrderAndRedirect);

function startCountdown() {
    updateTimerDisplay();
    intervalId = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(intervalId);
            clearInterval(pollIntervalId);
            statusMessage.innerHTML = '<span class="cancelled-message">Payment time expired. Your order has been cancelled.</span>';
            cancelOrderAndRedirect();
        }
    }, 1000);
}

async function pollPaymentStatus() {
    if (!merchantRequestId) return;
    try {
        const res = await fetch(`https://aticas-backend.onrender.com/api/orders/by-merchant-request/${merchantRequestId}`);
        if (res.ok) {
            const order = await res.json();
            if (order.status && order.status.toLowerCase() === 'paid') {
                clearInterval(intervalId);
                clearInterval(pollIntervalId);
                statusMessage.innerHTML = '<span class="success-message">Payment received! Redirecting to your receipt...</span>';
                // Remove pending merchantRequestId from localStorage
                localStorage.removeItem(merchantRequestIdKey);
                setTimeout(() => {
                    window.location.href = `order-confirmation.html?orderId=${order._id}`;
                }, 1500);
            }
        }
    } catch (err) {
        // Ignore errors, just keep polling
    }
}

// Start everything
startCountdown();
if (orderId) {
    pollIntervalId = setInterval(pollPaymentStatus, 4000); // Poll every 4 seconds
} 