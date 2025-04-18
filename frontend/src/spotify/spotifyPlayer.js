// src/spotify/spotifyPlayer.js
// Implements Spotify Web Playback SDK functionality

let player = null;
let deviceId = null;
let playerInitPromise = null;
let playerInitResolver = null;

/**
 * Initialize the Spotify Player SDK
 * This function is called when the SDK script is loaded
 * The onSpotifyWebPlaybackSDKReady function now needs to be defined globally in index.html
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

    // Connect player and set up event handlers
    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with Device ID:', device_id);
      deviceId = device_id;
    });

    player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline:', device_id);
      deviceId = null;
    });

    player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize player:', message);
    });

    player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate player:', message);
    });

    player.addListener('account_error', ({ message }) => {
      console.error('Failed to validate Spotify account:', message);
      alert('Premium required: This visualizer requires a Spotify Premium account');
    });

    player.addListener('playback_error', ({ message }) => {
      console.error('Failed to perform playback:', message);
    });

    // Connect to the player
    const connected = await player.connect();
    if (!connected) {
      throw new Error('Failed to connect to Spotify Player');
    }
  }

  return player;
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
 * @param {string} uri - Spotify track URI (e.g., 'spotify:track:xyz')
 * @param {string} accessToken - Access token
 * @returns {Promise}
 */
export async function playTrack(uri, accessToken) {
  if (!deviceId) {
    throw new Error('Player not initialized or device ID not available');
  }

  // Validate the track URI format
  if (!uri || typeof uri !== 'string' || !uri.startsWith('spotify:track:')) {
    console.warn('Invalid Spotify track URI:', uri);
    throw new Error('Invalid Spotify track URI');
  }

  // Wait briefly to ensure the device is ready after connecting
  await new Promise(resolve => setTimeout(resolve, 1500));

  console.log(`Sending play request for track: ${uri} on device: ${deviceId}`);

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
    const errorData = await response.json();
    console.error('Failed to play track:', errorData);
    throw new Error(`Failed to play track: ${response.status} ${response.statusText}`);
  }

  console.log('Track play initiated successfully');
}


/**
 * Toggle play/pause
 * @returns {Promise<boolean>} - True if playing, false if paused
 */
export async function togglePlayPause() {
  if (!player) {
    throw new Error('Player not initialized');
  }

  const isPaused = await player.getCurrentState().then(state => {
    return !state || state.paused;
  });

  if (isPaused) {
    await player.resume();
    return true;
  } else {
    await player.pause();
    return false;
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
  
  return player.nextTrack();
}

/**
 * Skip to previous track
 * @returns {Promise}
 */
export async function skipToPrevious() {
  if (!player) {
    throw new Error('Player not initialized');
  }
  
  return player.previousTrack();
}