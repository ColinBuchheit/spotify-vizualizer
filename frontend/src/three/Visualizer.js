import * as THREE from 'three';
import { renderTrackInfo } from '../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures } from '../spotify/spotifyAPI.js';

let scene, camera, renderer;
let visualizationMode = 'bars';
let bars = [];
let particles = [];
let waveform = null;
let player = null;
let audioFeaturesTimer = null;
let currentTrackId = null;
let currentAudioFeatures = null;

// Visualization configuration
const config = {
  bars: {
    numBars: 64,
    spacing: 1,
    color: 0x1db954,
    maxHeight: 15
  },
  particles: {
    count: 1000,
    radius: 20,
    size: 0.2
  }
};

export async function initVisualizer(accessToken) {
  setupThreeScene();
  await setupSpotifyPlayer(accessToken);
  animate();
  
  // Add UI for changing visualization modes
  addVisualizationControls();
  
  // Handle window resizing
  window.addEventListener('resize', onWindowResize);
}

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
  createBarsVisualization();
}

function createBarsVisualization() {
  // Clear existing visualizations
  clearVisualizations();
  
  const { numBars, spacing, color } = config.bars;
  
  for (let i = 0; i < numBars; i++) {
    const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
    const material = new THREE.MeshStandardMaterial({ 
      color: color,
      metalness: 0.3,
      roughness: 0.7
    });
    const bar = new THREE.Mesh(geometry, material);
    bar.position.x = (i - numBars / 2) * spacing;
    bars.push(bar);
    scene.add(bar);
  }
}

function createParticleVisualization() {
  // Clear existing visualizations
  clearVisualizations();
  
  const { count, radius, size } = config.particles;
  
  // Create particle geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  
  for (let i = 0; i < count; i++) {
    // Random position in a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const r = Math.random() * radius;
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    
    // Green color with variation
    colors[i * 3] = 0.2 + Math.random() * 0.1;
    colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
    colors[i * 3 + 2] = 0.2 + Math.random() * 0.1;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: size,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });
  
  const particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
  particles.push(particleSystem);
}

function createWaveformVisualization() {
  // Clear existing visualizations
  clearVisualizations();
  
  const numPoints = 128;
  const width = 40;
  
  // Create points
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * width - width / 2;
    points.push(new THREE.Vector3(x, 0, 0));
  }
  
  // Create line
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: 0x1db954,
    linewidth: 2
  });
  
  waveform = new THREE.Line(geometry, material);
  scene.add(waveform);
}

function clearVisualizations() {
  // Remove bars
  bars.forEach(bar => {
    scene.remove(bar);
    bar.geometry.dispose();
    bar.material.dispose();
  });
  bars = [];
  
  // Remove particles
  particles.forEach(particleSystem => {
    scene.remove(particleSystem);
    particleSystem.geometry.dispose();
    particleSystem.material.dispose();
  });
  particles = [];
  
  // Remove waveform
  if (waveform) {
    scene.remove(waveform);
    waveform.geometry.dispose();
    waveform.material.dispose();
    waveform = null;
  }
}

function addVisualizationControls() {
  const controls = document.createElement('div');
  controls.id = 'visualization-controls';
  controls.innerHTML = `
    <div class="viz-buttons">
      <button class="viz-button active" data-mode="bars">Bars</button>
      <button class="viz-button" data-mode="particles">Particles</button>
      <button class="viz-button" data-mode="waveform">Waveform</button>
    </div>
  `;
  
  document.body.appendChild(controls);
  
  // Add event listeners
  document.querySelectorAll('.viz-button').forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.viz-button').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      // Change visualization mode
      visualizationMode = button.dataset.mode;
      
      // Create selected visualization
      if (visualizationMode === 'bars') {
        createBarsVisualization();
      } else if (visualizationMode === 'particles') {
        createParticleVisualization();
      } else if (visualizationMode === 'waveform') {
        createWaveformVisualization();
      }
    });
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
        
        // Get audio features for better visualization
        fetchAudioFeatures(track.item.id, accessToken);
      } else {
        showMessage('No track currently playing. Please start playing a track on Spotify.');
      }
    } catch (error) {
      console.error('Error setting up playback:', error);
      showError('Error setting up playback. Please try again.');
    }
  });

  // Track change listener
  player.addListener('player_state_changed', async (state) => {
    if (!state || !state.track_window || !state.track_window.current_track) {
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
            images: [{ url: track.album.images[0].url }]
          },
          id: track.id
        }
      };
      
      renderTrackInfo(trackData);
      
      // Get audio features for better visualization
      fetchAudioFeatures(track.id, accessToken);
    }
  });
}

async function fetchAudioFeatures(trackId, accessToken) {
  try {
    const features = await getAudioFeatures(trackId, accessToken);
    if (features) {
      currentAudioFeatures = features;
      console.log('Audio features:', features);
    }
  } catch (error) {
    console.error('Error fetching audio features:', error);
  }
  
  // Set timer to periodically update audio features (every 30 seconds)
  if (audioFeaturesTimer) {
    clearTimeout(audioFeaturesTimer);
  }
  
  audioFeaturesTimer = setTimeout(() => {
    fetchAudioFeatures(trackId, accessToken);
  }, 30000);
}

function animate() {
  requestAnimationFrame(animate);

  // Rotate the camera slightly for more dynamic effect
  camera.position.x = Math.sin(Date.now() * 0.0002) * 5;
  camera.position.y = Math.sin(Date.now() * 0.0001) * 2;
  camera.lookAt(0, 0, 0);

  // Update visualizations based on mode
  if (visualizationMode === 'bars') {
    updateBarsVisualization();
  } else if (visualizationMode === 'particles') {
    updateParticlesVisualization();
  } else if (visualizationMode === 'waveform') {
    updateWaveformVisualization();
  }

  renderer.render(scene, camera);
}

function updateBarsVisualization() {
  if (bars.length === 0) return;
  
  // Use audio features to influence visualization
  const energy = currentAudioFeatures ? currentAudioFeatures.energy : 0.5;
  const danceability = currentAudioFeatures ? currentAudioFeatures.danceability : 0.5;
  
  bars.forEach((bar, i) => {
    // Create a wave-like pattern
    const time = Date.now() * 0.001;
    const pulse = Math.sin(time * 2 + i * 0.1) * 0.5 + 0.5;
    
    // Combine pulse with audio features
    const scale = pulse * energy * config.bars.maxHeight;
    bar.scale.y = Math.max(scale, 0.1);
    bar.position.y = bar.scale.y / 2;
    
    // Color based on position and danceability
    const hue = (i / bars.length) * 0.3 + 0.3 + (danceability * 0.2);
    bar.material.color.setHSL(hue, 0.8, 0.5);
    
    // Add some rotation based on position
    bar.rotation.y = time * 0.5 + i * 0.05;
  });
}

function updateParticlesVisualization() {
  if (particles.length === 0) return;
  
  const particleSystem = particles[0];
  const positions = particleSystem.geometry.attributes.position.array;
  const colors = particleSystem.geometry.attributes.color.array;
  
  // Use audio features to influence visualization
  const energy = currentAudioFeatures ? currentAudioFeatures.energy : 0.5;
  const valence = currentAudioFeatures ? currentAudioFeatures.valence : 0.5;
  
  // Time-based animation
  const time = Date.now() * 0.001;
  
  for (let i = 0; i < positions.length / 3; i++) {
    // Get current position
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    
    // Calculate distance from center
    const distance = Math.sqrt(x * x + y * y + z * z);
    
    // Create pulsating movement
    const scalar = Math.sin(time + distance) * 0.2 * energy + 1;
    
    positions[i * 3] = x * scalar;
    positions[i * 3 + 1] = y * scalar;
    positions[i * 3 + 2] = z * scalar;
    
    // Update colors based on valence (happiness level)
    colors[i * 3] = 0.2 + (1 - valence) * 0.8; // Red (increases with lower valence)
    colors[i * 3 + 1] = 0.5 + valence * 0.5;   // Green (increases with higher valence)
    colors[i * 3 + 2] = 0.5 + energy * 0.5;    // Blue (increases with energy)
  }
  
  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.geometry.attributes.color.needsUpdate = true;
  
  // Rotate the entire system
  particleSystem.rotation.y = time * 0.1;
  particleSystem.rotation.z = time * 0.05;
}

function updateWaveformVisualization() {
  if (!waveform) return;
  
  const positions = waveform.geometry.attributes.position.array;
  const count = positions.length / 3;
  
  // Use audio features to influence visualization
  const energy = currentAudioFeatures ? currentAudioFeatures.energy : 0.5;
  const tempo = currentAudioFeatures ? currentAudioFeatures.tempo / 200 : 0.6; // Normalize tempo
  
  // Time-based animation
  const time = Date.now() * 0.001;
  
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    
    // Create wave pattern based on position, time, and audio features
    const wave1 = Math.sin(time * tempo + x * 0.3) * 3 * energy;
    const wave2 = Math.sin(time * 0.7 + x * 0.5) * 1.5;
    
    positions[i * 3 + 1] = wave1 + wave2;
  }
  
  waveform.geometry.attributes.position.needsUpdate = true;
  
  // Update color based on time
  const hue = (Math.sin(time * 0.1) * 0.1 + 0.4) % 1; // Keep in green-blue range
  waveform.material.color.setHSL(hue, 0.8, 0.5);
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
      document.body.removeChild(messageEl);
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
      <button id="error-close">Close</button>
      <button id="error-retry">Retry</button>
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