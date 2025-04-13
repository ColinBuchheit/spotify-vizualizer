class SpotifyAuth {
    constructor() {
        this.accessToken = null;
        this.expiresIn = 0;
        this.player = null;
        this.deviceId = null;
        
        // Check if redirected from Spotify auth
        this.checkUrlHash();
        
        // Initialize login button with improved event binding
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            console.log('Found login button, adding click handler');
            loginButton.addEventListener('click', this.login.bind(this));
        } else {
            console.error('Login button not found!');
        }
    }
    
    login() {
        console.log('Login button clicked');
        // Generate random state for security
        const state = this.generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);
        
        // Ensure CONFIG is available
        if (!window.CONFIG) {
            console.error('CONFIG is not defined');
            alert('Configuration error. Please check console for details.');
            return;
        }
        
        // Construct auth URL
        const redirectUri = window.CONFIG.redirectUri || 'http://127.0.0.1:5173/callback';
        const clientId = window.CONFIG.clientId;
        const scopes = window.CONFIG.scopes || ['streaming', 'user-read-email', 'user-read-private', 'user-read-playback-state', 'user-modify-playback-state'];
        
        if (!clientId) {
            console.error('Client ID is missing');
            alert('Spotify Client ID is missing. Please check your configuration.');
            return;
        }
        
        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', clientId);
        authUrl.searchParams.append('response_type', 'token');
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', scopes.join(' '));
        
        console.log('Redirecting to Spotify auth:', authUrl.toString());
        
        // Redirect to Spotify auth
        window.location.href = authUrl.toString();
    }
    
    checkUrlHash() {
        if (window.location.hash) {
            const params = this.getHashParams();
            
            // Check for state to prevent CSRF
            const storedState = localStorage.getItem('spotify_auth_state');
            
            // Only check state if both params.state and storedState exist
            if (params.state && storedState && params.state !== storedState) {
                console.error('State mismatch');
                return;
            }
            
            if (params.access_token) {
                this.accessToken = params.access_token;
                this.expiresIn = params.expires_in || 3600; // Default to 1 hour if not provided
                
                // Store token in localStorage
                localStorage.setItem('spotify_access_token', this.accessToken);
                localStorage.setItem('spotify_token_timestamp', Date.now());
                localStorage.setItem('spotify_expires_in', this.expiresIn);
                
                // Clear URL hash
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Initialize Spotify player
                this.initializePlayer();
                
                // Hide login button, show player
                const loginContainer = document.getElementById('login-container');
                const playerContainer = document.getElementById('player-container');
                
                if (loginContainer) loginContainer.classList.add('hidden');
                if (playerContainer) playerContainer.classList.remove('hidden');
            }
        } else {
            // Check if we have a token in localStorage
            const token = localStorage.getItem('spotify_access_token');
            const expiration = localStorage.getItem('spotify_expires_in');
            const timestamp = localStorage.getItem('spotify_token_timestamp');
            
            if (token && expiration && timestamp) {
                const now = Date.now();
                const expiresAt = parseInt(timestamp) + (parseInt(expiration) * 1000);
                
                if (now < expiresAt) {
                    this.accessToken = token;
                    this.expiresIn = (expiresAt - now) / 1000;
                    
                    // Initialize Spotify player
                    this.initializePlayer();
                    
                    // Hide login button, show player
                    const loginContainer = document.getElementById('login-container');
                    const playerContainer = document.getElementById('player-container');
                    
                    if (loginContainer) loginContainer.classList.add('hidden');
                    if (playerContainer) playerContainer.classList.remove('hidden');
                } else {
                    // Token expired, clear it
                    localStorage.removeItem('spotify_access_token');
                    localStorage.removeItem('spotify_token_timestamp');
                    localStorage.removeItem('spotify_expires_in');
                    console.log('Spotify token expired, please log in again');
                }
            }
        }
    }
    
    getHashParams() {
        const hashParams = {};
        const r = /([^&;=]+)=?([^&;]*)/g;
        const q = window.location.hash.substring(1);
        let e;
        
        while (e = r.exec(q)) {
            hashParams[e[1]] = decodeURIComponent(e[2]);
        }
        
        return hashParams;
    }
    
    generateRandomString(length) {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        
        return text;
    }
    
    initializePlayer() {
        console.log('Initializing Spotify player...');
        
        // Check if Spotify SDK is loaded
        if (typeof Spotify === 'undefined') {
            console.warn('Spotify SDK not loaded yet, waiting...');
            setTimeout(() => this.initializePlayer(), 1000);
            return;
        }
        
        // Check if we have an access token
        if (!this.accessToken) {
            console.error('No access token available');
            return;
        }
        
        this.player = new Spotify.Player({
            name: 'Spotify Music Visualizer',
            getOAuthToken: cb => { cb(this.accessToken); }
        });
        
        // Error handling
        this.player.addListener('initialization_error', ({ message }) => { 
            console.error('Initialization error:', message); 
        });
        this.player.addListener('authentication_error', ({ message }) => { 
            console.error('Authentication error:', message); 
            // Clear token on auth error
            localStorage.removeItem('spotify_access_token');
            localStorage.removeItem('spotify_token_timestamp');
            localStorage.removeItem('spotify_expires_in');
            // Show login button again
            const loginContainer = document.getElementById('login-container');
            const playerContainer = document.getElementById('player-container');
            if (loginContainer) loginContainer.classList.remove('hidden');
            if (playerContainer) playerContainer.classList.add('hidden');
        });
        this.player.addListener('account_error', ({ message }) => { 
            console.error('Account error:', message); 
        });
        this.player.addListener('playback_error', ({ message }) => { 
            console.error('Playback error:', message); 
        });
        
        // Playback status updates
        this.player.addListener('player_state_changed', state => {
            console.log('Player state changed:', state);
            if (state) {
                this.updatePlayerInfo(state);
                // Update audio analyzer with new track data
                if (window.audioAnalyzer) {
                    window.audioAnalyzer.updateTrackData(state);
                }
            }
        });
        
        // Ready
        this.player.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
            this.deviceId = device_id;
            
            // Transfer playback to our player
            this.transferPlayback(device_id);
        });
        
        // Not ready
        this.player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
        });
        
        // Connect to the player
        console.log('Connecting to Spotify player...');
        this.player.connect().then(success => {
            if (success) {
                console.log('Successfully connected to Spotify!');
            } else {
                console.error('Failed to connect to Spotify player');
            }
        }).catch(error => {
            console.error('Error connecting to Spotify:', error);
        });
        
        // Set up player control buttons
        const playPauseButton = document.getElementById('play-pause-button');
        const previousButton = document.getElementById('previous-button');
        const nextButton = document.getElementById('next-button');
        
        if (playPauseButton) {
            playPauseButton.addEventListener('click', () => this.togglePlay());
        }
        
        if (previousButton) {
            previousButton.addEventListener('click', () => this.player.previousTrack());
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => this.player.nextTrack());
        }
    }
    
    updatePlayerInfo(state) {
        console.log('Updating player info');
        const trackName = document.getElementById('track-name');
        const artistName = document.getElementById('artist-name');
        const albumArt = document.getElementById('album-art');
        const playPauseButton = document.getElementById('play-pause-button');
        
        if (state.track_window.current_track) {
            const track = state.track_window.current_track;
            
            if (trackName) trackName.textContent = track.name;
            if (artistName) artistName.textContent = track.artists.map(artist => artist.name).join(', ');
            if (albumArt && track.album.images && track.album.images.length > 0) albumArt.src = track.album.images[0].url;
            
            if (playPauseButton) playPauseButton.textContent = state.paused ? 'Play' : 'Pause';
        }
    }
    
    togglePlay() {
        if (this.player) {
            this.player.togglePlay().then(() => {
                console.log('Toggled playback');
            });
        }
    }
    
    transferPlayback(deviceId) {
        if (!this.accessToken) {
            console.error('No access token available for transfer playback');
            return;
        }
        
        fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device_ids: [deviceId],
                play: false
            })
        }).then(response => {
            if (!response.ok) {
                console.error('Error transferring playback:', response.status);
                if (response.status === 401) {
                    // Token expired or invalid
                    localStorage.removeItem('spotify_access_token');
                    localStorage.removeItem('spotify_token_timestamp');
                    localStorage.removeItem('spotify_expires_in');
                    // Show login button again
                    const loginContainer = document.getElementById('login-container');
                    const playerContainer = document.getElementById('player-container');
                    if (loginContainer) loginContainer.classList.remove('hidden');
                    if (playerContainer) playerContainer.classList.add('hidden');
                }
            } else {
                console.log('Playback transferred successfully');
            }
        }).catch(error => {
            console.error('Failed to transfer playback:', error);
        });
    }
}

// Initialize Spotify auth
window.spotifyAuth = new SpotifyAuth();
console.log('SpotifyAuth initialized');