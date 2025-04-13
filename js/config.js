// Configuration and constants
const CONFIG = {
    // Spotify API
    clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
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

export default CONFIG;