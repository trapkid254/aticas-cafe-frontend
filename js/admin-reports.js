document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    
    if (!isAdminLoggedIn) {
        window.location.href = '../admin-login.html';
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('isAdminLoggedIn');
        localStorage.removeItem('adminToken');
        window.location.href = '../index.html';
    });
    
    // Time period toggle
    document.getElementById('timePeriod').addEventListener('change', function() {
        const customDateRange = document.getElementById('customDateRange');
        if (this.value === 'custom') {
            customDateRange.style.display = 'block';
        } else {
            customDateRange.style.display = 'none';
        }
    });
    
    // Generate report button
    document.getElementById('generateReportBtn').addEventListener('click', function() {
        const reportType = document.getElementById('reportType').value;
        const timePeriod = document.getElementById('timePeriod').value;
        let startDate, endDate;
        
        if (timePeriod === 'custom') {
            startDate = document.getElementById('startDate').value;
            endDate = document.getElementById('endDate').value;
            
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
        } else {
            // Calculate date range based on time period
            const today = new Date();
            endDate = today.toISOString().split('T')[0];
            
            if (timePeriod === 'today') {
                startDate = endDate;
            } else if (timePeriod === 'week') {
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                startDate = lastWeek.toISOString().split('T')[0];
            } else if (timePeriod === 'month') {
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                startDate = lastMonth.toISOString().split('T')[0];
            } else if (timePeriod === 'quarter') {
                const lastQuarter = new Date(today);
                lastQuarter.setMonth(today.getMonth() - 3);
                startDate = lastQuarter.toISOString().split('T')[0];
            } else if (timePeriod === 'year') {
                const lastYear = new Date(today);
                lastYear.setFullYear(today.getFullYear() - 1);
                startDate = lastYear.toISOString().split('T')[0];
            }
        }
        
        // Generate report based on parameters
        generateReport(reportType, startDate, endDate);
    });
    
    // Export buttons
    document.querySelector('.pdf-btn').addEventListener('click', function() {
        alert('PDF export would be implemented here');
    });
    
    document.querySelector('.excel-btn').addEventListener('click', function() {
        alert('Excel export would be implemented here');
    });
    
    // Generate initial report
    generateReport('sales', getDateRange('month').startDate, getDateRange('month').endDate);
});

function getDateRange(timePeriod) {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate;
    
    if (timePeriod === 'today') {
        startDate = endDate;
    } else if (timePeriod === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        startDate = lastWeek.toISOString().split('T')[0];
    } else if (timePeriod === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        startDate = lastMonth.toISOString().split('T')[0];
    } else if (timePeriod === 'quarter') {
        const lastQuarter = new Date(today);
        lastQuarter.setMonth(today.getMonth() - 3);
        startDate = lastQuarter.toISOString().split('T')[0];
    } else if (timePeriod === 'year') {
        const lastYear = new Date(today);
        lastYear.setFullYear(today.getFullYear() - 1);
        startDate = lastYear.toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
}

function generateReport(reportType, startDate, endDate) {
    if (reportType === 'sales') {
        generateSalesReport(startDate, endDate);
    } else if (reportType === 'inventory') {
        // In a real app, this would generate inventory report
        alert('Inventory report would be generated here');
    } else if (reportType === 'employee') {
        // In a real app, this would generate employee performance report
        alert('Employee performance report would be generated here');
    }
}

async function generateSalesReport(startDate, endDate) {
    try {
        const res = await fetch('https://aticas-backend.onrender.com/api/orders', { headers: { 'Authorization': localStorage.getItem('adminToken') || '' } });
        const orders = await res.json();
        // Filter orders by date range
        const filteredData = orders.filter(order => {
            const orderDate = (order.date || '').split('T')[0];
            return orderDate >= startDate && orderDate <= endDate;
        });
        // Calculate report stats
        const totalRevenue = filteredData.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = filteredData.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const uniqueCustomers = new Set(filteredData.map(order => order.customerName)).size;
        // For change calculations, get previous period
        const prevPeriod = getPreviousPeriod(startDate, endDate);
        const prevData = orders.filter(order => {
            const orderDate = (order.date || '').split('T')[0];
            return orderDate >= prevPeriod.startDate && orderDate <= prevPeriod.endDate;
        });
        const prevRevenue = prevData.reduce((sum, order) => sum + (order.total || 0), 0);
        const prevOrders = prevData.length;
        const prevAvgOrderValue = prevOrders > 0 ? prevRevenue / prevOrders : 0;
        const prevCustomers = new Set(prevData.map(order => order.customerName)).size;
        const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 100;
        const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders * 100) : 100;
        const avgOrderChange = prevAvgOrderValue > 0 ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue * 100) : 100;
        const customersChange = prevCustomers > 0 ? ((uniqueCustomers - prevCustomers) / prevCustomers * 100) : 100;
        // Update report cards
        document.querySelector('.report-card:nth-child(1) .value').textContent = 'Ksh ' + totalRevenue.toLocaleString();
        document.querySelector('.report-card:nth-child(1) .change').innerHTML = `
            <i class="fas fa-arrow-${revenueChange >= 0 ? 'up' : 'down'}"></i> 
            ${Math.abs(revenueChange).toFixed(0)}% from last period
        `;
        document.querySelector('.report-card:nth-child(1) .change').className = `change ${revenueChange >= 0 ? 'positive' : 'negative'}`;
        document.querySelector('.report-card:nth-child(2) .value').textContent = totalOrders;
        document.querySelector('.report-card:nth-child(2) .change').innerHTML = `
            <i class="fas fa-arrow-${ordersChange >= 0 ? 'up' : 'down'}"></i> 
            ${Math.abs(ordersChange).toFixed(0)}% from last period
        `;
        document.querySelector('.report-card:nth-child(2) .change').className = `change ${ordersChange >= 0 ? 'positive' : 'negative'}`;
        document.querySelector('.report-card:nth-child(3) .value').textContent = 'Ksh ' + avgOrderValue.toLocaleString();
        document.querySelector('.report-card:nth-child(3) .change').innerHTML = `
            <i class="fas fa-arrow-${avgOrderChange >= 0 ? 'up' : 'down'}"></i> 
            ${Math.abs(avgOrderChange).toFixed(0)}% from last period
        `;
        document.querySelector('.report-card:nth-child(3) .change').className = `change ${avgOrderChange >= 0 ? 'positive' : 'negative'}`;
        document.querySelector('.report-card:nth-child(4) .value').textContent = uniqueCustomers;
        document.querySelector('.report-card:nth-child(4) .change').innerHTML = `
            <i class="fas fa-arrow-${customersChange >= 0 ? 'up' : 'down'}"></i> 
            ${Math.abs(customersChange).toFixed(0)}% from last period
        `;
        document.querySelector('.report-card:nth-child(4) .change').className = `change ${customersChange >= 0 ? 'positive' : 'negative'}`;
        // Update detailed sales table
        const tableBody = document.querySelector('#salesReportTable tbody');
        tableBody.innerHTML = '';
        // Display first 5 orders for the demo
        const displayData = filteredData.slice(0, 5);
        displayData.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${(order.date || '').split('T')[0]}</td>
                <td>${order._id}</td>
                <td>${order.customerName}</td>
                <td>${order.items ? order.items.length : 0}</td>
                <td>Ksh ${Number(order.total || 0).toLocaleString()}</td>
                <td>${order.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}</td>
                <td class="status-${order.status}">${order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : ''}</td>
            `;
            tableBody.appendChild(row);
        });
        // --- Render Sales Overview Chart ---
        renderSalesOverviewChart(filteredData);
        // --- Render Popular Menu Items Chart ---
        renderPopularItemsChart(filteredData);
    } catch (err) {
        // Handle error
        document.querySelector('.report-card:nth-child(1) .value').textContent = 'Ksh 0';
        document.querySelector('.report-card:nth-child(2) .value').textContent = '0';
        document.querySelector('.report-card:nth-child(3) .value').textContent = 'Ksh 0';
        document.querySelector('.report-card:nth-child(4) .value').textContent = '0';
        const tableBody = document.querySelector('#salesReportTable tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7">Failed to load sales data.</td></tr>';
    }
}

function getPreviousPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - diffDays);
    
    const prevEnd = new Date(end);
    prevEnd.setDate(end.getDate() - diffDays);
    
    return {
        startDate: prevStart.toISOString().split('T')[0],
        endDate: prevEnd.toISOString().split('T')[0]
    };
}

// This is a placeholder for a more advanced reporting library
function generateSimpleReport(orders) {
    // ... (existing code)
}

async function fetchOrdersAndGenerateReport() {
    try {
        const res = await fetch('https://aticas-backend.onrender.com/api/orders', { headers: { 'Authorization': localStorage.getItem('adminToken') || '' } });
        if (!res.ok) {
            throw new Error('Failed to fetch orders for report');
        }
        // ... existing code ...
    } catch (err) {
        // Handle error
        document.querySelector('.report-card:nth-child(1) .value').textContent = 'Ksh 0';
        document.querySelector('.report-card:nth-child(2) .value').textContent = '0';
        document.querySelector('.report-card:nth-child(3) .value').textContent = 'Ksh 0';
        document.querySelector('.report-card:nth-child(4) .value').textContent = '0';
        const tableBody = document.querySelector('#salesReportTable tbody');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7">Failed to load sales data.</td></tr>';
    }
}

// Chart.js chart instances
let salesChartInstance = null;
let popularItemsChartInstance = null;
let lastSalesChartType = 'bar';
let lastPopularItemsChartType = 'bar';

// Listen for chart type changes
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        const salesTypeSelect = document.getElementById('salesChartType');
        if (salesTypeSelect) {
            salesTypeSelect.addEventListener('change', function() {
                lastSalesChartType = this.value;
                // Re-generate report to update chart
                document.getElementById('generateReportBtn').click();
            });
        }
        const popularTypeSelect = document.getElementById('popularItemsChartType');
        if (popularTypeSelect) {
            popularTypeSelect.addEventListener('change', function() {
                lastPopularItemsChartType = this.value;
                document.getElementById('generateReportBtn').click();
            });
        }
    });
}

function renderSalesOverviewChart(orders) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    const chartType = document.getElementById('salesChartType')?.value || lastSalesChartType || 'bar';
    // Aggregate daily revenue
    const dailyRevenue = {};
    orders.forEach(order => {
        const date = (order.date || '').split('T')[0];
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (order.total || 0);
    });
    const labels = Object.keys(dailyRevenue).sort();
    const data = labels.map(date => dailyRevenue[date]);
    if (salesChartInstance) salesChartInstance.destroy();
    // Pie/doughnut need special data structure
    let chartData = {};
    if (chartType === 'pie' || chartType === 'doughnut') {
        chartData = {
            labels,
            datasets: [{
                label: 'Revenue (Ksh)',
                data,
                backgroundColor: labels.map((_, i) => `hsl(${i * 360 / labels.length}, 70%, 60%)`)
            }]
        };
    } else {
        chartData = {
            labels,
            datasets: [{
                label: 'Revenue (Ksh)',
                data,
                backgroundColor: '#3498db',
                borderColor: '#3498db',
                borderRadius: 6,
                fill: chartType === 'line' ? false : true,
                tension: chartType === 'line' ? 0.3 : undefined
            }]
        };
    }
    salesChartInstance = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            plugins: { legend: { display: chartType !== 'bar' && chartType !== 'line' ? true : false } },
            scales: (chartType === 'pie' || chartType === 'doughnut') ? {} : { y: { beginAtZero: true } }
        }
    });
}

function renderPopularItemsChart(orders) {
    const ctx = document.getElementById('popularItemsChart');
    if (!ctx) return;
    const chartType = document.getElementById('popularItemsChartType')?.value || lastPopularItemsChartType || 'bar';
    // Aggregate menu item counts
    const itemCounts = {};
    orders.forEach(order => {
        (order.items || []).forEach(item => {
            const name = item.menuItem && item.menuItem.name ? item.menuItem.name : 'Unknown';
            itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
        });
    });
    // Top 5 items
    const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(([name]) => name);
    const data = sorted.map(([, count]) => count);
    if (popularItemsChartInstance) popularItemsChartInstance.destroy();
    let chartData = {};
    if (chartType === 'pie' || chartType === 'doughnut') {
        chartData = {
            labels,
            datasets: [{
                label: 'Orders',
                data,
                backgroundColor: labels.map((_, i) => `hsl(${i * 360 / labels.length}, 70%, 60%)`)
            }]
        };
    } else {
        chartData = {
            labels,
            datasets: [{
                label: 'Orders',
                data,
                backgroundColor: '#27ae60',
                borderColor: '#27ae60',
                borderRadius: 6,
                fill: chartType === 'line' ? false : true,
                tension: chartType === 'line' ? 0.3 : undefined
            }]
        };
    }
    popularItemsChartInstance = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
            responsive: true,
            plugins: { legend: { display: chartType !== 'bar' && chartType !== 'line' ? true : false } },
            scales: (chartType === 'pie' || chartType === 'doughnut') ? {} : { y: { beginAtZero: true } }
        }
    });
}