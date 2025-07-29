document.addEventListener('DOMContentLoaded', function() {
    // Load payments
    loadPayments();
});

async function loadPayments() {
    const adminToken = localStorage.getItem('adminToken');
    const paymentsTableBody = document.querySelector('#paymentsTable tbody');
    const todayPaymentsElem = document.getElementById('todayPayments');
    const monthPaymentsElem = document.getElementById('monthPayments');
    const yearPaymentsElem = document.getElementById('yearPayments');
    paymentsTableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const res = await fetch('https://aticas-backend.onrender.com/api/orders?type=cafeteria', {
            headers: { 'Authorization': adminToken }
        });
        if (!res.ok) throw new Error('Failed to fetch orders');
        let orders = await res.json();
        // Only completed orders
        orders = orders.filter(order => order.status && order.status.toLowerCase() === 'completed');
        // Sort by date descending
        orders.sort((a, b) => new Date(b.date) - new Date(a.date));
        // Fill table
        let totalToday = 0, totalMonth = 0, totalYear = 0;
        const now = new Date();
        paymentsTableBody.innerHTML = '';
        let totalPayments = 0;
        orders.forEach(order => {
            const orderDate = new Date(order.date);
            const isToday = orderDate.toDateString() === now.toDateString();
            const isMonth = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            const isYear = orderDate.getFullYear() === now.getFullYear();
            if (isToday) totalToday += order.total;
            if (isMonth) totalMonth += order.total;
            if (isYear) totalYear += order.total;
            totalPayments += order.total;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${orderDate.toLocaleString()}</td>
                <td style="font-family:'Courier New',monospace;font-size:0.98rem;color:#222;">${order._id}</td>
                <td>${order.customerName || 'Guest'}</td>
                <td style="color:#27ae60;font-weight:bold;">Ksh ${Number(order.total).toLocaleString()}</td>
                <td>${order.paymentMethod ? (order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash') : 'N/A'}</td>
            `;
            paymentsTableBody.appendChild(row);
        });
        if (orders.length === 0) {
            paymentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No completed payments yet.</td></tr>';
        }
        todayPaymentsElem.textContent = `Ksh ${totalToday.toLocaleString()}`;
        monthPaymentsElem.textContent = `Ksh ${totalMonth.toLocaleString()}`;
        yearPaymentsElem.textContent = `Ksh ${totalYear.toLocaleString()}`;
    } catch (err) {
        paymentsTableBody.innerHTML = `<tr><td colspan="5" style="color:#e74c3c;text-align:center;">Failed to load payments.</td></tr>`;
        todayPaymentsElem.textContent = 'Ksh 0';
        monthPaymentsElem.textContent = 'Ksh 0';
        yearPaymentsElem.textContent = 'Ksh 0';
    }
} 