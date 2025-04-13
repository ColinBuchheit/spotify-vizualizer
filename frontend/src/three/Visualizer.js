import * as THREE from 'three';
import { renderTrackInfo } from '../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../spotify/spotifyAPI.js';

let scene, camera, renderer;
let visualizationMode = 'bars';
let bars = [];
let particles = [];
let waveform = null;
let player = null;
let accessTokenValue = null;
let currentTrackId = null;
let currentTrackAnalysis = null;
let currentAudioFeatures = null;
let animationTime = 0;
let lastBeatTime = 0;
let beatDetected = false;
let beatIntensity = 0;
let lastUpdateTime = 0;
let pulseFactor = 0;
let pulseTime = 0;
let segmentIndex = 0;
let segments = [];
let tatums = [];
let beats = [];
let currentTempo = 120; // Default tempo
let energyValue = 0.5;  // Default energy
let lastPowerLevel = 0.5;
let isPaused = false;

// Visualization configuration
const config = {
  bars: {
    numBars: 64,
    spacing: 1,
    color: 0x1db954,
    maxHeight: 15
  },
  particles: {
    count: 2000,
    radius: 20,
    size: 0.2,
    speed: 0.3  // Reduced speed factor
  }
};

export async function initVisualizer(accessToken) {
  // Store access token for later use
  accessTokenValue = accessToken;
  
  setupThreeScene();
  await setupSpotifyPlayer(accessToken);
  
  // Add UI for changing visualization modes
  addVisualizationControls();
  
  // Handle window resizing
  window.addEventListener('resize', onWindowResize);
  
  // Start animation loop
  animate();
  
  // Set up polling for current track
  pollCurrentTrack();
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
  
  const { numBars, spacing } = config.bars;
  
  for (let i = 0; i < numBars; i++) {
    const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
    const material = new THREE.MeshPhongMaterial({ 
      color: config.bars.color,
      specular: 0x666666,
      shininess: 30,
      emissive: 0x222222
    });
    const bar = new THREE.Mesh(geometry, material);
    bar.position.x = (i - numBars / 2) * spacing;
    // Start with minimum height
    bar.scale.y = 0.1;
    bar.position.y = bar.scale.y / 2;
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
  const sizes = new Float32Array(count);
  
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
    
    // Random sizes
    sizes[i] = Math.random() * 2 + 0.5;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.PointsMaterial({
    size: size,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const particleSystem = new THREE.Points(geometry, material);
  scene.add(particleSystem);
  particles.push(particleSystem);
}

function createWaveformVisualization() {
  // Clear existing visualizations
  clearVisualizations();
  
  const numPoints = 256;
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
  
  // Add a second "shadow" line for effect
  const shadowMaterial = new THREE.LineBasicMaterial({ 
    color: 0x1db954,
    linewidth: 1,
    opacity: 0.3,
    transparent: true
  });
  
  const shadowGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const shadowLine = new THREE.Line(shadowGeometry, shadowMaterial);
  shadowLine.position.z = -0.5;
  scene.add(shadowLine);
  
  waveform.userData = {
    shadowLine: shadowLine
  };
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
    if (waveform.userData && waveform.userData.shadowLine) {
      scene.remove(waveform.userData.shadowLine);
      waveform.userData.shadowLine.geometry.dispose();
      waveform.userData.shadowLine.material.dispose();
    }
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

function detectBeats(time) {
  // If paused, don't detect beats
  if (isPaused) {
    beatDetected = false;
    beatIntensity = 0;
    return false;
  }
  
  // Use actual beat data from Spotify analysis if available
  if (beats && beats.length > 0) {
    // Convert seconds to milliseconds for comparison
    const currentTimeMs = time * 1000;
    
    // Look for beats within a small window of the current time
    for (let i = 0; i < beats.length; i++) {
      const beat = beats[i];
      // Convert beat time to milliseconds and add offset
      const beatStart = beat.start * 1000;
      const beatDuration = beat.duration * 1000;
      
      if (Math.abs(currentTimeMs - beatStart) < 100) { // 100ms window
        // Beat detected!
        const confidence = beat.confidence || 0.5;
        
        // Only count as beat if confidence is high enough
        if (confidence > 0.5) {
          beatDetected = true;
          beatIntensity = confidence;
          lastBeatTime = time;
          return true;
        }
      }
    }
  }
  
  // If we don't have beats data or no beat was found, use a timer based on tempo
  const tempoInterval = 60 / currentTempo; // Beat interval in seconds
  
  if (time - lastBeatTime > tempoInterval && energyValue > 0.3) {
    lastBeatTime = time;
    beatDetected = true;
    beatIntensity = energyValue;
    return true;
  }
  
  // Reset beat detection
  if (time - lastBeatTime > 0.1) {
    beatDetected = false;
  }
  
  return false;
}

function getCurrentMusicPower(time) {
  // If paused, return a very low power level
  if (isPaused) {
    return 0.1; // Just enough to see something, but minimal movement
  }
  
  // Use audio analysis segments to get loudness data
  if (segments && segments.length > 0) {
    // Find current segment
    const segmentTimeMs = time * 1000;
    let foundSegment = null;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const segmentStart = segment.start * 1000;
      const segmentEnd = segmentStart + (segment.duration * 1000);
      
      if (segmentTimeMs >= segmentStart && segmentTimeMs < segmentEnd) {
        foundSegment = segment;
        break;
      }
    }
    
    if (foundSegment) {
      // Loudness is in negative dB, so convert to 0-1 range
      // Typical range is -60 (quiet) to 0 (loud)
      const loudness = foundSegment.loudness_max || foundSegment.loudness_start || -20;
      const normalizedLoudness = Math.min(1, Math.max(0, (loudness + 60) / 60));
      
      // Smooth the loudness changes
      lastPowerLevel = lastPowerLevel * 0.7 + normalizedLoudness * 0.3;
      return lastPowerLevel;
    }
  }
  
  // Fallback: use energy value with pulsing effect
  if (isPaused) {
    return 0.1; // Minimal movement when paused
  }
  
  const pulsing = Math.sin(time * 4) * 0.2 + 0.8;
  return energyValue * pulsing;
}

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000; // Current time in seconds
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;
  
  // Update animation time
  animationTime += deltaTime;
  
  // Detect beats for visual effects
  detectBeats(animationTime);
  
  // Update the pulse effect (smooth fade out after a beat)
  if (beatDetected && !isPaused) {
    pulseTime = 1.0 * beatIntensity;
  } else {
    pulseTime *= 0.95; // Fade out
  }
  
  // Get current music power level for visualization
  const powerLevel = getCurrentMusicPower(animationTime);
  
  // Rotate the camera slightly for more dynamic effect - stop when paused
  const cameraSpeed = isPaused ? 0.01 : 0.1 * Math.min(1, energyValue);
  camera.position.x = Math.sin(animationTime * cameraSpeed) * 5;
  camera.position.y = Math.sin(animationTime * cameraSpeed * 0.5) * 2;
  camera.lookAt(0, 0, 0);

  // Update visualizations based on mode
  if (visualizationMode === 'bars') {
    updateBarsVisualization(powerLevel, pulseTime);
  } else if (visualizationMode === 'particles') {
    updateParticlesVisualization(powerLevel, pulseTime);
  } else if (visualizationMode === 'waveform') {
    updateWaveformVisualization(powerLevel, pulseTime);
  }

  renderer.render(scene, camera);
}

function updateBarsVisualization(powerLevel, pulseTime) {
  if (bars.length === 0) return;
  
  // Use audio features to influence visualization
  const energy = currentAudioFeatures ? currentAudioFeatures.energy : 0.5;
  const valence = currentAudioFeatures ? currentAudioFeatures.valence : 0.5; // happiness
  const danceability = currentAudioFeatures ? currentAudioFeatures.danceability : 0.5;
  
  // Beat pulse modifier
  const beatPulse = isPaused ? 1 : 1 + pulseTime;
  
  // Create frequency distribution simulation (since we don't have real-time frequency data)
  const frequencyDistribution = [];
  for (let i = 0; i < bars.length; i++) {
    // Base height uses a quadratic distribution to simulate frequency response
    // Lower frequencies (left) and higher frequencies (right) have more energy
    let height;
    
    if (isPaused) {
      // When paused, just show a very minimal equalized bar pattern
      height = 0.5 + Math.sin(i / bars.length * Math.PI) * 0.4;
    } else {
      height = Math.pow(Math.sin(i / bars.length * Math.PI), 2);
      
      // Add random noise that changes over time
      height += 0.3 * Math.sin(animationTime * 2 + i * 0.2) * energy;
      
      // Add harmonic patterns based on music characteristics
      if (danceability > 0.6) {
        // More rhythmic patterns for danceable tracks
        height += 0.4 * Math.sin(animationTime * currentTempo/60 * 2 + i * 0.1) * danceability;
      }
      
      // Scale by current music power and beat pulse
      height *= powerLevel * config.bars.maxHeight * beatPulse;
    }
    
    // Ensure minimum height but keep it low when paused
    height = Math.max(height, isPaused ? 0.1 : 0.5);
    
    frequencyDistribution.push(height);
  }
  
  // Update bars
  bars.forEach((bar, i) => {
    // Height based on simulated frequency
    const targetHeight = frequencyDistribution[i];
    
    // Smoothly animate towards target height
    bar.scale.y = bar.scale.y * 0.9 + targetHeight * 0.1;
    bar.position.y = bar.scale.y / 2;
    
    // Color based on position, valence (happiness) and energy
    const hue = (i / bars.length) * 0.3 + 0.3 + ((valence - 0.5) * 0.2);
    const saturation = isPaused ? 0.5 : 0.8 + energy * 0.2;
    const lightness = isPaused ? 0.3 : 0.4 + pulseTime * 0.2;
    bar.material.color.setHSL(hue, saturation, lightness);
    
    // Emissive color for glow effect during beats
    const emissiveIntensity = isPaused ? 0 : Math.min(0.3, pulseTime * 0.3);
    bar.material.emissive.setHSL(hue, saturation, emissiveIntensity);
    
    // Add some rotation based on position and danceability - minimal when paused
    const rotationSpeed = isPaused ? 0.01 : 0.2 + danceability * 0.5;
    bar.rotation.y = animationTime * rotationSpeed + i * 0.05;
  });
}

function updateParticlesVisualization(powerLevel, pulseTime) {
  if (particles.length === 0) return;
  
  const particleSystem = particles[0];
  const positions = particleSystem.geometry.attributes.position.array;
  const colors = particleSystem.geometry.attributes.color.array;
  const sizes = particleSystem.geometry.attributes.size.array;
  
  // Use audio features to influence visualization
  const energy = currentAudioFeatures ? currentAudioFeatures.energy : 0.5;
  const valence = currentAudioFeatures ? currentAudioFeatures.valence : 0.5; // happiness
  
  // Beat pulse modifier - minimal when paused
  const beatPulse = isPaused ? 1 : 1 + pulseTime * 2;
  
  // Time-based animation - much slower when paused
  const time = animationTime;
  const motionSpeed = isPaused ? 0.05 : config.particles.speed;
  
  // Calculate the base radius with pulsing
  let baseRadius;
  if (isPaused) {
    baseRadius = config.particles.radius * 0.8; // Fixed size when paused
  } else {
    baseRadius = config.particles.radius * (0.8 + 0.2 * powerLevel * beatPulse);
  }
  
  for (let i = 0; i < positions.length / 3; i++) {
    // Get original position (normalized direction)
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx + 1];
    const z = positions[idx + 2];
    
    // Calculate distance from center
    const distance = Math.sqrt(x * x + y * y + z * z);
    if (distance === 0) continue; // Skip particles at exact center
    
    // Normalize direction
    const nx = x / distance;
    const ny = y / distance;
    const nz = z / distance;
    
    // Create pulsating movement based on music power and beats
    let scalar = baseRadius;
    
    // Add wave patterns based on audio features - minimized when paused
    if (!isPaused) {
      const wave = Math.sin(time * motionSpeed * 2 + distance * 3) * 0.3 * energy;
      scalar += wave * baseRadius;
    }
    
    // Apply position
    positions[idx] = nx * scalar;
    positions[idx + 1] = ny * scalar;
    positions[idx + 2] = nz * scalar;
    
    // Update sizes based on beats and energy - smaller when paused
    sizes[i] = isPaused ?
      config.particles.size * 0.7 :
      (0.5 + energy * 0.5) * (1 + pulseTime * 0.5) * config.particles.size * (1 + Math.random() * 0.2);
    
    // Update colors based on valence (happiness level) and beats
    let hue;
    if (isPaused) {
      // More consistent coloring when paused
      hue = (valence * 0.4 + 0.3) % 1;
    } else {
      hue = (valence * 0.6 + 0.2 + Math.sin(time * 0.1 + i * 0.001) * 0.1) % 1;
    }
    
    const saturation = isPaused ? 0.6 : 0.7 + energy * 0.3;
    const lightness = isPaused ? 0.4 : 0.5 + pulseTime * 0.2;
    
    // Convert HSL to RGB
    const color = new THREE.Color();
    color.setHSL(hue, saturation, lightness);
    
    colors[idx] = color.r;
    colors[idx + 1] = color.g;
    colors[idx + 2] = color.b;
  }
  
  particleSystem.geometry.attributes.position.needsUpdate = true;
  particleSystem.geometry.attributes.color.needsUpdate = true;
  particleSystem.geometry.attributes.size.needsUpdate = true;
  
  // Rotate the entire system - very slow when paused
  const rotationSpeed = isPaused ? 0.01 : motionSpeed;
  particleSystem.rotation.y = time * rotationSpeed;
  particleSystem.rotation.z = time * rotationSpeed * 0.5;
}

function updateWaveformVisualization(powerLevel, pulseTime) {
  if (!waveform) return;
  
  const positions = waveform.geometry.attributes.position.array;
  const count = positions.length / 3;
  
  // Get shadow line if available
  const shadowLine = waveform.userData.shadowLine;
  let shadowPositions = null;
  if (shadowLine) {
    shadowPositions = shadowLine.geometry.attributes.position.array;
  }
  
  // Use audio features to influence visualization
  const energy = currentAudioFeatures ? currentAudioFeatures.energy : 0.5;
  const tempo = currentAudioFeatures ? currentAudioFeatures.tempo / 200 : 0.6; // Normalize tempo
  
  // Time-based animation - slower when paused
  const time = animationTime;
  const motionSpeed = isPaused ? 0.1 : 1.0;
  
  // Beat pulse modifier - minimal when paused
  const beatPulse = isPaused ? 1 : 1 + pulseTime * 2;
  
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    
    // Create wave pattern based on position, time, and audio features
    const phase = (x + 20) / 40; // 0-1 range
    
    let height;
    if (isPaused) {
      // Simple gentle wave when paused
      height = Math.sin(phase * Math.PI * 8) * 0.8;
    } else {
      // Multiple wave frequencies based on audio features
      const wave1 = Math.sin(time * tempo * motionSpeed * 2 + phase * Math.PI * 8) * 3 * energy;
      const wave2 = Math.sin(time * 0.7 * motionSpeed + phase * Math.PI * 2) * 1.5;
      const wave3 = Math.sin(time * 1.5 * motionSpeed + phase * Math.PI * 16) * energy * 1.2;
      
      // Combine waves and apply power level and beat pulse
      height = (wave1 + wave2 + wave3) * powerLevel * beatPulse;
    }
    
    // Apply height to main wave
    positions[i * 3 + 1] = height;
    
    // Apply to shadow with offset
    if (shadowPositions) {
      shadowPositions[i * 3 + 1] = height * 0.7; // Reduced height for shadow
    }
  }
  
  waveform.geometry.attributes.position.needsUpdate = true;
  
  // Update shadow line if available
  if (shadowLine) {
    shadowLine.geometry.attributes.position.needsUpdate = true;
  }
  
  // Update color based on time and energy
  let hue;
  if (isPaused) {
    // More subdued coloring when paused
    hue = 0.4; // Fixed green-blue
  } else {
    hue = (Math.sin(time * 0.1) * 0.1 + 0.4) % 1; // Keep in green-blue range
  }
  
  waveform.material.color.setHSL(hue, isPaused ? 0.6 : 0.8, isPaused ? 0.4 : 0.5 + pulseTime * 0.2);
  
  if (shadowLine) {
    shadowLine.material.color.setHSL(hue, 0.7, isPaused ? 0.2 : 0.3);
    shadowLine.material.opacity = isPaused ? 0.1 : 0.2 + pulseTime * 0.1;
  }
}

// Poll for the current track every 5 seconds to sync visualizations
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