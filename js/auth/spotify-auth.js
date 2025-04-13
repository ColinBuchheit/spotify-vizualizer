class SpotifyAuth {
    constructor() {
        this.accessToken = null;
        this.expiresIn = 0;
        this.player = null;
        this.deviceId = null;
        
        // Check if redirected from Spotify auth
        this.checkUrlHash();
        
        // Initialize login button
        document.getElementById('login-button').addEventListener('click', () => this.login());
    }
    
    login() {
        // Generate random state for security
        const state = this.generateRandomString(16);
        localStorage.setItem('spotify_auth_state', state);
        
        // Construct auth URL
        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', CONFIG.clientId);
        authUrl.searchParams.append('response_type', 'token');
        authUrl.searchParams.append('redirect_uri', CONFIG.redirectUri);
        authUrl.searchParams.append('state', state);
        authUrl.searchParams.append('scope', CONFIG.scopes.join(' '));
        
        // Redirect to Spotify auth
        window.location.href = authUrl.toString();
    }
    
    checkUrlHash() {
        if (window.location.hash) {
            const params = this.getHashParams();
            
            // Check for state to prevent CSRF
            const storedState = localStorage.getItem('spotify_auth_state');
            if (params.state !== storedState) {
                console.error('State mismatch');
                return;
            }
            
            if (params.access_token) {
                this.accessToken = params.access_token;
                this.expiresIn = params.expires_in;
                
                // Clear URL hash
                window.history.replaceState({}, document.title, window.location.pathname);
                
                // Initialize Spotify player
                this.initializePlayer();
                
                // Hide login button, show player
                document.getElementById('login-container').classList.add('hidden');
                document.getElementById('player-container').classList.remove('hidden');
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
        // Initialize Spotify Web Playback SDK
        window.onSpotifyWebPlaybackSDKReady = () => {
            this.player = new Spotify.Player({
                name: 'Spotify Music Visualizer',
                getOAuthToken: cb => { cb(this.accessToken); }
            });
            
            // Error handling
            this.player.addListener('initialization_error', ({ message }) => { console.error(message); });
            this.player.addListener('authentication_error', ({ message }) => { console.error(message); });
            this.player.addListener('account_error', ({ message }) => { console.error(message); });
            this.player.addListener('playback_error', ({ message }) => { console.error(message); });
            
            // Playback status updates
            this.player.addListener('player_state_changed', state => {
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
            
            // Connect to the player
            this.player.connect();
            
            // Set up player control buttons
            document.getElementById('play-pause-button').addEventListener('click', () => this.togglePlay());
            document.getElementById('previous-button').addEventListener('click', () => this.player.previousTrack());
            document.getElementById('next-button').addEventListener('click', () => this.player.nextTrack());
        };
    }
    
    updatePlayerInfo(state) {
        const trackName = document.getElementById('track-name');
        const artistName = document.getElementById('artist-name');
        const albumArt = document.getElementById('album-art');
        const playPauseButton = document.getElementById('play-pause-button');
        
        if (state.track_window.current_track) {
            const track = state.track_window.current_track;
            
            trackName.textContent = track.name;
            artistName.textContent = track.artists.map(artist => artist.name).join(', ');
            albumArt.src = track.album.images[0].url;
            
            playPauseButton.textContent = state.paused ? 'Play' : 'Pause';
        }
    }
    
    togglePlay() {
        this.player.togglePlay();
    }
    
    transferPlayback(deviceId) {
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
        });
    }
}

// Initialize Spotify auth
const spotifyAuth = new SpotifyAuth();