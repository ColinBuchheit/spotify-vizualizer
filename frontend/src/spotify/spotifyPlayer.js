// src/spotify/spotifyPlayer.js
// Enhanced Spotify Player implementation with improved error handling and state management

let player = null;
let deviceId = null;
let playerInitPromise = null;
let playerInitResolver = null;
let stateListeners = [];

/**
 * Initialize the Spotify Player SDK
 * This function is called when the SDK script is loaded
 */
export function setupGlobalSpotifyCallback() {
  // Check if callback is already defined
  if (typeof window.onSpotifyWebPlaybackSDKReady !== 'function') {
    window.onSpotifyWebPlaybackSDKReady = function() {
      console.log('Spotify Web Playback SDK is ready');
      
      // Resolve the promise if setupSpotifyPlayer was already called
      if (playerInitResolver) {
        playerInitResolver();
      }
    };
  }
}

/**
 * Set up Spotify Web Playback SDK
 * @param {string} accessToken - Spotify access token
 * @returns {Promise} - Resolves when player is ready
 */
export async function setupSpotifyPlayer(accessToken) {
  if (!accessToken) {
    throw new Error('Access token is required to initialize Spotify player');
  }

  // Ensure the global callback is set up
  setupGlobalSpotifyCallback();

  // Create a promise that will be resolved when the SDK is ready
  if (!playerInitPromise) {
    playerInitPromise = new Promise(resolve => {
      // Store the resolver function
      playerInitResolver = resolve;
      
      // If SDK is already loaded, resolve immediately
      if (window.Spotify) {
        resolve();
      }
      // Otherwise wait for onSpotifyWebPlaybackSDKReady to be called
    });
  }

  // Wait for the SDK to be ready
  await playerInitPromise;
  
  // Create the player instance if it doesn't exist
  if (!player) {
    player = new Spotify.Player({
      name: 'Spotify 3D Visualizer',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.5
    });

    // Enhanced error handling
    setupPlayerEventListeners();

    // Connect to the player
    try {
      const connected = await Promise.race([
        player.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connect timeout')), 8000)
        )
      ]);
      
      if (!connected) {
        throw new Error('Failed to connect to Spotify Player');
      }
      
      console.log('Successfully connected to Spotify');
    } catch (error) {
      console.error('Failed to connect to Spotify:', error);
      throw error;
    }
  }

  return player;
}

/**
 * Set up event listeners for the player
 */
function setupPlayerEventListeners() {
  player.addListener('ready', ({ device_id }) => {
    console.log('Spotify Player ready with Device ID:', device_id);
    deviceId = device_id;
    
    // Store globally for other components
    window.spotifyDeviceId = device_id;
  });

  player.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline:', device_id);
    if (deviceId === device_id) {
      deviceId = null;
    }
  });

  player.addListener('initialization_error', ({ message }) => {
    console.error('Failed to initialize player:', message);
  });

  player.addListener('authentication_error', ({ message }) => {
    console.error('Failed to authenticate player:', message);
  });

  player.addListener('account_error', ({ message }) => {
    console.error('Failed to validate Spotify account:', message);
    if (message.toLowerCase().includes('premium')) {
      console.error('Premium account required for playback');
    }
  });

  player.addListener('playback_error', ({ message }) => {
    console.error('Failed to perform playback:', message);
  });
  
  // Set up state change listener that notifies all registered listeners
  player.addListener('player_state_changed', (state) => {
    // Notify all listeners
    for (const listener of stateListeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in player state listener:', error);
      }
    }
  });
}

/**
 * Add a state change listener
 * @param {Function} listener - Function to call when state changes
 * @returns {Function} - Function to remove the listener
 */
export function addStateChangeListener(listener) {
  if (typeof listener !== 'function') return () => {};
  
  stateListeners.push(listener);
  
  // Return function to remove this listener
  return () => {
    const index = stateListeners.indexOf(listener);
    if (index !== -1) {
      stateListeners.splice(index, 1);
    }
  };
}

/**
 * Get the player instance
 * @returns {Object} - Spotify Player instance
 */
export function getPlayer() {
  return player;
}

/**
 * Get the device ID for the player
 * @returns {string} - Device ID
 */
export function getDeviceId() {
  return deviceId;
}

/**
 * Play a specific track
 * @param {string} uri - Spotify track URI
 * @param {string} accessToken - Access token
 * @returns {Promise}
 */
export async function playTrack(uri, accessToken) {
  const currentDeviceId = deviceId || window.spotifyDeviceId;
  
  if (!currentDeviceId) {
    throw new Error('Player not initialized or device ID not available');
  }

  // Validate track URI
  if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) {
    throw new Error('Invalid Spotify track URI');
  }

  console.log(`Sending play request for track: ${uri} on device: ${currentDeviceId}`);

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${currentDeviceId}`, {
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to play track:', errorData);
      throw new Error(`Failed to play track: ${response.status} ${response.statusText}`);
    }

    console.log('Track play initiated successfully');
    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    throw error;
  }
}

/**
 * Toggle play/pause
 * @returns {Promise<boolean>} - True if playing, false if paused
 */
export async function togglePlayPause() {
  if (!player) {
    throw new Error('Player not initialized');
  }

  try {
    const state = await player.getCurrentState();
    const isPaused = !state || state.paused;
    
    if (isPaused) {
      await player.resume();
      return true;
    } else {
      await player.pause();
      return false;
    }
  } catch (error) {
    console.error('Error toggling playback:', error);
    throw error;
  }
}

/**
 * Skip to next track
 * @returns {Promise}
 */
export async function skipToNext() {
  if (!player) {
    throw new Error('Player not initialized');
  }
  
  try {
    await player.nextTrack();
    return true;
  } catch (error) {
    console.error('Error skipping to next track:', error);
    throw error;
  }
}

/**
 * Skip to previous track
 * @returns {Promise}
 */
export async function skipToPrevious() {
  if (!player) {
    throw new Error('Player not initialized');
  }
  
  try {
    await player.previousTrack();
    return true;
  } catch (error) {
    console.error('Error skipping to previous track:', error);
    throw error;
  }
}

/**
 * Get the current playback state
 * @returns {Promise<Object>} - Current playback state
 */
export async function getCurrentState() {
  if (!player) {
    throw new Error('Player not initialized');
  }
  
  try {
    return await player.getCurrentState();
  } catch (error) {
    console.error('Error getting current state:', error);
    throw error;
  }
}

/**
 * Check if the player is connected and ready
 * @returns {Promise<boolean>} - True if ready
 */
export async function isPlayerReady() {
  if (!player) return false;
  
  try {
    const state = await player.getCurrentState();
    return !!state;
  } catch (error) {
    return false;
  }
}