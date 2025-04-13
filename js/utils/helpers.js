// Utility functions for the Spotify Music Visualizer

/**
 * Format milliseconds to time string (mm:ss)
 * @param {number} ms - Time in milliseconds
 * @returns {string} Formatted time string
 */
function formatTime(ms) {
    if (!ms || ms < 0) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Throttle function to limit how often a function can be called
 * @param {Function} func - Function to throttle
 * @param {number} limit - Throttle limit in ms
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    
    return function() {
        const args = arguments;
        const context = this;
        
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Debounce function to delay function execution until after wait
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    
    return function() {
        const context = this;
        const args = arguments;
        
        clearTimeout(timeout);
        
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Generate a random color
 * @returns {number} Random color as hexadecimal
 */
function getRandomColor() {
    return Math.floor(Math.random() * 0xffffff);
}

/**
 * Linear interpolation between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} inMin - Input range minimum
 * @param {number} inMax - Input range maximum
 * @param {number} outMin - Output range minimum
 * @param {number} outMax - Output range maximum
 * @returns {number} Mapped value
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Convert HSL color to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Object} RGB color object {r, g, b}
 */
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Convert RGB values to hexadecimal color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} Hexadecimal color
 */
function rgbToHex(r, g, b) {
    return (r << 16) | (g << 8) | b;
}

/**
 * Create a color based on audio frequency
 * @param {number} frequency - Frequency value
 * @returns {number} Color as hexadecimal
 */
function frequencyToColor(frequency) {
    // Map frequency range to hue (0-360)
    const hue = mapRange(frequency, 20, 20000, 240, 0);
    const saturation = 80;
    const lightness = 50;
    
    const rgb = hslToRgb(hue, saturation, lightness);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Check if the browser supports Web Audio API
 * @returns {boolean} Whether Web Audio API is supported
 */
function isWebAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Check if the browser supports WebGL
 * @returns {boolean} Whether WebGL is supported
 */
function isWebGLSupported() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

/**
 * Check browser compatibility for the app
 * @returns {Object} Compatibility status
 */
function checkCompatibility() {
    return {
        webAudio: isWebAudioSupported(),
        webGL: isWebGLSupported(),
        isCompatible: isWebAudioSupported() && isWebGLSupported()
    };
}

/**
 * Handle errors and display user-friendly messages
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 */
function handleError(error, context = 'Application') {
    console.error(`[${context}] Error:`, error);
    
    // Display error to user (if needed)
    // This could be expanded to show a proper UI error message
}

/**
 * Get dominant color from an image
 * @param {HTMLImageElement} img - Image element
 * @returns {Promise<number>} Dominant color as hexadecimal
 */
function getDominantColor(img) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 1;
            canvas.height = 1;
            
            ctx.drawImage(img, 0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            
            resolve(rgbToHex(data[0], data[1], data[2]));
        } catch (e) {
            reject(e);
        }
    });
}

// Export helpers to window for global access
window.helpers = {
    formatTime,
    throttle,
    debounce,
    getRandomColor,
    lerp,
    clamp,
    mapRange,
    hslToRgb,
    rgbToHex,
    frequencyToColor,
    isWebAudioSupported,
    isWebGLSupported,
    checkCompatibility,
    handleError,
    getDominantColor
};