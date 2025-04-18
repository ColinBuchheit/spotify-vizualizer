// src/ui/PlaybackControls.js
import { getStoredAccessToken } from '../auth/handleAuth.js';

/**
 * Create playback controls for Spotify
 * @param {Object} player - Spotify Web Player instance
 * @param {Function} onPlaybackChange - Optional callback when playback state changes
 * @returns {Object} - Playback controls object with element and methods
 */
export function createPlaybackControls(player, onPlaybackChange = null) {
    // Create container
    const container = document.createElement('div');
    container.className = 'playback-controls';
    
    // Create Play/Pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'control-btn play-pause';
    playPauseBtn.innerHTML = getPlayIcon();
    playPauseBtn.setAttribute('aria-label', 'Play');
    
    // Create Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'control-btn prev';
    prevBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" fill="currentColor"/></svg>`;
    prevBtn.setAttribute('aria-label', 'Previous Track');
    
    // Create Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'control-btn next';
    nextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M16 6h2v12h-2zm-8 6l8.5-6v12z" fill="currentColor"/></svg>`;
    nextBtn.setAttribute('aria-label', 'Next Track');
    
    // Create a track info display element
    const trackInfoDisplay = document.createElement('div');
    trackInfoDisplay.className = 'track-info-display';
    trackInfoDisplay.innerHTML = '<span class="track-name">No track playing</span>';
    
    // Add elements to container
    container.appendChild(prevBtn);
    container.appendChild(playPauseBtn);
    container.appendChild(nextBtn);
    container.appendChild(trackInfoDisplay);
    
    // Track state
    let isPlaying = false;
    let currentTrack = null;
    
    // Add event listeners
    playPauseBtn.addEventListener('click', handlePlayPause);
    prevBtn.addEventListener('click', handlePrevious);
    nextBtn.addEventListener('click', handleNext);
    
    // If player is available, set up state listener
    if (player) {
        player.addListener('player_state_changed', handlePlayerStateChange);
    }
    
    /**
     * Handle play/pause button click
     */
    async function handlePlayPause() {
        if (!player) {
            showMessage('Player not initialized. Please refresh the page.');
            return;
        }
        
        try {
            // Get current state first
            const state = await player.getCurrentState();
            
            // If no state, try to start playback
            if (!state) {
                showMessage('No active playback. Start playing a track first.');
                return;
            }
            
            // Toggle playback based on current state
            if (state.paused) {
                // Update UI immediately for responsiveness
                updatePlayingState(true);
                await player.resume();
            } else {
                // Update UI immediately for responsiveness
                updatePlayingState(false);
                await player.pause();
            }
        } catch (error) {
            console.error('Error toggling playback:', error);
            showMessage('Failed to control playback. Please try again.');
        }
    }
    
    /**
     * Handle previous button click
     */
    async function handlePrevious() {
        if (!player) {
            showMessage('Player not initialized. Please refresh the page.');
            return;
        }
        
        try {
            await player.previousTrack();
        } catch (error) {
            console.error('Error playing previous track:', error);
            showMessage('Failed to play previous track. Please try again.');
        }
    }
    
    /**
     * Handle next button click
     */
    async function handleNext() {
        if (!player) {
            showMessage('Player not initialized. Please refresh the page.');
            return;
        }
        
        try {
            await player.nextTrack();
        } catch (error) {
            console.error('Error playing next track:', error);
            showMessage('Failed to play next track. Please try again.');
        }
    }
    
    /**
     * Handle player state changes
     * @param {Object} state - Spotify player state
     */
    function handlePlayerStateChange(state) {
        if (!state) {
            // If no state, either no music is playing or player is not active
            updatePlayingState(false);
            updateTrackInfo(null);
            return;
        }
        
        // Update playing state
        const playing = !state.paused;
        updatePlayingState(playing);
        
        // Update track info if track changed
        if (state.track_window && state.track_window.current_track) {
            const track = state.track_window.current_track;
            
            // Only update if track changed
            if (!currentTrack || currentTrack.id !== track.id) {
                updateTrackInfo(track);
            }
        }
        
        // Call callback if provided
        if (onPlaybackChange) {
            onPlaybackChange(state);
        }
    }
    
    /**
     * Update the playing state UI
     * @param {boolean} playing - Whether music is playing
     */
    function updatePlayingState(playing) {
        isPlaying = playing;
        
        // Update button appearance
        if (playing) {
            playPauseBtn.innerHTML = getPauseIcon();
            playPauseBtn.setAttribute('aria-label', 'Pause');
        } else {
            playPauseBtn.innerHTML = getPlayIcon();
            playPauseBtn.setAttribute('aria-label', 'Play');
        }
    }
    
    /**
     * Update track info display
     * @param {Object} track - Track object from Spotify
     */
    function updateTrackInfo(track) {
        currentTrack = track;
        
        if (track) {
            trackInfoDisplay.innerHTML = `
                <span class="track-name">${track.name}</span>
                <span class="track-artist">${track.artists[0].name}</span>
            `;
        } else {
            trackInfoDisplay.innerHTML = '<span class="track-name">No track playing</span>';
        }
    }
    
    /**
     * Play a specific track by URI
     * @param {string} uri - Spotify track URI
     */
    async function playTrack(uri) {
        if (!player) {
            showMessage('Player not initialized. Please refresh the page.');
            return;
        }
        
        try {
            // Get device ID from the player
            let deviceId;
            
            // Try to get device ID from player state
            const state = await player.getCurrentState();
            if (state && state.device_id) {
                deviceId = state.device_id;
            }
            
            // If not found, try to get from player options
            if (!deviceId && player._options && player._options.id) {
                deviceId = player._options.id;
            }
            
            // Check global variable as fallback
            if (!deviceId && window.spotifyDeviceId) {
                deviceId = window.spotifyDeviceId;
            }
            
            if (!deviceId) {
                throw new Error('No active device found. Make sure the player is ready.');
            }
            
            // Get fresh token
            const accessToken = await getStoredAccessToken();
            if (!accessToken) {
                throw new Error('No valid access token found');
            }
            
            // Play the track
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    uris: [uri]
                })
            });
            
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('No active device found. Make sure the player is ready.');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Play track error:', response.status, errorData);
                    throw new Error('Failed to play track');
                }
            }
            
            // Update UI state - player state change event will handle the rest
            updatePlayingState(true);
            
        } catch (error) {
            console.error('Error playing track:', error);
            showMessage(`Error: ${error.message || 'Failed to play track'}`);
        }
    }
    
    /**
     * Show a temporary message to the user
     * @param {string} message - Message to display
     */
    function showMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-notification';
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Show message
        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
    
    // Public API
    return {
        element: container,
        playTrack,
        updatePlayerState: handlePlayerStateChange,
        
        // Add method to update player reference
        updatePlayer: (newPlayer) => {
            if (player) {
                // Remove listener from old player
                player.removeListener('player_state_changed', handlePlayerStateChange);
            }
            
            // Update player reference
            if (newPlayer) {
                newPlayer.addListener('player_state_changed', handlePlayerStateChange);
            }
        }
    };
}

/**
 * Get play icon SVG
 * @returns {string} - SVG HTML for play icon
 */
function getPlayIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M8 5v14l11-7z" fill="currentColor"/>
        </svg>
    `;
}

/**
 * Get pause icon SVG
 * @returns {string} - SVG HTML for pause icon
 */
function getPauseIcon() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <path fill="none" d="M0 0h24v24H0z"/>
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" fill="currentColor"/>
        </svg>
    `;
}