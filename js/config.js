// js/config.js
const CONFIG = {
    // Spotify API
    clientId: '12f4f9c6974f46fb9196c2e337396d79', // Using the value from your .env file
    redirectUri: 'http://127.0.0.1:5173/callback', // Using the value from your .env file
    scopes: [
        'streaming', 
        'user-read-email', 
        'user-read-private', 
        'user-read-playback-state', 
        'user-modify-playback-state'
    ],
    
    // Visualization settings
    visualizer: {
        cameraDistance: 1000,
        rotationSpeed: 0.005,
        bassColor: 0x1DB954, // Spotify green
        trebleColor: 0x1ED760,
        volumeColor: 0xFFFFFF
    }
};

// Make available globally
window.CONFIG = CONFIG;
console.log('Configuration loaded');