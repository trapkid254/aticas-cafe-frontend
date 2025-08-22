// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    const adminToken = localStorage.getItem('adminToken');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminType = adminData.adminType; // Get adminType from adminData instead of directly from localStorage
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('login.html') || currentPath.includes('-login.html');
    
    // Handle different path formats (development vs production)
    let basePath = '';
    if (currentPath.includes('/frontend/')) {
        basePath = '/frontend';
    } else if (currentPath.startsWith('/admin/') || currentPath.startsWith('/butchery-admin/')) {
        basePath = ''; // Production path
    }
    
    // Ensure consistent path comparison by normalizing paths
    const normalizePath = (path) => {
        // Remove leading/trailing slashes and add exactly one leading slash
        return '/' + path.replace(/^\/+|\/+$/g, '');
    };

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && adminToken && adminType) {
        const redirectTo = adminType === 'butchery' 
            ? `${basePath}/butchery-admin/index.html` 
            : `${basePath}/admin/index.html`;
        const currentNormalized = normalizePath(window.location.pathname);
        const redirectNormalized = normalizePath(redirectTo);
        if (currentNormalized !== redirectNormalized) {
            window.location.href = redirectTo;
        }
        return;
    }

    // If not logged in and not on login page, redirect to login
    if (!adminToken || !adminType) {
        const loginPath = currentPath.includes('butchery-admin')
            ? `${basePath}/butchery-admin/butcheryadmin-login.html`
            : `${basePath}/admin/admin-login.html`;
        
        if (normalizePath(window.location.pathname) !== normalizePath(loginPath)) {
            window.location.href = loginPath;
        }
        return;
    }

    // Check if user is on the correct admin page based on their type
    const isCafeteriaAdmin = adminType === 'cafeteria';
    const isButcheryAdmin = adminType === 'butchery';
    
    // Check if we're already on the correct path
    const isOnCafeteriaPath = currentPath.includes('/admin/');
    const isOnButcheryPath = currentPath.includes('/butchery-admin/');
    
    // Only redirect if we're not already on the correct path
    if (isCafeteriaAdmin && !isOnCafeteriaPath) {
        window.location.href = `${basePath}/admin/index.html`;
        return;
    }

    if (isButcheryAdmin && !isOnButcheryPath) {
        window.location.href = `${basePath}/butchery-admin/index.html`;
        return;
    }
});
