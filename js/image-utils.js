/**
 * Image URL Utility Functions
 * Provides consistent image URL construction and error handling across the application
 */

const IMAGE_CONFIG = {
    backendUrl: 'https://aticas-backend.onrender.com',
    defaultFallback: 'images/1b.jpg',
    adminFallback: '../images/1b.jpg',
    maxRetries: 3,
    retryDelay: 100 // milliseconds
};

/**
 * Constructs a proper image URL from an event image field
 * @param {string} imagePath - The image path from the database
 * @param {string} context - 'user' or 'admin' to determine fallback path
 * @returns {string} - The constructed image URL
 */
function constructImageUrl(imagePath, context = 'user') {
    if (!imagePath || typeof imagePath !== 'string') {
        return context === 'admin' ? IMAGE_CONFIG.adminFallback : IMAGE_CONFIG.defaultFallback;
    }

    const trimmedPath = imagePath.trim();
    const fallback = context === 'admin' ? IMAGE_CONFIG.adminFallback : IMAGE_CONFIG.defaultFallback;

    // Already a full URL
    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
        return trimmedPath;
    }

    // Path starts with /uploads/
    if (trimmedPath.startsWith('/uploads/')) {
        return `${IMAGE_CONFIG.backendUrl}${trimmedPath}`;
    }

    // Path starts with uploads/ (missing leading slash)
    if (trimmedPath.startsWith('uploads/')) {
        return `${IMAGE_CONFIG.backendUrl}/${trimmedPath}`;
    }

    // Try with /uploads/ prefix
    return `${IMAGE_CONFIG.backendUrl}/uploads/${trimmedPath}`;
}

/**
 * Creates an image element with comprehensive error handling
 * @param {string} imagePath - The image path from the database
 * @param {string} altText - Alt text for the image
 * @param {Object} options - Additional options
 * @returns {HTMLImageElement} - The configured image element
 */
function createImageElement(imagePath, altText = 'Event Image', options = {}) {
    const {
        context = 'user',
        className = '',
        style = {},
        onLoad = null,
        onError = null
    } = options;

    const img = document.createElement('img');
    const imageUrl = constructImageUrl(imagePath, context);
    
    img.src = imageUrl;
    img.alt = altText;
    img.loading = 'lazy';
    
    if (className) {
        img.className = className;
    }
    
    // Apply custom styles
    Object.assign(img.style, {
        backgroundColor: '#f0f0f0',
        objectFit: 'cover',
        ...style
    });

    let retryCount = 0;
    const fallback = context === 'admin' ? IMAGE_CONFIG.adminFallback : IMAGE_CONFIG.defaultFallback;

    // Enhanced error handling with retry logic
    img.onerror = function() {
        retryCount++;
        
        // Log the error
        logImageError({
            originalPath: imagePath,
            constructedUrl: imageUrl,
            retryCount: retryCount,
            eventId: options.eventId || 'unknown'
        });

        // Prevent infinite loop
        if (retryCount >= IMAGE_CONFIG.maxRetries) {
            console.warn(`[ImageUtils] Max retries (${IMAGE_CONFIG.maxRetries}) reached for image: ${imagePath}. Using fallback.`);
            this.src = fallback;
            this.onerror = null; // Prevent further error handling
            
            if (onError) {
                onError(this, { maxRetriesReached: true });
            }
            return;
        }

        // Try alternative URL constructions
        const alternativeUrls = generateAlternativeUrls(imagePath, context);
        const nextUrl = alternativeUrls[retryCount - 1];
        
        if (nextUrl && this.src !== nextUrl) {
            console.log(`[ImageUtils] Retry ${retryCount}: Trying alternative URL: ${nextUrl}`);
            setTimeout(() => {
                this.src = nextUrl;
            }, IMAGE_CONFIG.retryDelay * retryCount);
            return;
        }

        // Final fallback
        console.warn(`[ImageUtils] All alternative URLs failed. Using fallback image.`);
        this.src = fallback;
        this.onerror = null;
        
        if (onError) {
            onError(this, { allAlternativesFailed: true });
        }
    };

    // Log successful loads
    img.onload = function() {
        logImageSuccess({
            url: imageUrl,
            originalPath: imagePath,
            eventId: options.eventId || 'unknown'
        });
        
        if (onLoad) {
            onLoad(this);
        }
    };

    return img;
}

/**
 * Generates alternative URL constructions for retry attempts
 * @param {string} imagePath - The original image path
 * @param {string} context - 'user' or 'admin'
 * @returns {string[]} - Array of alternative URLs to try
 */
function generateAlternativeUrls(imagePath, context = 'user') {
    if (!imagePath) return [];
    
    const trimmedPath = imagePath.trim();
    const alternatives = [];

    // If it starts with /uploads/, try without leading slash
    if (trimmedPath.startsWith('/uploads/')) {
        alternatives.push(`${IMAGE_CONFIG.backendUrl}/uploads/${trimmedPath.substring(9)}`);
        alternatives.push(`${IMAGE_CONFIG.backendUrl}${trimmedPath}`);
    }
    // If it starts with uploads/, try with leading slash
    else if (trimmedPath.startsWith('uploads/')) {
        alternatives.push(`${IMAGE_CONFIG.backendUrl}/${trimmedPath}`);
        alternatives.push(`${IMAGE_CONFIG.backendUrl}/uploads/${trimmedPath.substring(8)}`);
    }
    // If it's just a filename, try different paths
    else {
        alternatives.push(`${IMAGE_CONFIG.backendUrl}/uploads/${trimmedPath}`);
        alternatives.push(`${IMAGE_CONFIG.backendUrl}/uploads/${trimmedPath.replace(/^\/+/, '')}`);
    }

    return alternatives.filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates
}

/**
 * Verifies if an image exists on the server
 * @param {string} imagePath - The image path to verify
 * @returns {Promise<boolean>} - True if image exists, false otherwise
 */
async function verifyImageExists(imagePath) {
    if (!imagePath) return false;
    
    const imageUrl = constructImageUrl(imagePath);
    
    try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.warn(`[ImageUtils] Failed to verify image: ${imagePath}`, error);
        return false;
    }
}

/**
 * Logs image loading errors for monitoring
 * @param {Object} errorInfo - Error information object
 */
function logImageError(errorInfo) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'IMAGE_LOAD_ERROR',
        ...errorInfo
    };
    
    console.error('[ImageUtils] Image load error:', logEntry);
    
    // Store in localStorage for potential reporting (limit to last 50 errors)
    try {
        const errorLog = JSON.parse(localStorage.getItem('imageErrorLog') || '[]');
        errorLog.push(logEntry);
        
        // Keep only last 50 errors
        if (errorLog.length > 50) {
            errorLog.shift();
        }
        
        localStorage.setItem('imageErrorLog', JSON.stringify(errorLog));
    } catch (e) {
        // Silently fail if localStorage is not available
    }
}

/**
 * Logs successful image loads
 * @param {Object} successInfo - Success information object
 */
function logImageSuccess(successInfo) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'IMAGE_LOAD_SUCCESS',
        ...successInfo
    };
    
    console.log('[ImageUtils] Image loaded successfully:', logEntry);
}

/**
 * Gets error log statistics
 * @returns {Object} - Statistics about image loading errors
 */
function getImageErrorStats() {
    try {
        const errorLog = JSON.parse(localStorage.getItem('imageErrorLog') || '[]');
        
        const stats = {
            totalErrors: errorLog.length,
            recentErrors: errorLog.slice(-10),
            errorsByPath: {},
            errorsByEvent: {}
        };
        
        errorLog.forEach(error => {
            const path = error.originalPath || 'unknown';
            const eventId = error.eventId || 'unknown';
            
            stats.errorsByPath[path] = (stats.errorsByPath[path] || 0) + 1;
            stats.errorsByEvent[eventId] = (stats.errorsByEvent[eventId] || 0) + 1;
        });
        
        return stats;
    } catch (e) {
        return { totalErrors: 0, recentErrors: [], errorsByPath: {}, errorsByEvent: {} };
    }
}

/**
 * Clears the error log
 */
function clearImageErrorLog() {
    try {
        localStorage.removeItem('imageErrorLog');
        console.log('[ImageUtils] Error log cleared');
    } catch (e) {
        console.warn('[ImageUtils] Failed to clear error log:', e);
    }
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.ImageUtils = {
        constructImageUrl,
        createImageElement,
        verifyImageExists,
        generateAlternativeUrls,
        logImageError,
        logImageSuccess,
        getImageErrorStats,
        clearImageErrorLog,
        IMAGE_CONFIG
    };
}

