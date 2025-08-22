// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth check running...');
    
    const adminToken = localStorage.getItem('adminToken');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminType = adminData?.adminType; // Use optional chaining
    
    console.log('Auth Check - Admin Token:', adminToken ? 'Exists' : 'Missing');
    console.log('Auth Check - Admin Data:', adminData);
    console.log('Auth Check - Admin Type:', adminType);
    
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('login.html') || currentPath.includes('-login.html');
    
    console.log('Auth Check - Current Path:', currentPath);
    console.log('Auth Check - Is Login Page:', isLoginPage);
    
    // Handle different path formats (development vs production)
    let basePath = '';
    if (currentPath.includes('/frontend/')) {
        basePath = '/frontend';
    }
    
    // Normalize paths for comparison
    const normalizePath = (path) => {
        // Remove leading/trailing slashes and add exactly one leading slash
        return '/' + (path || '').replace(/^\/+|\/+$/g, '');
    };

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && adminToken && adminType) {
        console.log('Auth Check - Already logged in, checking redirection...');
        const redirectTo = adminType === 'butchery' 
            ? `${basePath}/butchery-admin/index.html` 
            : `${basePath}/admin/index.html`;
        
        const currentNormalized = normalizePath(currentPath);
        const redirectNormalized = normalizePath(redirectTo);
        
        console.log('Auth Check - Current path normalized:', currentNormalized);
        console.log('Auth Check - Redirect path normalized:', redirectNormalized);
        
        if (currentNormalized !== redirectNormalized) {
            console.log('Auth Check - Redirecting to:', redirectTo);
            window.location.replace(redirectTo); // Use replace to prevent adding to history
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
        
        // Determine which login page to redirect to based on the current path
        const isButcheryPath = currentPath.includes('butchery-admin');
        const loginPath = isButcheryPath
            ? `${basePath}/butchery-admin/butcheryadmin-login.html`
            : `${basePath}/admin/admin-login.html`;
        
        console.log('Auth Check - Redirecting to login page:', loginPath);
        window.location.replace(loginPath); // Use replace to prevent adding to history
        return;
    }

    // Check if user is on the correct admin page based on their type
    const isCafeteriaAdmin = adminType === 'cafeteria';
    const isButcheryAdmin = adminType === 'butchery';
    
    console.log('Auth Check - Admin Type:', { isCafeteriaAdmin, isButcheryAdmin });
    
    // Check if we're already on the correct path
    const isOnCafeteriaPath = currentPath.includes('/admin/');
    const isOnButcheryPath = currentPath.includes('/butchery-admin/');
    
    console.log('Auth Check - Current Path:', currentPath);
    
    // Only redirect if we're on the wrong admin section
    if ((isCafeteriaAdmin && isOnButcheryPath) || (isButcheryAdmin && isOnCafeteriaPath)) {
        const redirectTo = isCafeteriaAdmin 
            ? `${basePath}/admin/index.html`
            : `${basePath}/butchery-admin/index.html`;
            
        console.log('Auth Check - Redirecting to correct admin section:', redirectTo);
        window.location.replace(redirectTo); // Use replace to prevent adding to history
        return;
    }
    
    console.log('Auth Check - No redirection needed - already on correct page');
});
