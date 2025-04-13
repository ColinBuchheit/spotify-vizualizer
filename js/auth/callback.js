// Handle Spotify authentication callback
document.addEventListener('DOMContentLoaded', () => {
    // Get hash params from URL
    const getHashParams = () => {
        const hashParams = {};
        const r = /([^&;=]+)=?([^&;]*)/g;
        const q = window.location.hash.substring(1);
        let e;
        
        while (e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        
        return hashParams;
    };
    
    const params = getHashParams();
    
    // Store tokens in localStorage
    if (params.access_token) {
        localStorage.setItem('spotify_access_token', params.access_token);
        localStorage.setItem('spotify_token_timestamp', Date.now());
        localStorage.setItem('spotify_expires_in', params.expires_in);
        
        // Redirect back to main app
        window.location.href = '/';
    } else {
        // Handle error
        console.error('Authentication failed');
        window.location.href = '/?error=authentication_failed';
    }
});