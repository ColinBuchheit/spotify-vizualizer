// Visualizer.js
// Main controller for the 3D audio visualizer with enhanced visualization features

import * as THREE from 'three';
import { renderTrackInfo } from '../../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../../spotify/spotifyAPI.js';
import { createVolumeControl } from '../../ui/VolumeControl.js';
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

// Import utility functions
import { 
  detectBeats, 
  getCurrentMusicPower, 
  createErrorOverlay, 
  showMessage, 
  showError, 
  waitForSpotifySDK,
  addVisualizationControls
} from './VisualizerUtils.js';

// Scene variables
let scene, camera, renderer;
let orbitControls;

// Visualization state
let visualizationMode = 'bars';
let bars = [];

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
  await setupSpotifyPlayer(accessToken);
  
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
 * Fetch audio analysis and features from Spotify API
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 */
async function fetchTrackAnalysis(trackId, accessToken) {
  // Authentication status tracking
  let authErrorOccurred = false;
  let featuresSuccess = false;
  let analysisSuccess = false;
  
  try {
    try {
      // Get audio features (high-level data about the track)
      const features = await getAudioFeatures(trackId, accessToken);
      if (features) {
        currentAudioFeatures = features;
        energyValue = features.energy;
        currentTempo = features.tempo;
        console.log('Audio features:', features);
        
        // Adjust camera position based on audio energy and valence
        updateCameraForMood(features);
        featuresSuccess = true;
      }
    } catch (featuresError) {
      console.error('Error fetching audio features:', featuresError);
      // Check if this is an auth error (403)
      if (featuresError.response && featuresError.response.status === 403) {
        authErrorOccurred = true;
      }
      
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
    
    try {
      // Get detailed audio analysis (beat/segment data)
      const analysis = await getAudioAnalysis(trackId, accessToken);
      if (analysis) {
        currentTrackAnalysis = analysis;
        segments = analysis.segments || [];
        beats = analysis.beats || [];
        tatums = analysis.tatums || [];
        segmentIndex = 0;
        console.log('Audio analysis:', analysis);
        analysisSuccess = true;
      }
    } catch (analysisError) {
      console.error('Error fetching audio analysis:', analysisError);
      
      // Check if this is an auth error (403)
      if (analysisError.response && analysisError.response.status === 403) {
        authErrorOccurred = true;
      }
      
      // Generate basic beat patterns based on tempo as fallback
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
    
    // Show re-authentication prompt if both API calls failed with auth errors
    if (authErrorOccurred && !featuresSuccess && !analysisSuccess) {
      const message = 'Limited visualization mode: Spotify visualization features require re-authentication. ' +
                     'Log out and log back in to enable full visualization.';
      showMessage(message, 10000); // Show for 10 seconds
    }
    
  } catch (error) {
    console.error('Error in track analysis process:', error);
    // Continue with default values without showing an error to the user
    console.log('Using default visualization values');
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

  // Update visualization
  updateBarsVisualization(
    bars, 
    powerLevel, 
    pulseTime, 
    isPaused, 
    animationTime, 
    currentAudioFeatures
  );

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
  if (mode === 'bars') {
    bars = createBarsVisualization(scene);
  }
}

/**
 * Clear all visualizations from the scene
 */
function clearVisualizations() {
  removeBarsVisualization(bars, scene);
  bars = [];
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
 * Set up the Spotify Web Playback SDK
 * @param {string} accessToken - Spotify access token
 */
async function setupSpotifyPlayer(accessToken) {
  await waitForSpotifySDK();

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

  // Connect player
  player.connect();

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
      showError('Error setting up playback. Please try again or check your Spotify connection.');
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
}
