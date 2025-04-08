// frontend/src/three/Visualizer.js

import { renderTrackInfo } from '../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../spotify/spotifyAPI.js';
import { ImmersiveVisualizer } from './ImmersiveVisualizer.js';

let visualizer;
let accessTokenValue = null;
let currentTrackId = null;
let animationTime = 0;
let lastUpdateTime = 0;
let isPaused = false;
let player = null;

export async function initVisualizer(accessToken) {
  // Store access token for later use
  accessTokenValue = accessToken;
  
  try {
    // Create container
    const container = document.getElementById('app');
    
    // Initialize new visualizer
    visualizer = new ImmersiveVisualizer();
    visualizer.init(container);
    
    // Setup Spotify player
    await setupSpotifyPlayer(accessToken);
    
    // Handle window resizing
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
    
    // Set up polling for current track
    pollCurrentTrack();
    
    return true;
  } catch (error) {
    console.error('Error initializing visualizer:', error);
    throw error;
  }
}

async function setupSpotifyPlayer(accessToken) {
  await waitForSpotifySDK();

  player = new Spotify.Player({
    name: 'Web Visualizer Player',
    getOAuthToken: cb => cb(accessToken),
    volume: 0.8
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => {
    console.error('Failed to initialize player:', message);
    showError('Failed to initialize Spotify player. Please try again.');
  });
  
  player.addListener('authentication_error', ({ message }) => {
    console.error('Failed to authenticate:', message);
    showError('Authentication failed. Please reconnect your Spotify account.');
  });
  
  player.addListener('account_error', ({ message }) => {
    console.error('Account error:', message);
    showError('Spotify Premium is required for this feature.');
  });
  
  player.addListener('playback_error', ({ message }) => {
    console.error('Playback error:', message);
    // Try to recover automatically
    setTimeout(() => {
      player.getCurrentState().then(state => {
        if (state) {
          // Player is still functioning, just continue
          isPaused = state.paused;
        } else {
          // More serious error, try reconnecting
          player.disconnect().then(() => player.connect());
        }
      });
    }, 1000);
  });

  // Connect player
  player.connect();

  // Playback status listeners
  player.addListener('ready', async ({ device_id }) => {
    console.log('Player ready with device ID', device_id);
    
    try {
      // Get currently playing track
      const track = await getCurrentlyPlayingTrack(accessToken);
      
      if (track && track.item) {
        // Display track info
        renderTrackInfo(track);
        currentTrackId = track.item.id;
        isPaused = !track.is_playing;
        
        // Update visualizer with track info
        if (visualizer) {
          // Update album artwork
          const albumImage = track.item.album?.images?.[0]?.url;
          if (albumImage) {
            visualizer.updateAlbumCover(albumImage);
          }
        }
        
        // Transfer playback to this device
        await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            device_ids: [device_id], 
            play: true 
          })
        });
        
        // Get audio features and analysis for visualization
        await fetchTrackAnalysis(track.item.id, accessToken);
        
        // Update UI to show we're playing
        isPaused = false;
      } else {
        isPaused = true;
        showMessage('No track currently playing. Please start playing a track on Spotify.');
      }
    } catch (error) {
      console.error('Error setting up playback:', error);
      showError('Error setting up playback. Please try again.');
    }
  });

  // Track change listener
  player.addListener('player_state_changed', async (state) => {
    if (!state) {
      // No state means no active player - set to paused
      isPaused = true;
      return;
    }
    
    // Update pause state
    isPaused = state.paused;
    
    // If no track window or current track, something's wrong
    if (!state.track_window || !state.track_window.current_track) {
      return;
    }
    
    const track = state.track_window.current_track;
    
    // If track changed, update UI and get new audio features
    if (!currentTrackId || track.id !== currentTrackId) {
      currentTrackId = track.id;
      
      // Create track data in the format expected by renderTrackInfo
      const trackData = {
        item: {
          name: track.name,
          artists: [{ name: track.artists[0].name }],
          album: {
            name: track.album.name,
            images: track.album.images
          },
          id: track.id
        },
        is_playing: !isPaused
      };
      
      renderTrackInfo(trackData);
      
      // Update visualizer with new album art
      if (visualizer && track.album.images && track.album.images.length > 0) {
        visualizer.updateAlbumCover(track.album.images[0].url);
      }
      
      // Get audio features for better visualization
      await fetchTrackAnalysis(track.id, accessToken);
    }
  });
}

async function fetchTrackAnalysis(trackId, accessToken) {
  try {
    // Get audio features (high-level data about the track)
    const features = await getAudioFeatures(trackId, accessToken);
    
    // Get detailed audio analysis (beat/segment data)
    const analysis = await getAudioAnalysis(trackId, accessToken);
    
    // Extract what we need for visualization
    if (features && analysis) {
      // Process frequency data into visualizer-friendly format
      const audioData = processAudioAnalysis(features, analysis);
      
      if (visualizer) {
        // Update visualizer with processed audio data
        visualizer.updateAudioData(audioData);
      }
    }
    
    return { features, analysis };
  } catch (error) {
    console.error('Error fetching audio data:', error);
    return null;
  }
}

// Process Spotify audio analysis into a format the visualizer can use
function processAudioAnalysis(features, analysis) {
  if (!features || !analysis) return null;
  
  // Extract segments for frequency data simulation
  const segments = analysis.segments || [];
  const beats = analysis.beats || [];
  
  // Find current segment/beat based on playback position
  // Note: In a real implementation, you'd track the current playback position
  // This is simplified for demonstration purposes
  
  // Create simulated frequency data based on audio features
  const frequencies = new Uint8Array(64);
  
  // Use energy and spectral features to create frequency distribution
  const energyDistribution = {
    bass: features.energy * 0.8 + Math.random() * 0.2,
    mid: features.energy * 0.6 + Math.random() * 0.4,
    high: features.energy * 0.4 + Math.random() * 0.6
  };
  
  // Fill frequency bands with appropriate energy levels
  for (let i = 0; i < frequencies.length; i++) {
    let value;
    
    if (i < frequencies.length * 0.2) {
      // Bass frequencies (0-20%)
      value = energyDistribution.bass * 255;
    } else if (i < frequencies.length * 0.6) {
      // Mid frequencies (20-60%)
      value = energyDistribution.mid * 255;
    } else {
      // High frequencies (60-100%)
      value = energyDistribution.high * 255;
    }
    
    // Add some variation
    value *= 0.7 + Math.random() * 0.3;
    
    frequencies[i] = Math.min(255, Math.max(0, Math.floor(value)));
  }
  
  // Detect beats based on beat data
  const currentTime = performance.now() / 1000;
  const beatDetected = beats.some(beat => {
    // Simple detection logic
    return Math.random() < features.energy * 0.2; // Random beats based on energy
  });
  
  return {
    frequencies,
    beatDetected,
    energy: features.energy,
    valence: features.valence,
    tempo: features.tempo
  };
}

function onWindowResize() {
  if (visualizer) {
    visualizer.onWindowResize();
  }
}

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000; // Current time in seconds
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;
  
  // Update animation time
  animationTime += deltaTime;
  
  // Update visualizer (the actual visual updates happen inside the visualizer)
  // No need to pass audio data here as we update it when we receive new data
}

// Poll for the current track every 5 seconds to sync visualizations
function pollCurrentTrack() {
  const pollInterval = 5000; // 5 seconds
  
  setInterval(async () => {
    if (!accessTokenValue) return;
    
    try {
      const trackData = await getCurrentlyPlayingTrack(accessTokenValue);
      
      if (trackData) {
        // Update pause state
        isPaused = !trackData.is_playing;
        
        // If track changed, update info and get analysis
        if (trackData.item && trackData.item.id !== currentTrackId) {
          currentTrackId = trackData.item.id;
          renderTrackInfo(trackData);
          
          // Update visualizer with new album art
          if (visualizer && trackData.item.album?.images?.length > 0) {
            visualizer.updateAlbumCover(trackData.item.album.images[0].url);
          }
          
          // Get audio features for better visualization
          await fetchTrackAnalysis(trackData.item.id, accessTokenValue);
        }
      } else {
        // No track playing - set to paused
        isPaused = true;
      }
    } catch (error) {
      console.error('Error polling current track:', error);
    }
  }, pollInterval);
}

function waitForSpotifySDK() {
  return new Promise(resolve => {
    if (window.Spotify) {
      resolve();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve();
      };
    }
  });
}

function showError(message) {
  const errorOverlay = document.getElementById('error-overlay') || createErrorOverlay();
  const errorMessage = document.getElementById('error-message');
  errorMessage.textContent = message;
  errorOverlay.style.display = 'flex';
}

function showMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message-notification';
  messageEl.textContent = message;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    messageEl.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(messageEl)) {
        document.body.removeChild(messageEl);
      }
    }, 500);
  }, 5000);
}

function createErrorOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.innerHTML = `
    <div class="error-container">
      <h2>Error</h2>
      <p id="error-message"></p>
      <div class="error-buttons">
        <button id="error-close">Close</button>
        <button id="error-retry">Retry</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  document.getElementById('error-close').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  document.getElementById('error-retry').addEventListener('click', () => {
    window.location.reload();
  });
  
  return overlay;
}