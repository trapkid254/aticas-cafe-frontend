# Deployment Guide - Aticas Cafe

## Issues Fixed

### 1. **API Endpoint Inconsistency**
- **Problem**: `cart.js` was using `http://localhost:3000` instead of the production backend URL
- **Solution**: Updated all API endpoints to use `https://aticas-backend.onrender.com`

### 2. **Error Handling**
- **Problem**: Missing proper error handling for network requests
- **Solution**: Added comprehensive error handling and user-friendly error messages

### 3. **CORS Issues**
- **Problem**: Mixed localhost and production URLs causing CORS errors
- **Solution**: Standardized all API calls to use production endpoints

## Files Modified

### Core Fixes:
- `frontend/js/cart.js` - Fixed all localhost references
- `frontend/js/script.js` - Improved error handling
- `frontend/css/style.css` - Added error/success toast styling

### New Files:
- `frontend/js/config.js` - Centralized API configuration
- `frontend/js/utils.js` - Utility functions for error handling

## Deployment Steps

### 1. **Backend (Render.com)**
- Ensure your backend is deployed and running on Render
- Verify the URL: `https://aticas-backend.onrender.com`
- Check that all API endpoints are working

### 2. **Frontend (Netlify)**
- Push these changes to your Git repository
- Netlify will automatically redeploy
- Or manually trigger a new deployment

### 3. **Environment Variables**
- No environment variables needed for frontend
- Backend should have proper environment variables set

## Testing After Deployment

### 1. **Check Console Errors**
- Open browser developer tools (F12)
- Go to Console tab
- Verify no more localhost errors

### 2. **Test Core Features**
- ✅ Load homepage without errors
- ✅ View menu items
- ✅ Add items to cart
- ✅ Checkout process
- ✅ Admin panel access

### 3. **Common Issues to Watch For**

#### If you still see errors:
1. **CORS Errors**: Check if backend CORS is configured for your Netlify domain
2. **404 Errors**: Verify backend API endpoints are correct
3. **Network Errors**: Check if backend is running on Render

#### Backend CORS Configuration:
Make sure your backend allows requests from your Netlify domain:
```javascript
app.use(cors({
    origin: [
        'https://your-netlify-app.netlify.app',
        'http://localhost:3000' // for local development
    ],
    credentials: true
}));
```

## Monitoring

### 1. **Netlify Logs**
- Check Netlify deployment logs for build errors
- Monitor function execution logs

### 2. **Render Logs**
- Check backend logs on Render dashboard
- Monitor API response times

### 3. **Browser Console**
- Regularly check for new console errors
- Monitor network requests in Network tab

## Future Improvements

### 1. **Use Configuration File**
Consider updating other JS files to use the new `config.js`:
```javascript
// Instead of hardcoded URLs
const response = await fetch('https://aticas-backend.onrender.com/api/menu');

// Use configuration
const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.MENU));
```

### 2. **Environment-Based Configuration**
For easier development/production switching:
```javascript
const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://aticas-backend.onrender.com'
};
```

### 3. **Error Monitoring**
Consider adding error tracking:
- Sentry for error monitoring
- Google Analytics for user behavior
- Custom error logging

## Support

If you continue to see errors after deployment:
1. Check the browser console for specific error messages
2. Verify your backend is running and accessible
3. Test API endpoints directly in browser or Postman
4. Check Netlify and Render logs for deployment issues 