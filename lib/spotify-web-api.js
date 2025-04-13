/**
 * Lightweight Spotify Web API JS Wrapper
 * Note: For production, you should use the official Spotify Web API JS library
 * https://github.com/spotify/web-api-js
 */

class SpotifyWebApi {
    constructor(options) {
        this.baseUri = 'https://api.spotify.com/v1';
        this.accessToken = options ? options.accessToken : null;
    }
    
    setAccessToken(accessToken) {
        this.accessToken = accessToken;
    }
    
    getAccessToken() {
        return this.accessToken;
    }
    
    _makeRequest(method, url, data) {
        const headers = {
            'Authorization': 'Bearer ' + this.accessToken
        };
        
        if (method === 'GET') {
            return fetch(url, {
                method: method,
                headers: headers
            }).then(response => {
                if (!response.ok) {
                    throw new Error('HTTP status ' + response.status);
                }
                return response.json();
            });
        } else {
            headers['Content-Type'] = 'application/json';
            
            return fetch(url, {
                method: method,
                headers: headers,
                body: JSON.stringify(data)
            }).then(response => {
                if (response.status === 204) {
                    return null;
                }
                if (!response.ok) {
                    throw new Error('HTTP status ' + response.status);
                }
                return response.json();
            });
        }
    }
    
    // User Profile
    getMe() {
        return this._makeRequest('GET', this.baseUri + '/me');
    }
    
    // Playlists
    getUserPlaylists(userId, options) {
        let url = userId ? `${this.baseUri}/users/${userId}/playlists` : `${this.baseUri}/me/playlists`;
        if (options) {
            url = this._addQueryParams(url, options);
        }
        return this._makeRequest('GET', url);
    }
    
    getPlaylist(playlistId, options) {
        let url = `${this.baseUri}/playlists/${playlistId}`;
        if (options) {
            url = this._addQueryParams(url, options);
        }
        return this._makeRequest('GET', url);
    }
    
    getPlaylistTracks(playlistId, options) {
        let url = `${this.baseUri}/playlists/${playlistId}/tracks`;
        if (options) {
            url = this._addQueryParams(url, options);
        }
        return this._makeRequest('GET', url);
    }
    
    // Player
    getMyCurrentPlaybackState() {
        return this._makeRequest('GET', this.baseUri + '/me/player');
    }
    
    getMyCurrentPlayingTrack() {
        return this._makeRequest('GET', this.baseUri + '/me/player/currently-playing');
    }
    
    transferMyPlayback(deviceIds, options) {
        const data = {
            device_ids: deviceIds
        };
        if (options && options.play) {
            data.play = options.play;
        }
        return this._makeRequest('PUT', this.baseUri + '/me/player', data);
    }
    
    play(options) {
        let url = this.baseUri + '/me/player/play';
        if (options && options.device_id) {
            url = this._addQueryParams(url, { device_id: options.device_id });
            delete options.device_id;
        }
        return this._makeRequest('PUT', url, options);
    }
    
    pause(options) {
        let url = this.baseUri + '/me/player/pause';
        if (options && options.device_id) {
            url = this._addQueryParams(url, { device_id: options.device_id });
        }
        return this._makeRequest('PUT', url);
    }
    
    skipToNext(options) {
        let url = this.baseUri + '/me/player/next';
        if (options && options.device_id) {
            url = this._addQueryParams(url, { device_id: options.device_id });
        }
        return this._makeRequest('POST', url);
    }
    
    skipToPrevious(options) {
        let url = this.baseUri + '/me/player/previous';
        if (options && options.device_id) {
            url = this._addQueryParams(url, { device_id: options.device_id });
        }
        return this._makeRequest('POST', url);
    }
    
    // Tracks
    getTrack(trackId) {
        return this._makeRequest('GET', `${this.baseUri}/tracks/${trackId}`);
    }
    
    getAudioFeaturesForTrack(trackId) {
        return this._makeRequest('GET', `${this.baseUri}/audio-features/${trackId}`);
    }
    
    getAudioAnalysisForTrack(trackId) {
        return this._makeRequest('GET', `${this.baseUri}/audio-analysis/${trackId}`);
    }
    
    // Helper methods
    _addQueryParams(url, params) {
        const paramString = Object.keys(params)
            .filter(key => params[key] !== undefined)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
            
        return url + (paramString ? (url.includes('?') ? '&' : '?') + paramString : '');
    }
}

// Make available globally
window.SpotifyWebApi = SpotifyWebApi;