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
    // Helper to normalize a path for safe comparisons
    const normalizePath = (p) => {
        if (!p) return '';
        return String(p)
            .replace(/\\/g, '/')
            .replace(/\/index(?:\.html)?$/i, '')
            .replace(/\.html$/i, '')
            .replace(/\/$/, '')
            .toLowerCase();
    };
    
    // Only apply admin auth checks on admin-related routes
    const isAdminSection = cleanPath.includes('/admin') || cleanPath.includes('butchery-admin');
    if (!isAdminSection) {
        // Skip auth checks for public/customer-facing pages (e.g., cart, menu, home)
        console.log('Auth Check - Non-admin page, skipping auth enforcement');
        return;
    }
    
    // Get auth data
    const adminToken = localStorage.getItem('adminToken');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    // Try to derive adminType from stored data, else from JWT payload to avoid loops during initial save
    const decodeJwt = (t) => {
        try {
            const parts = String(t).split('.');
            if (parts.length !== 3) return null;
            const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(json);
        } catch { return null; }
    };
    const tokenPayload = adminToken ? decodeJwt(adminToken) : null;
    let adminType = adminData?.adminType || tokenPayload?.adminType;
    
    console.log('Auth Check - Current Path:', currentPath);
    console.log('Auth Check - Clean Path:', cleanPath);
    console.log('Auth Check - Admin Token:', adminToken ? 'Exists' : 'Missing');
    console.log('Auth Check - Admin Type:', adminType);
    
    // Helper function to redirect to login (use explicit, existing routes)
    const redirectToLogin = () => {
        const isButcheryPath = cleanPath.includes('butchery-admin');
        let loginPath;
        if (isButcheryPath) {
            loginPath = `${basePath}/butchery-admin/login`; // server has explicit route
        } else {
            loginPath = `${basePath}/admin/admin-login.html`; // static file for regular admin
        }
        const normalizedTarget = normalizePath(loginPath);
        const normalizedHere = normalizePath(currentPath);
        // compare both full and without basePath
        const hereNoBase = normalizedHere.replace(normalizePath(basePath), '');
        const targetNoBase = normalizedTarget.replace(normalizePath(basePath), '');
        if (normalizedHere === normalizedTarget || hereNoBase === targetNoBase) {
            console.log('Auth Check - Already on login page, no redirect');
            return;
        }
        console.log('Auth Check - Redirecting to login:', loginPath);
        sessionStorage.setItem('authRedirecting', 'true');
        window.location.replace(loginPath);
    };
    
    // Validate stored data
    if (adminToken && (!adminData || typeof adminData !== 'object')) {
        // Don't clear token aggressively; rely on token for type during initial post-login navigation
        console.log('Auth Check - adminData missing or invalid; using token payload if available');
    }
    
    const isLoginPage = (
        cleanPath.endsWith('/admin/admin-login') ||
        cleanPath.includes('/admin/admin-login') ||
        cleanPath.endsWith('/butchery-admin/login') ||
        cleanPath.includes('/butchery-admin/login') ||
        cleanPath.includes('shared-admin-login') ||
        cleanPath.endsWith('login') || cleanPath.includes('-login')
    );
    console.log('Auth Check - Is Login Page:', isLoginPage);
    
    // Helper function to get dashboard path
    const getDashboardPath = (adminType) => {
        // Use base urls that the server actually serves
        if (adminType === 'butchery') {
            return `${basePath}/butchery-admin`;
        } else {
            return `${basePath}/admin`;
        }
    };
    
    // Function to get the correct login path
    const getLoginPath = (adminType = 'cafeteria') => {
        if (adminType === 'butchery') {
            return `${basePath}/butchery-admin/butcheryadmin-login`;
        } else {
            return `${basePath}/admin/admin-login.html`;
        }
    };

    // If on login page and already logged in, redirect to appropriate dashboard
    if (isLoginPage && adminToken && adminData && adminType) {
        console.log('Auth Check - Already logged in, checking redirection...');
        const targetPath = getDashboardPath(adminType);

        // Only redirect if we're not already on the target page
        const normalizedTarget = normalizePath(targetPath);
        const normalizedHere = normalizePath(currentPath);
        const hereNoBase = normalizedHere.replace(normalizePath(basePath), '');
        const targetNoBase = normalizedTarget.replace(normalizePath(basePath), '');
        // Avoid redirect if we're already under the correct dashboard base (e.g., /admin/...)
        if (!(normalizedHere === normalizedTarget || hereNoBase === targetNoBase || hereNoBase.startsWith(targetNoBase + '/'))) {
            console.log('Auth Check - Redirecting to dashboard:', targetPath);
            sessionStorage.setItem('authRedirecting', 'true');
            window.location.replace(targetPath);
        } else {
            console.log('Auth Check - Already on the correct dashboard');
        }
        return;
    }

    // Strong guard: if we have a token and a resolvable adminType and we're already under the correct base, do nothing
    if (adminToken && adminType) {
        const expectedBase = normalizePath(getDashboardPath(adminType));
        const here = normalizePath(currentPath);
        const hereNoBase = here.replace(normalizePath(basePath), '');
        const expectedNoBase = expectedBase.replace(normalizePath(basePath), '');
        if (here === expectedBase || hereNoBase === expectedNoBase || hereNoBase.startsWith(expectedNoBase + '/')) {
            console.log('Auth Check - On correct admin base with token; skipping redirects');
            return;
        }
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
    const isOnButchery = cleanPath.includes('butchery-admin');
    const isOnRegularAdmin = cleanPath.includes('/admin') && !isOnButchery;

    let shouldRedirect = false;
    let targetPath = '';

    if (adminType === 'butchery' && !isOnButchery) {
        shouldRedirect = true;
        targetPath = getDashboardPath('butchery');
    } else if (adminType === 'cafeteria' && !isOnRegularAdmin) {
        shouldRedirect = true;
        targetPath = getDashboardPath('cafeteria');
    }

    // Only redirect if we're on the wrong admin section
    if (shouldRedirect) {
        const normalizedTarget = normalizePath(targetPath);
        const normalizedHere = normalizePath(currentPath);
        const hereNoBase = normalizedHere.replace(normalizePath(basePath), '');
        const targetNoBase = normalizedTarget.replace(normalizePath(basePath), '');
        if (!(normalizedHere === normalizedTarget || hereNoBase === targetNoBase || hereNoBase.startsWith(targetNoBase + '/'))) {
            console.log('Auth Check - Redirecting to correct admin section:', targetPath);
            sessionStorage.setItem('authRedirecting', 'true');
            window.location.replace(targetPath);
            return;
        }
    }
    
    console.log('Auth Check - No redirection needed - already on correct page');
});