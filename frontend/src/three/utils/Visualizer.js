// Visualizer.js
// Main entry point for the 3D audio visualizer

import * as THREE from 'three';
import { renderTrackInfo } from '../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../spotify/spotifyAPI.js';

// Import visualization modules
import { 
  createBarsVisualization, 
  removeBarsVisualization, 
  updateBarsVisualization 
} from './visualizations/BarsVisualization.js';

import { 
  createParticlesVisualization, 
  removeParticlesVisualization, 
  updateParticlesVisualization 
} from './visualizations/ParticlesVisualization.js';

import { 
  createWaveformVisualization, 
  removeWaveformVisualization, 
  updateWaveformVisualization 
} from './visualizations/WaveformVisualization.js';

// Import utility functions
import { 
  detectBeats, 
  getCurrentMusicPower, 
  createErrorOverlay, 
  showMessage, 
  showError, 
  waitForSpotifySDK,
  addVisualizationControls
} from './utils/VisualizerUtils.js';

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
  
  setupThreeScene();
  await setupSpotifyPlayer(accessToken);
  
  // Add UI for changing visualization modes
  addVisualizationControls(changeVisualizationMode);
  
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
    showError('Playback error. Please try again.');
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
 * Fetch audio analysis and features from Spotify API
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 */
async function fetchTrackAnalysis(trackId, accessToken) {
  try {
    // Get audio features (high-level data about the track)
    const features = await getAudioFeatures(trackId, accessToken);
    if (features) {
      currentAudioFeatures = features;
      energyValue = features.energy;
      currentTempo = features.tempo;
      console.log('Audio features:', features);
    }
    
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
  } catch (error) {
    console.error('Error fetching audio data:', error);
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
    }
  }, pollInterval);
}