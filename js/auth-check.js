// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth check running...');
    
    const adminToken = localStorage.getItem('adminToken');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminType = adminData?.adminType; // Use optional chaining
    
    console.log('Auth Check - Admin Token:', adminToken ? 'Exists' : 'Missing');
    console.log('Auth Check - Admin Data:', adminData);
    console.log('Auth Check - Admin Type:', adminType);
    
    // Get current path and clean it up
    let currentPath = window.location.pathname;
    // Remove any trailing slashes and .html if present for comparison
    currentPath = currentPath.replace(/\/$/, '').replace(/\.html$/, '');
    
    const isLoginPage = currentPath.endsWith('login') || currentPath.includes('-login');
    
    console.log('Auth Check - Current Path:', currentPath);
    console.log('Auth Check - Is Login Page:', isLoginPage);
    
    // Handle different path formats (development vs production)
    let basePath = '';
    if (currentPath.includes('/frontend/')) {
        basePath = '/frontend';
    }
    
    // Function to get the correct login path
    const getLoginPath = (isButchery = false) => {
        return isButchery 
            ? `${basePath}/butchery-admin/butcheryadmin-login` 
            : `${basePath}/admin/admin-login`;
    };
    
    // Normalize paths for comparison
    const normalizePath = (path) => {
        // Remove leading/trailing slashes and add exactly one leading slash
        return '/' + (path || '').replace(/^\/+|\/+$/g, '');
    };

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && adminToken && adminData && adminType) {
        console.log('Auth Check - Already logged in, checking redirection...');
        const isButchery = adminType === 'butchery';
        const redirectTo = isButchery 
            ? `${basePath}/butchery-admin/index` 
            : `${basePath}/admin/index`;
        
        // Add .html if not in the URL
        const finalRedirect = window.location.pathname.endsWith('.html') 
            ? `${redirectTo}.html` 
            : redirectTo;
            
        // Prevent redirect loop by checking if we're already on the target page
        const currentPage = window.location.pathname.replace(/\/$/, '');
        const targetPage = finalRedirect.replace(/\/$/, '');
        
        console.log('Auth Check - Current page:', currentPage);
        console.log('Auth Check - Target page:', targetPage);
        
        if (currentPage !== targetPage) {
            console.log('Auth Check - Redirecting to:', finalRedirect);
            window.location.replace(finalRedirect);
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
        const loginPath = getLoginPath(isButcheryPath);
        
        // Add .html if the current URL has .html
        const finalLoginPath = window.location.pathname.endsWith('.html')
            ? `${loginPath}.html`
            : loginPath;
        
        console.log('Auth Check - Redirecting to login page:', finalLoginPath);
        window.location.replace(finalLoginPath);
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
            ? `${basePath}/admin/index`
            : `${basePath}/butchery-admin/index`;
            
        // Add .html if the current URL has .html
        const finalRedirect = window.location.pathname.endsWith('.html')
            ? `${redirectTo}.html`
            : redirectTo;
            
        console.log('Auth Check - Redirecting to correct admin section:', finalRedirect);
        window.location.replace(finalRedirect);
        return;
    }
    
    console.log('Auth Check - No redirection needed - already on correct page');
});
