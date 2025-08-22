// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth check running...');
    
    // Helper function to validate token and admin data
    const validateAuthData = () => {
        try {
            const token = localStorage.getItem('adminToken');
            const adminStr = localStorage.getItem('adminData');
            
            if (!token || !adminStr) {
                console.log('Auth Check: Missing token or admin data');
                return { isValid: false };
            }
            
            const adminData = JSON.parse(adminStr);
            const adminType = adminData?.adminType;
            
            if (!adminType) {
                console.log('Auth Check: Missing admin type in admin data');
                return { isValid: false };
            }
            
            // Check if token is expired if it has an expiration
            if (adminData.exp && Date.now() >= adminData.exp * 1000) {
                console.log('Auth Check: Token expired');
                return { isValid: false };
            }
            
            return { 
                isValid: true, 
                token, 
                adminData, 
                adminType 
            };
            
        } catch (error) {
            console.error('Auth Check: Error validating auth data:', error);
            return { isValid: false };
        }
    };
    
    const { isValid, token, adminData, adminType } = validateAuthData();
    
    console.log('Auth Check - Token:', token ? 'Exists' : 'Missing');
    console.log('Auth Check - Admin Data:', adminData);
    console.log('Auth Check - Admin Type:', adminType);
    
    // Clear invalid auth data if validation fails
    if (!isValid) {
        console.log('Auth Check: Invalid auth data, clearing storage');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
    }
    
    // Get current path and clean it up
    const fullPath = window.location.pathname;
    // Remove any trailing slashes and .html if present for comparison
    const cleanPath = fullPath.replace(/\/$/, '').replace(/\.html$/, '');
    
    const isLoginPage = cleanPath.endsWith('login') || cleanPath.includes('-login');
    
    console.log('Auth Check - Full Path:', fullPath);
    console.log('Auth Check - Clean Path:', cleanPath);
    console.log('Auth Check - Is Login Page:', isLoginPage);
    
    // Handle different path formats (development vs production)
    let basePath = '';
    if (fullPath.includes('/frontend/')) {
        basePath = '/frontend';
    }
    
    // Function to get the correct login path
    const getLoginPath = (isButchery = false) => {
        const loginPath = isButchery 
            ? `${basePath}/butchery-admin/butcheryadmin-login` 
            : `${basePath}/admin/admin-login`;
        
        // Preserve .html extension if it was in the original URL
        return window.location.pathname.endsWith('.html') 
            ? `${loginPath}.html` 
            : loginPath;
    };
    
    // Function to get the correct dashboard path
    const getDashboardPath = (isButchery = false) => {
        const dashboardPath = isButchery
            ? `${basePath}/butchery-admin/index`
            : `${basePath}/admin/index`;
            
        // Preserve .html extension if it was in the original URL
        return window.location.pathname.endsWith('.html')
            ? `${dashboardPath}.html`
            : dashboardPath;
    };
    
    // Normalize paths for comparison
    const normalizePath = (path) => {
        // Remove leading/trailing slashes and add exactly one leading slash
        return '/' + (path || '').replace(/^\/+|\/+$/g, '');
    };

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && isValid && adminType) {
        console.log('Auth Check - Already logged in, checking redirection...');
        const isButchery = adminType === 'butchery';
        const targetPath = getDashboardPath(isButchery);
        
        // Get current path without query/hash
        const currentPath = window.location.pathname;
        
        // Only redirect if we're not already on the target page
        if (!currentPath.endsWith(targetPath)) {
            console.log('Auth Check - Redirecting to dashboard:', targetPath);
            // Use replace to avoid adding to history
            window.location.replace(targetPath);
        } else {
            console.log('Auth Check - Already on the correct dashboard');
        }
        return;
    }

    // If not logged in and not on login page, redirect to login
    if (!isValid) {
        console.log('Auth Check - Not logged in or invalid session');
        
        // Don't redirect if we're already on a login page
        if (isLoginPage) {
            console.log('Auth Check - Already on login page, no redirect needed');
            return;
        }
        
        // Determine which login page to redirect to based on the current path
        const isButcheryPath = currentPath.includes('butchery-admin');
        const loginPath = getLoginPath(isButcheryPath);
        
        console.log('Auth Check - Redirecting to login page:', loginPath);
        
        // Add a small delay to ensure any pending operations complete
        setTimeout(() => {
            window.location.replace(loginPath);
        }, 50);
        return;
    }

    // Check if user is on the correct admin page based on their type
    const isCafeteriaAdmin = adminType === 'cafeteria';
    const isButcheryAdmin = adminType === 'butchery';
    
    console.log('Auth Check - Admin Type:', { isCafeteriaAdmin, isButcheryAdmin });
    
    // Check current path
    const currentPath = window.location.pathname;
    console.log('Auth Check - Current Path:', currentPath);
    
    // Determine the correct dashboard path for this admin type
    const correctDashboardPath = getDashboardPath(isButcheryAdmin);
    
    // Check if we're on a valid path for this admin type
    const isValidPath = isCafeteriaAdmin 
        ? currentPath.includes('/admin/')
        : currentPath.includes('/butchery-admin/');
    
    // If we're not on a valid path for this admin type, redirect to the correct dashboard
    if (!isValidPath) {
        console.log('Auth Check - Not on valid admin path, redirecting to:', correctDashboardPath);
        // Use a small delay to ensure any pending operations complete
        setTimeout(() => {
            window.location.replace(correctDashboardPath);
        }, 50);
        return;
    }
    
    console.log('Auth Check - No redirection needed - already on correct page');
});
