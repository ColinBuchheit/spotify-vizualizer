// Visualizer.js
// Main controller for the 3D audio visualizer with enhanced visualization features and improved authentication

import * as THREE from 'three';
import { renderTrackInfo } from '../../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../../spotify/spotifyAPI.js';
import { createVolumeControl } from '../../ui/VolumeControl.js';
import { refreshAccessToken, handleAuthError } from '../../auth/handleAuth.js';
import '../../ui/volume-control.css';

// Import visualization modules - the enhanced bars is our primary visualization
import { 
  createBarsVisualization, 
  removeBarsVisualization, 
  updateBarsVisualization,
  setupPostprocessing,
  renderWithPostprocessing,
  config as barsConfig
} from '../visualizations/BarsVisualization.js';

// Import other visualizations
import {
  createParticlesVisualization,
  removeParticlesVisualization,
  updateParticlesVisualization
} from '../visualizations/ParticlesVisualization.js';

import {
  createWaveformVisualization,
  removeWaveformVisualization,
  updateWaveformVisualization
} from '../visualizations/WaveformVisualization.js';

// Import utility functions
import { 
  detectBeats, 
  getCurrentMusicPower, 
  createErrorOverlay, 
  showMessage, 
  showError, 
  waitForSpotifySDK,
  addVisualizationControls,
  isAuthError
} from './VisualizerUtils.js';

// Scene variables
let scene, camera, renderer;
let orbitControls;

// Visualization state
let visualizationMode = 'bars';
let bars = [];
let particles = [];
let waveform = null;

// Camera animation
let cameraTargetPosition = new THREE.Vector3(0, 0, 30);
let cameraCurrentPosition = new THREE.Vector3(0, 0, 30);

// Spotify and audio state
let player = null;
let accessTokenValue = null;
let currentTrackId = null;
let currentTrackAnalysis = null;
let currentAudioFeatures = null;
let currentTrackData = null;

// Animation state
let animationTime = 0;
let lastBeatTime = 0;
let beatDetected = false;
let beatIntensity = 0;
let lastUpdateTime = 0;
let pulseFactor = 0;
let pulseTime = 0;
let segmentIndex = 0;
let lastPowerLevel = 0.5;

// Audio data
let segments = [];
let tatums = [];
let beats = [];
let currentTempo = 120; // Default tempo
let energyValue = 0.5;  // Default energy
let isPaused = false;

/**
 * Initialize the visualizer
 * @param {string} accessToken - Spotify access token
 */
export async function initVisualizer(accessToken) {
  // Store access token for later use
  accessTokenValue = accessToken;
  
  // Show the app container to make sure it's visible
  const appContainer = document.getElementById('app');
  if (appContainer) {
    appContainer.style.display = 'block';
  }
  
  setupThreeScene();
  const playerInitialized = await setupSpotifyPlayer(accessToken);
  
  if (!playerInitialized) {
    // If player failed to initialize, try to refresh token
    const newToken = await refreshAccessToken();
    if (newToken) {
      accessTokenValue = newToken;
      await setupSpotifyPlayer(newToken);
    } else {
      throw new Error('Failed to initialize Spotify player. Authentication may have failed.');
    }
  }
  
  // Add UI for changing visualization modes
  addVisualizationControls(changeVisualizationMode);
  
  // Add volume control
  setupVolumeControl();
  
  // Handle window resizing
  window.addEventListener('resize', onWindowResize);
  
  // Set up optional orbit controls for camera
  setupOrbitControls();
  
  // Start animation loop
  animate();
  
  // Set up polling for current track
  pollCurrentTrack();
}

/**
 * Set up the Three.js scene
 */
function setupThreeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  // Setup camera with better positioning for the visualization
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 8, 30);
  camera.lookAt(0, 0, 0);

  // Create renderer with better settings
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit for performance
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  // Add better lighting
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);
  
  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(10, 20, 20);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);
  
  const backLight = new THREE.DirectionalLight(0x444444, 1);
  backLight.position.set(-10, 10, -10);
  scene.add(backLight);

  // Create initial visualization
  bars = createBarsVisualization(scene);
  
  // Setup postprocessing for better visuals
  setupPostprocessing(renderer, scene, camera);
}

/**
 * Set up volume control UI with persistent settings
 */
function setupVolumeControl() {
  if (!player) {
    console.warn('Player not initialized, cannot set up volume control');
    return;
  }

  // Try to load saved volume from localStorage
  let initialVolume = 0.5; // Default to 50%
  try {
    const savedVolume = localStorage.getItem('spotify_visualizer_volume');
    if (savedVolume !== null) {
      initialVolume = parseFloat(savedVolume);
    }
  } catch (e) {
    console.warn('Could not load saved volume:', e);
  }

  // Set initial volume on player
  const scaledInitialVolume = Math.pow(initialVolume, 2); // Apply logarithmic curve
  player.setVolume(scaledInitialVolume).then(() => {
    console.log('Initial volume set successfully:', scaledInitialVolume);
  }).catch(err => {
    console.warn('Could not set initial volume:', err);
  });

  // Create volume control component
  const volumeControl = createVolumeControl((volume) => {
    try {
      player.setVolume(volume);
    } catch (error) {
      console.error('Error setting volume:', error);
      showError('Could not adjust volume. Please try again.');
    }
  }, initialVolume);
  
  // Add to document
  document.body.appendChild(volumeControl.element);
}

/**
 * Fetch audio analysis and features from Spotify API with improved error handling
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 */
async function fetchTrackAnalysis(trackId, accessToken) {
  // Track if we got default values due to permission issues
  let permissionErrorOccurred = false;
  
  // Authentication status tracking
  let authErrorOccurred = false;
  let featuresSuccess = false;
  let analysisSuccess = false;
  
  // Maximum retry attempts
  const MAX_RETRIES = 1; // Reduced from 2 to 1 to minimize retries on 403 errors
  let retryCount = 0;
  
  const fetchWithRetry = async (fn, defaultValue) => {
    let lastError = null;
    
    for (let i = 0; i <= MAX_RETRIES; i++) {
      try {
        const result = await fn();
        // Check if this is a default fallback value (from a 403 error)
        if (result && 
            typeof result === 'object' && 
            result.energy === 0.5 && 
            result.tempo === 120) {
          console.log('Received default fallback values - likely a permission issue');
          permissionErrorOccurred = true;
        }
        return result;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1}/${MAX_RETRIES + 1} failed:`, error);
        
        // Check if this is an auth error (401 or 403)
        if (error.response) {
          if (error.response.status === 403) {
            permissionErrorOccurred = true;
            // For 403 Forbidden, just return default values immediately
            // This avoids excessive retries when permissions are the issue
            console.log('403 Forbidden error - returning default values');
            return defaultValue;
          } else if (error.response.status === 401) {
            authErrorOccurred = true;
            
            if (i === MAX_RETRIES) {
              // Last attempt failed with auth error, try to refresh
              const newToken = await refreshAccessToken();
              if (newToken) {
                accessToken = newToken;
                // One more attempt with new token
                try {
                  return await fn();
                } catch (finalError) {
                  console.error('Final attempt failed:', finalError);
                  return defaultValue;
                }
              }
            }
          }
        }
        
        // For non-auth errors or if we have more retries, wait and continue
        if (i < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } else {
          // Return default value after all retries failed
          return defaultValue;
        }
      }
    }
    
    return defaultValue;
  };
  
  // Get audio features (high-level data about the track)
  const features = await fetchWithRetry(
    () => getAudioFeatures(trackId, accessToken),
    // Default features if all retries fail
    {
      energy: 0.5,
      tempo: 120,
      valence: 0.5,
      danceability: 0.5,
      acousticness: 0.5,
      instrumentalness: 0.5,
      liveness: 0.5,
      speechiness: 0.5
    }
  );
  
  if (features) {
    currentAudioFeatures = features;
    energyValue = features.energy || 0.5;
    currentTempo = features.tempo || 120;
    console.log('Audio features:', features);
    
    // Adjust camera position based on audio energy and valence
    updateCameraForMood(features);
    featuresSuccess = true;
  } else {
    // Continue with default values instead of showing an error
    energyValue = 0.5;
    currentTempo = 120;
    
    // Generate fallback audio features for visualization
    currentAudioFeatures = {
      energy: energyValue,
      tempo: currentTempo,
      valence: 0.5,
      danceability: 0.5,
      acousticness: 0.5,
      instrumentalness: 0.5,
      liveness: 0.5,
      speechiness: 0.5
    };
  }
  
  // Get detailed audio analysis (beat/segment data)
  const analysis = await fetchWithRetry(
    () => getAudioAnalysis(trackId, accessToken),
    null
  );
  
  if (analysis) {
    currentTrackAnalysis = analysis;
    segments = analysis.segments || [];
    beats = analysis.beats || [];
    tatums = analysis.tatums || [];
    segmentIndex = 0;
    console.log('Audio analysis:', analysis);
    analysisSuccess = true;
  } else {
    // Generate basic beat patterns based on tempo as fallback
    console.log('Using synthetic beat data as fallback');
    generateSyntheticBeatData();
  }
  
  // Show appropriate message based on what happened
  if (permissionErrorOccurred) {
    showMessage('Using basic visualization - some audio features not available for this track.', 5000);
  } else if (authErrorOccurred && !featuresSuccess && !analysisSuccess) {
    const message = 'Limited visualization mode: Spotify visualization features require re-authentication. ' +
                   'Log out and log back in to enable full visualization.';
    showMessage(message, 10000); // Show for 10 seconds
    
    // Add a button to make re-auth easier (only if not already present)
    if (!document.getElementById('reauth-spotify-button')) {
      const reAuthButton = document.createElement('button');
      reAuthButton.id = 'reauth-spotify-button';
      reAuthButton.textContent = 'Re-authenticate with Spotify';
      reAuthButton.style.position = 'fixed';
      reAuthButton.style.top = '80px';
      reAuthButton.style.left = '50%';
      reAuthButton.style.transform = 'translateX(-50%)';
      reAuthButton.style.padding = '10px 20px';
      reAuthButton.style.backgroundColor = '#1db954';
      reAuthButton.style.color = 'white';
      reAuthButton.style.border = 'none';
      reAuthButton.style.borderRadius = '20px';
      reAuthButton.style.cursor = 'pointer';
      reAuthButton.style.zIndex = '1000';
      
      reAuthButton.onclick = () => {
        // Clear tokens and redirect to login
        clearTokens();
        redirectToLogin();
      };
      
      document.body.appendChild(reAuthButton);
      
      // Remove button after 30 seconds
      setTimeout(() => {
        if (document.body.contains(reAuthButton)) {
          document.body.removeChild(reAuthButton);
        }
      }, 30000);
    }
  }
}

/**
 * Generate synthetic beat data when audio analysis is not available
 */
function generateSyntheticBeatData() {
  const beatInterval = 60 / (currentTempo || 120);
  beats = [];
  segments = [];
  tatums = [];
  
  // Create simple synthetic beats at regular intervals
  for (let i = 0; i < 100; i++) {
    beats.push({
      start: i * beatInterval,
      duration: beatInterval,
      confidence: 0.8
    });
    
    // Create simple segments that align with beats
    segments.push({
      start: i * beatInterval,
      duration: beatInterval,
      loudness_max: Math.random() * 10 - 5,
      loudness_start: Math.random() * 10 - 15,
      pitches: Array(12).fill(0).map(() => Math.random()),
      timbre: Array(12).fill(0).map(() => Math.random() * 100)
    });
    
    // Create tatums (subdivisions of beats)
    tatums.push({
      start: i * beatInterval,
      duration: beatInterval,
      confidence: 0.7
    });
  }
}

/**
 * Update camera position based on track mood
 * @param {Object} features - Audio features
 */
function updateCameraForMood(features) {
  if (!features) return;
  
  // Only adjust camera if orbit controls aren't being used
  if (orbitControls && orbitControls.enabled) return;
  
  // Calculate target camera position based on audio features
  const energy = features.energy || 0.5;
  const valence = features.valence || 0.5;
  
  // Higher energy = closer to the visualization
  const zDistance = 40 - (energy * 20);
  
  // Valence (happiness) affects height - happier songs = higher view
  const height = 5 + (valence * 10);
  
  // Set new camera target position
  cameraTargetPosition.set(0, height, zDistance);
}

/**
 * Main animation loop
 */
function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000; // Current time in seconds
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;
  
  // Update animation time
  animationTime += deltaTime;
  
  // Update orbit controls if enabled
  if (orbitControls && orbitControls.enabled) {
    orbitControls.update();
  } else {
    // Smoothly move camera towards target position
    cameraCurrentPosition.lerp(cameraTargetPosition, 0.02);
    camera.position.copy(cameraCurrentPosition);
    camera.lookAt(0, 0, 0);
  }
  
  // Detect beats for visual effects
  const beatResult = detectBeats(
    animationTime, 
    beats, 
    lastBeatTime, 
    currentTempo, 
    energyValue, 
    isPaused
  );
  
  beatDetected = beatResult.beatDetected;
  beatIntensity = beatResult.beatIntensity;
  lastBeatTime = beatResult.lastBeatTime;
  
  // Update the pulse effect (smooth fade out after a beat)
  if (beatDetected && !isPaused) {
    pulseTime = 1.0 * beatIntensity;
  } else {
    pulseTime *= 0.95; // Fade out
  }
  
  // Get current music power level for visualization
  const powerLevel = getCurrentMusicPower(
    animationTime, 
    segments, 
    lastPowerLevel, 
    energyValue, 
    isPaused
  );
  
  // Update lastPowerLevel for next frame
  lastPowerLevel = powerLevel;

  // Update visualization based on current mode
  switch (visualizationMode) {
    case 'bars':
      updateBarsVisualization(
        bars, 
        powerLevel, 
        pulseTime, 
        isPaused, 
        animationTime, 
        currentAudioFeatures
      );
      break;
    case 'particles':
      updateParticlesVisualization(
        particles, 
        powerLevel, 
        pulseTime, 
        isPaused, 
        animationTime, 
        currentAudioFeatures
      );
      break;
    case 'waveform':
      updateWaveformVisualization(
        waveform, 
        powerLevel, 
        pulseTime, 
        isPaused, 
        animationTime, 
        currentAudioFeatures
      );
      break;
  }

  // Render with postprocessing if available, otherwise use standard render
  renderWithPostprocessing(renderer, scene, camera);
}

/**
 * Poll for the current track every 5 seconds to sync visualizations
 */
function pollCurrentTrack() {
  const pollInterval = 5000; // 5 seconds
  
  setInterval(async () => {
    if (!accessTokenValue || !player) return;
    
    try {
      const trackData = await getCurrentlyPlayingTrack(accessTokenValue);
      
      if (trackData) {
        // Update pause state
        isPaused = !trackData.is_playing;
        
        // Update current track data
        currentTrackData = trackData;
        
        // If track changed, update info and get analysis
        if (trackData.item && trackData.item.id !== currentTrackId) {
          currentTrackId = trackData.item.id;
          renderTrackInfo(trackData);
          await fetchTrackAnalysis(trackData.item.id, accessTokenValue);
        }
      } else {
        // No track playing - set to paused
        isPaused = true;
      }
    } catch (error) {
      console.error('Error polling current track:', error);
      
      // If this is an auth error, try to refresh the token
      if (isAuthError(error)) {
        console.log('Authentication error in polling, attempting to refresh token');
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Update the stored token value
          accessTokenValue = newToken;
        }
      }
      
      // Don't show error for polling failures to avoid spamming the user
    }
  }, pollInterval);
}

/**
 * Set up optional orbit controls for interactive camera movement
 */
function setupOrbitControls() {
  try {
    // Try to dynamically import OrbitControls
    import('three/examples/jsm/controls/OrbitControls.js').then(module => {
      const { OrbitControls } = module;
      orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.05;
      orbitControls.screenSpacePanning = false;
      orbitControls.minDistance = 10;
      orbitControls.maxDistance = 50;
      orbitControls.maxPolarAngle = Math.PI / 2;
      orbitControls.enabled = false; // Start with controls disabled
    }).catch(err => {
      console.warn('OrbitControls could not be loaded:', err);
    });
  } catch (error) {
    console.warn('OrbitControls import failed:', error);
  }
}

/**
 * Toggle orbit controls on/off
 */
export function toggleOrbitControls() {
  if (orbitControls) {
    orbitControls.enabled = !orbitControls.enabled;
    return orbitControls.enabled;
  }
  return false;
}

/**
 * Change the visualization mode
 * @param {string} mode - Visualization mode
 */
function changeVisualizationMode(mode) {
  visualizationMode = mode;
  
  // Clear existing visualizations
  clearVisualizations();
  
  // Create selected visualization
  switch (mode) {
    case 'bars':
      bars = createBarsVisualization(scene);
      break;
    case 'particles':
      particles = createParticlesVisualization(scene);
      break;
    case 'waveform':
      waveform = createWaveformVisualization(scene);
      break;
  }
}

/**
 * Clear all visualizations from the scene
 */
function clearVisualizations() {
  removeBarsVisualization(bars, scene);
  removeParticlesVisualization(particles, scene);
  removeWaveformVisualization(waveform, scene);
  
  bars = [];
  particles = [];
  waveform = null;
}

/**
 * Handle window resize events
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update composer size for postprocessing
  if (typeof setupPostprocessing === 'function') {
    setupPostprocessing(renderer, scene, camera);
  }
}

/**
 * Set up the Spotify Web Playback SDK with improved error handling
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object|null>} - Spotify player object or null if failed
 */
async function setupSpotifyPlayer(accessToken) {
  try {
    await waitForSpotifySDK();
    
    // Check token validity before proceeding
    try {
      const response = await fetch('http://localhost:8888/auth/validate_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      
      const data = await response.json();
      
      if (!data.valid) {
        console.error('Invalid access token, refreshing...');
        
        // Try to refresh token
        const refreshToken = localStorage.getItem('spotify_refresh_token');
        if (refreshToken) {
          const refreshResponse = await fetch('http://localhost:8888/auth/refresh_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
            accessTokenValue = accessToken; // Update global token
            
            // Update stored token
            localStorage.setItem('spotify_access_token', accessToken);
            localStorage.setItem('spotify_token_expiration', 
              (Date.now() + (parseInt(refreshData.expires_in) * 1000)).toString());
          } else {
            // Redirect to login if refresh fails
            window.location.href = 'http://localhost:8888/auth/login';
            return null;
          }
        } else {
          // No refresh token, redirect to login
          window.location.href = 'http://localhost:8888/auth/login';
          return null;
        }
      }
      
      // Check if user has Spotify Premium (required for Web Playback SDK)
      if (data.user && data.user.product !== 'premium') {
        showError('Spotify Premium is required for this visualizer.');
        return null;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      // Continue anyway - we'll catch any issues during player initialization
    }
  
    player = new Spotify.Player({
      name: 'Spotify 3D Visualizer',
      getOAuthToken: cb => cb(accessToken),
      volume: 0.5
    });
  
    // Error handling
    player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize player:', message);
      if (!message.includes('robustness') && !message.includes('404')) {
        showError('Failed to initialize Spotify player. Please try again.');
      }
    });
    
    player.addListener('authentication_error', ({ message }) => {
      console.error('Failed to authenticate:', message);
      showError('Authentication failed. Please reconnect your Spotify account.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = 'http://localhost:8888/auth/login';
      }, 3000);
    });
    
    player.addListener('account_error', ({ message }) => {
      console.error('Account error:', message);
      showError('Spotify Premium is required for this visualizer.');
    });
    
    player.addListener('playback_error', ({ message }) => {
      console.error('Playback error:', message);
      // Don't show error if it seems to be a common Spotify API error
      if (!message.includes('404') && !message.includes('403')) {
        showError('Playback error. Please try again or check your connection.');
      }
    });
  
    // Playback status listeners
    player.addListener('ready', async ({ device_id }) => {
      console.log('Player ready with device ID', device_id);
      
      try {
        // Get currently playing track
        const track = await getCurrentlyPlayingTrack(accessToken);
        
        if (track && track.item) {
          // Store current track data
          currentTrackData = track;
          
          // Display track info
          renderTrackInfo(track);
          currentTrackId = track.item.id;
          isPaused = !track.is_playing;
          
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
          
          // Show welcome message
          showMessage(`Now visualizing: ${track.item.name} by ${track.item.artists[0].name}`);
        } else {
          isPaused = true;
          showMessage('No track currently playing. Please start playing a track on Spotify.');
        }
      } catch (error) {
        console.error('Error setting up playback:', error);
        
        // Check if this is an auth error
        if (isAuthError(error)) {
          // Try to refresh the token
          const newToken = await refreshAccessToken();
          if (newToken) {
            accessTokenValue = newToken;
            showMessage('Token refreshed. Try playing music from your Spotify app.', 5000);
          } else {
            showError('Authentication error. Please reconnect your Spotify account.');
            setTimeout(() => {
              window.location.href = 'http://localhost:8888/auth/login';
            }, 3000);
          }
        } else {
          showError('Error setting up playback. Please try again or check your Spotify connection.');
        }
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
      
      // Update pulse factor based on play/pause state
      if (isPaused) {
        pulseFactor = 0; // No pulses when paused
      } else {
        pulseFactor = 1.0; // Normal pulses when playing
      }
      
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
              images: [{ url: track.album.images[0].url }]
            },
            id: track.id
          },
          is_playing: !isPaused
        };
        
        // Store current track data
        currentTrackData = trackData;
        
        renderTrackInfo(trackData);
        
        // Get audio features for better visualization
        await fetchTrackAnalysis(track.id, accessToken);
        
        // Show track change message
        showMessage(`Now playing: ${track.name} by ${track.artists[0].name}`);
      }
    });

    // Connect player and handle connection issues
    const connected = await player.connect().catch(error => {
      console.error('Player connection error:', error);
      showError('Failed to connect to Spotify. Please try again.');
      return false;
    });
    
    if (!connected) {
      console.error('Player failed to connect');
      return null;
    }

    return player;
  } catch (error) {
    console.error('Error setting up Spotify player:', error);
    
    // Check if this is an authentication error
    if (error.message && (
      error.message.includes('authentication') || 
      error.message.includes('token') || 
      error.message.includes('Authorization')
    )) {
      // Try to refresh the token
      const newToken = await refreshAccessToken();
      if (newToken) {
        // Retry with new token
        return setupSpotifyPlayer(newToken);
      } else {
        showError('Authentication failed. Please reconnect your Spotify account.');
        setTimeout(() => {
          window.location.href = 'http://localhost:8888/auth/login';
        }, 3000);
      }
    } else {
      showError('Failed to initialize Spotify player. Please try again.');
    }
    
    return null;
  }
}
