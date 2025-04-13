class SpotifyAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.spotify.com/v1';
    }
    
    // Set or update access token
    setAccessToken(token) {
        this.accessToken = token;
    }
    
    // Get user profile information
    async getMe() {
        return this.makeRequest('/me');
    }
    
    // Get user's current playback state
    async getPlaybackState() {
        return this.makeRequest('/me/player');
    }
    
    // Get user's currently playing track
    async getCurrentlyPlaying() {
        return this.makeRequest('/me/player/currently-playing');
    }
    
    // Get audio features for a track
    async getAudioFeatures(trackId) {
        return this.makeRequest(`/audio-features/${trackId}`);
    }
    
    // Get audio analysis for a track
    async getAudioAnalysis(trackId) {
        return this.makeRequest(`/audio-analysis/${trackId}`);
    }
    
    // Get user's playlists
    async getUserPlaylists(limit = 20, offset = 0) {
        return this.makeRequest(`/me/playlists?limit=${limit}&offset=${offset}`);
    }
    
    // Get tracks from a playlist
    async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
        return this.makeRequest(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
    }
    
    // Play a track or playlist
    async play(deviceId, contextUri = null, uris = null, offset = null, position_ms = 0) {
        const options = {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                context_uri: contextUri,
                uris: uris,
                offset: offset,
                position_ms: position_ms
            })
        };
        
        return this.makeRequest(`/me/player/play?device_id=${deviceId}`, options);
    }
    
    // Pause playback
    async pause(deviceId) {
        const options = {
            method: 'PUT'
        };
        
        return this.makeRequest(`/me/player/pause?device_id=${deviceId}`, options);
    }
    
    // Skip to next track
    async skipToNext(deviceId) {
        const options = {
            method: 'POST'
        };
        
        return this.makeRequest(`/me/player/next?device_id=${deviceId}`, options);
    }
    
    // Skip to previous track
    async skipToPrevious(deviceId) {
        const options = {
            method: 'POST'
        };
        
        return this.makeRequest(`/me/player/previous?device_id=${deviceId}`, options);
    }
    
    // Seek to position in track
    async seekToPosition(position_ms, deviceId) {
        const options = {
            method: 'PUT'
        };
        
        return this.makeRequest(`/me/player/seek?position_ms=${position_ms}&device_id=${deviceId}`, options);
    }
    
    // Set volume
    async setVolume(volumePercent, deviceId) {
        const options = {
            method: 'PUT'
        };
        
        return this.makeRequest(`/me/player/volume?volume_percent=${volumePercent}&device_id=${deviceId}`, options);
    }
    
    // Toggle shuffle
    async setShuffle(state, deviceId) {
        const options = {
            method: 'PUT'
        };
        
        return this.makeRequest(`/me/player/shuffle?state=${state}&device_id=${deviceId}`, options);
    }
    
    // Set repeat mode
    async setRepeat(state, deviceId) {
        const options = {
            method: 'PUT'
        };
        
        return this.makeRequest(`/me/player/repeat?state=${state}&device_id=${deviceId}`, options);
    }
    
    // Helper method to make API requests
    async makeRequest(endpoint, options = {}) {
        if (!this.accessToken) {
            throw new Error('Access token is required for API requests');
        }
        
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            }
        };
        
        const requestOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };
        
        try {
            const response = await fetch(url, requestOptions);
            
            // If response has no content, return success flag
            if (response.status === 204) {
                return { success: true };
            }
            
            // If response has content, parse JSON
            if (response.ok) {
                return await response.json();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error.message || 'API request failed');
            }
        } catch (error) {
            console.error('Spotify API request failed:', error);
            throw error;
        }
    }
}

// Initialize API when accessToken is available
if (spotifyAuth && spotifyAuth.accessToken) {
    window.spotifyApi = new SpotifyAPI(spotifyAuth.accessToken);
}