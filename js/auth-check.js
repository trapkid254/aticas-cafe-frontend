// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    const adminType = localStorage.getItem('adminType');
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html') || currentPath.includes('-login.html');

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && adminToken && adminType) {
        const redirectTo = adminType === 'butchery' 
            ? '/butchery-admin/index.html' 
            : '/admin/index.html';
        if (window.location.pathname !== redirectTo) {
            window.location.href = redirectTo;
        }
        return;
    }

    // If not logged in and not on login page, redirect to login
    if (!adminToken || !adminType) {
        const loginPath = currentPath.includes('butchery-admin')
            ? '/butchery-admin/butcheryadmin-login.html'
            : '/admin/admin-login.html';
        
        if (window.location.pathname !== loginPath) {
            window.location.href = loginPath;
        }
        return;
    }

    // Check if user is on the correct admin page based on their type
    const isCafeteriaAdmin = adminType === 'cafeteria';
    const isButcheryAdmin = adminType === 'butchery';

    if (isCafeteriaAdmin && !currentPath.includes('/admin/')) {
        window.location.href = '/frontend/admin/index.html';
        return;
    }

    if (isButcheryAdmin && !currentPath.includes('/butchery-admin/')) {
        window.location.href = '/frontend/butchery-admin/index.html';
        return;
    }
});
