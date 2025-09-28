// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Error:', message, 'at', source, lineno + ':' + colno);
    return true; // Prevents the default error handler
};

// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    // Authentication check logic
        
    // Prevent redirect loops
    const redirecting = sessionStorage.getItem('authRedirecting');
    if (redirecting) {
        console.log('Auth Check - Preventing redirect loop');
        sessionStorage.removeItem('authRedirecting');
        return;
    }

    console.log('Auth check running...');
    
    // Get current path and clean it up first
    const currentPath = window.location.pathname;
    const cleanPath = currentPath.replace(/\/$/, '').replace(/\.html$/, '').toLowerCase();
    
    // Handle different path formats (development vs production)
    let basePath = '';
    if (currentPath.includes('/frontend/')) {
        basePath = '/frontend';
    }
    
    // Only apply admin auth checks on admin-related routes
    const isAdminSection = cleanPath.includes('/admin/') || cleanPath.includes('butchery-admin');
    if (!isAdminSection) {
        // Skip auth checks for public/customer-facing pages (e.g., cart, menu, home)
        console.log('Auth Check - Non-admin page, skipping auth enforcement');
        return;
    }
    
    // Get auth data
    const adminToken = localStorage.getItem('adminToken');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminType = adminData?.adminType; // Use optional chaining
    
    console.log('Auth Check - Current Path:', currentPath);
    console.log('Auth Check - Clean Path:', cleanPath);
    console.log('Auth Check - Admin Token:', adminToken ? 'Exists' : 'Missing');
    console.log('Auth Check - Admin Type:', adminType);
    
    // Helper function to redirect to login (use explicit, existing routes)
    const redirectToLogin = () => {
        const isButcheryPath = cleanPath.includes('butchery-admin');
        const loginPath = isButcheryPath 
            ? `${basePath}/butchery-admin/login` // server has explicit route
            : `${basePath}/admin/admin-login.html`; // static file
        const normalizedTarget = loginPath.replace(/\/index(?:\.html)?$/i, '').replace(/\.html$/i, '').toLowerCase();
        const normalizedHere = cleanPath;
        if (normalizedHere.endsWith(normalizedTarget.replace(basePath, '').replace(/^\/+/, ''))) {
            console.log('Auth Check - Already on login page, no redirect');
            return;
        }
        console.log('Auth Check - Redirecting to login:', loginPath);
        sessionStorage.setItem('authRedirecting', 'true');
        window.location.replace(loginPath);
    };
    
    // Validate stored data
    if (adminToken && (!adminData || typeof adminData !== 'object' || !adminType)) {
        console.log('Invalid admin data structure, clearing storage');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        redirectToLogin();
        return;
    }
    
    const isLoginPage = (
        cleanPath.endsWith('/admin/admin-login') ||
        cleanPath.includes('/admin/admin-login') ||
        cleanPath.endsWith('/butchery-admin/login') ||
        cleanPath.includes('/butchery-admin/login') ||
        cleanPath.endsWith('login') || cleanPath.includes('-login')
    );
    console.log('Auth Check - Is Login Page:', isLoginPage);
    
    // Helper function to get dashboard path
    const getDashboardPath = (isButchery) => {
        // Use base urls that the server actually serves
        return isButchery 
            ? `${basePath}/butchery-admin`
            : `${basePath}/admin`;
    };
    
    // Function to get the correct login path
    const getLoginPath = (isButchery = false) => {
        return isButchery 
            ? `${basePath}/butchery-admin/butcheryadmin-login` 
            : `${basePath}/admin/admin-login`;
    };

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && adminToken && adminData && adminType) {
        console.log('Auth Check - Already logged in, checking redirection...');
        const isButchery = adminType === 'butchery';
        const targetPath = getDashboardPath(isButchery);
        
        // Only redirect if we're not already on the target page
        const normalizedTarget = targetPath.replace(/\/index(?:\.html)?$/i, '').toLowerCase();
        const normalizedHere = cleanPath;
        if (!normalizedHere.endsWith(normalizedTarget.replace(basePath, '').replace(/^\/+/, ''))) {
            console.log('Auth Check - Redirecting to dashboard:', targetPath);
            sessionStorage.setItem('authRedirecting', 'true');
            window.location.replace(targetPath);
        } else {
            console.log('Auth Check - Already on the correct dashboard');
        }
        return;
    }

    // If not logged in and not on login page, redirect to login
    if (!adminToken || !adminType) {
        console.log('Auth Check - Not logged in or missing admin type');
        
        // Don't redirect if we're already on a login page
        if (isLoginPage) {
            console.log('Auth Check - Already on login page, no redirect needed');
            return;
        }
        
        redirectToLogin();
        return;
    }

    // Check if user is on the correct admin page based on their type
    const isButchery = adminType === 'butchery';
    const shouldBeOnButchery = cleanPath.includes('butchery-admin');
    
    // Only redirect if we're on the wrong admin section
    if (isButchery !== shouldBeOnButchery) {
        const targetPath = getDashboardPath(isButchery);
        const normalizedTarget = targetPath.replace(/\/index(?:\.html)?$/i, '').toLowerCase();
        const normalizedHere = cleanPath;
        if (!normalizedHere.endsWith(normalizedTarget.replace(basePath, '').replace(/^\/+/, ''))) {
            console.log('Auth Check - Redirecting to correct admin section:', targetPath);
            sessionStorage.setItem('authRedirecting', 'true');
            window.location.replace(targetPath);
            return;
        }
    }
    
    console.log('Auth Check - No redirection needed - already on correct page');
});