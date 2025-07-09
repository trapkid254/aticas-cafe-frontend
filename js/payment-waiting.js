// payment-waiting.js

const timerElement = document.getElementById('timer');
const statusMessage = document.getElementById('statusMessage');

// Set countdown time (in seconds)
let timeLeft = 180; // 3 minutes
let intervalId;
let pollIntervalId;

// Get order identifier (e.g., from localStorage or query param)
const orderKey = 'pendingMpesaOrderId';
const orderId = localStorage.getItem(orderKey) || new URLSearchParams(window.location.search).get('orderId');

function updateTimerDisplay() {
    const min = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const sec = String(timeLeft % 60).padStart(2, '0');
    timerElement.textContent = `${min}:${sec}`;
}

function cancelOrder() {
    if (!orderId) return;
    fetch('https://aticas-backend.onrender.com/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
    });
}

function startCountdown() {
    updateTimerDisplay();
    intervalId = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(intervalId);
            clearInterval(pollIntervalId);
            statusMessage.innerHTML = '<span class="cancelled-message">Payment time expired. Your order has been cancelled.</span>';
            cancelOrder();
            localStorage.removeItem(orderKey);
        }
    }, 1000);
}

async function pollPaymentStatus() {
    if (!orderId) return;
    try {
        const res = await fetch(`https://aticas-backend.onrender.com/api/orders/${orderId}`);
        if (res.ok) {
            const order = await res.json();
            if (order.status && order.status.toLowerCase() === 'paid') {
                clearInterval(intervalId);
                clearInterval(pollIntervalId);
                statusMessage.innerHTML = '<span class="success-message">Payment received! Redirecting to your receipt...</span>';
                // Remove pending order from localStorage
                localStorage.removeItem(orderKey);
                setTimeout(() => {
                    window.location.href = `order-confirmation.html?orderId=${orderId}`;
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