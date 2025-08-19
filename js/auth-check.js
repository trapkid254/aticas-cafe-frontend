// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    const adminType = localStorage.getItem('adminType');
    const currentPage = window.location.pathname;

    // If no token or admin type, redirect to login
    if (!adminToken || !adminType) {
        redirectToLogin();
        return;
    }

    // Check if user is on the correct admin page
    const isCafeteriaAdmin = adminType === 'cafeteria';
    const isButcheryAdmin = adminType === 'butchery';

    if (isCafeteriaAdmin && !currentPage.includes('/admin/')) {
        window.location.href = 'admin/index.html';
        return;
    }

    if (isButcheryAdmin && !currentPage.includes('/butchery-admin/')) {
        window.location.href = 'butchery-admin/index.html';
        return;
    }

    // Function to redirect to appropriate login page
    function redirectToLogin() {
        if (currentPage.includes('/butchery-admin/')) {
            window.location.href = 'butcheryadmin-login.html';
        } else {
            window.location.href = 'admin/admin-login.html';
        }
    }
});
