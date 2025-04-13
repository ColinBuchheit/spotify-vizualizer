// Initialize Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = function() {
    console.log('Spotify Web Playback SDK Ready');
    // This function will be called when the Spotify SDK is loaded
    // We'll manually initialize the player if needed
    if (window.spotifyAuth && typeof window.spotifyAuth.initializePlayer === 'function') {
        setTimeout(() => {
            window.spotifyAuth.initializePlayer();
        }, 1000); // Small delay to ensure auth is complete
    }
};