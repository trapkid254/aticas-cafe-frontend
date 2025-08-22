// Check authentication and redirect if not logged in
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth check running...');
    
    const adminToken = localStorage.getItem('adminToken');
    const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
    const adminType = adminData.adminType; // Get adminType from adminData
    
    console.log('Admin Token:', adminToken ? 'Exists' : 'Missing');
    console.log('Admin Data:', adminData);
    console.log('Admin Type:', adminType);
    
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('login.html') || currentPath.includes('-login.html');
    
    console.log('Current Path:', currentPath);
    console.log('Is Login Page:', isLoginPage);
    
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
        console.log('Already logged in, checking redirection...');
        const redirectTo = adminType === 'butchery' 
            ? `${basePath}/butchery-admin/index.html` 
            : `${basePath}/admin/index.html`;
        const currentNormalized = normalizePath(window.location.pathname);
        const redirectNormalized = normalizePath(redirectTo);
        
        console.log('Current path normalized:', currentNormalized);
        console.log('Redirect path normalized:', redirectNormalized);
        
        if (currentNormalized !== redirectNormalized) {
            console.log('Redirecting to:', redirectTo);
            window.location.href = redirectTo;
        } else {
            console.log('Already on the correct page, no redirect needed');
        }
        return;
    }

    // If not logged in and not on login page, redirect to login
    if (!adminToken || !adminType) {
        console.log('Not logged in or missing admin type');
        const isButcheryPath = currentPath.includes('butchery-admin');
        const loginPath = isButcheryPath
            ? `${basePath}/butchery-admin/butcheryadmin-login.html`
            : `${basePath}/admin/admin-login.html`;
        
        const currentNormalized = normalizePath(window.location.pathname);
        const loginNormalized = normalizePath(loginPath);
        
        console.log('Current path:', currentNormalized);
        console.log('Login path:', loginNormalized);
        
        if (currentNormalized !== loginNormalized) {
            console.log('Redirecting to login page:', loginPath);
            window.location.href = loginPath;
        } else {
            console.log('Already on login page, no redirect needed');
        }
        return;
    }

    // Check if user is on the correct admin page based on their type
    const isCafeteriaAdmin = adminType === 'cafeteria';
    const isButcheryAdmin = adminType === 'butchery';
    
    console.log('Admin Type Check:', { isCafeteriaAdmin, isButcheryAdmin });
    
    // Check if we're already on the correct path
    const isOnCafeteriaPath = currentPath.includes('/admin/');
    const isOnButcheryPath = currentPath.includes('/butchery-admin/');
    
    console.log('Current Path Check:', { 
        isOnCafeteriaPath, 
        isOnButcheryPath,
        currentPath
    });
    
    // Only redirect if we're not already on the correct path
    if (isCafeteriaAdmin && !isOnCafeteriaPath) {
        const redirectTo = `${basePath}/admin/index.html`;
        console.log('Redirecting Cafeteria Admin to:', redirectTo);
        window.location.href = redirectTo;
        return;
    }

    if (isButcheryAdmin && !isOnButcheryPath) {
        const redirectTo = `${basePath}/butchery-admin/index.html`;
        console.log('Redirecting Butchery Admin to:', redirectTo);
        window.location.href = redirectTo;
        return;
    }
    
    console.log('No redirection needed - already on correct page');
});
