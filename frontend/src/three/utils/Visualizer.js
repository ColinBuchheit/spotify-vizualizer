// Visualizer.js
// Main entry point for the 3D audio visualizer

import * as THREE from 'three';
import { renderTrackInfo } from '../../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../../spotify/spotifyAPI.js';
import { createVolumeControl } from '../../ui/VolumeControl.js';
import '../../ui/volume-control.css';

// Import visualization modules
import { 
  createBarsVisualization, 
  removeBarsVisualization, 
  updateBarsVisualization 
} from '../visualizations/BarsVisualization.js';

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
  addVisualizationControls
} from './VisualizerUtils.js';

// Scene variables
let scene, camera, renderer;

// Visualization state
let visualizationMode = 'bars';
let bars = [];
let particles = [];
let waveform = null;

// Spotify and audio state
let player = null;
let accessTokenValue = null;
let currentTrackId = null;
let currentTrackAnalysis = null;
let currentAudioFeatures = null;

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
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 30;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  
  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(0, 10, 10);
  scene.add(light);

  // Create initial bars visualization
  bars = createBarsVisualization(scene);
}

/**
 * Change the visualization mode
 * @param {string} mode - Visualization mode ('bars', 'particles', or 'waveform')
 */
function changeVisualizationMode(mode) {
  visualizationMode = mode;
  
  // Clear existing visualizations
  clearVisualizations();
  
  // Create selected visualization
  if (mode === 'bars') {
    bars = createBarsVisualization(scene);
  } else if (mode === 'particles') {
    particles = createParticlesVisualization(scene);
  } else if (mode === 'waveform') {
    waveform = createWaveformVisualization(scene);
  }
}

/**
 * Clear all visualizations from the scene
 */
function clearVisualizations() {
  removeBarsVisualization(bars, scene);
  bars = [];
  
  removeParticlesVisualization(particles, scene);
  particles = [];
  
  removeWaveformVisualization(waveform, scene);
  waveform = null;
}

/**
 * Handle window resize events
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Set up the Spotify Web Playback SDK
 * @param {string} accessToken - Spotify access token
 */
async function setupSpotifyPlayer(accessToken) {
  await waitForSpotifySDK();

  player = new Spotify.Player({
    name: 'Web Visualizer Player',
    getOAuthToken: cb => cb(accessToken),
    volume: 0.4 // Start with lower volume
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => {
    console.error('Failed to initialize player:', message);
    // Only show error if it contains meaningful information
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
    showError('Spotify Premium is required for this feature.');
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
      
      renderTrackInfo(trackData);
      
      // Get audio features for better visualization
      await fetchTrackAnalysis(track.id, accessToken);
    }
  });
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
  let initialVolume = 0.4; // Default to 40%
  try {
    const savedVolume = localStorage.getItem('spotify_visualizer_volume');
    if (savedVolume !== null) {
      initialVolume = parseFloat(savedVolume);
      console.log('Loaded saved volume:', initialVolume);
    }
  } catch (e) {
    console.warn('Could not load saved volume:', e);
  }

  console.log('Setting up volume control with initial volume:', initialVolume);

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
      // Volume is already scaled in the VolumeControl component
      player.setVolume(volume);
      console.log(`Volume set to ${volume}`);
    } catch (error) {
      console.error('Error setting volume:', error);
      showError('Could not adjust volume. Please try again.');
    }
  }, initialVolume);
  
  // Add to document
  document.body.appendChild(volumeControl.element);
  
  // Add a volume tooltip/hint that fades away
  const volumeHint = document.createElement('div');
  volumeHint.className = 'volume-hint';
  volumeHint.textContent = 'Use slider to adjust volume';
  volumeHint.style.position = 'absolute';
  volumeHint.style.bottom = '70px';
  volumeHint.style.right = '20px';
  volumeHint.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  volumeHint.style.color = 'white';
  volumeHint.style.padding = '8px 12px';
  volumeHint.style.borderRadius = '4px';
  volumeHint.style.fontSize = '12px';
  volumeHint.style.opacity = '0.9';
  volumeHint.style.transition = 'opacity 0.5s ease';
  volumeHint.style.zIndex = '110';
  
  document.body.appendChild(volumeHint);
  
  // Fade out the hint after 5 seconds
  setTimeout(() => {
    volumeHint.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(volumeHint)) {
        document.body.removeChild(volumeHint);
      }
    }, 500);
  }, 5000);
}

/**
 * Fetch audio analysis and features from Spotify API
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 */
  async function fetchTrackAnalysis(trackId, accessToken) {
  try {
    try {
      // Get audio features (high-level data about the track)
      const features = await getAudioFeatures(trackId, accessToken);
      if (features) {
        currentAudioFeatures = features;
        energyValue = features.energy;
        currentTempo = features.tempo;
        console.log('Audio features:', features);
      }
    } catch (featuresError) {
      console.error('Error fetching audio features:', featuresError);
      // Continue with default values instead of showing an error
      energyValue = 0.5;
      currentTempo = 120;
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
      }
    } catch (analysisError) {
      console.error('Error fetching audio analysis:', analysisError);
      // Continue with empty arrays instead of showing an error
      segments = [];
      beats = [];
      tatums = [];
    }
  } catch (error) {
    console.error('Error in track analysis process:', error);
    // Only show error once instead of for each API call
    showError('Could not load audio analysis. Using default values for visualization.');
  }
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
  
  // Rotate the camera slightly for more dynamic effect - stop when paused
  const cameraSpeed = isPaused ? 0.01 : 0.1 * Math.min(1, energyValue);
  camera.position.x = Math.sin(animationTime * cameraSpeed) * 5;
  camera.position.y = Math.sin(animationTime * cameraSpeed * 0.5) * 2;
  camera.lookAt(0, 0, 0);

  // Update visualizations based on mode
  if (visualizationMode === 'bars') {
    updateBarsVisualization(
      bars, 
      powerLevel, 
      pulseTime, 
      isPaused, 
      animationTime, 
      currentAudioFeatures
    );
  } else if (visualizationMode === 'particles') {
    updateParticlesVisualization(
      particles, 
      powerLevel, 
      pulseTime, 
      isPaused, 
      animationTime, 
      currentAudioFeatures
    );
  } else if (visualizationMode === 'waveform') {
    updateWaveformVisualization(
      waveform, 
      powerLevel, 
      pulseTime, 
      isPaused, 
      animationTime, 
      currentAudioFeatures
    );
  }

  renderer.render(scene, camera);
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
