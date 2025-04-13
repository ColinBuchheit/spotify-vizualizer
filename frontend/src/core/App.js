import * as THREE from 'three';
import { createAudioManager } from './AudioManager.js';
import { createControls } from './Controls.js';
import { createEnvironment } from './environment.js';
import { createVisualizer } from './Visualizer.js';
import { getPlayer } from '../spotify/playback.js';

let scene, camera, renderer, controls, visualizer, audioManager, environment;
let lastTime = 0;
let stats;

// Settings applied from settings panel
let appSettings = {
  quality: 'high',
  colorScheme: 'default',
  showFps: false,
  motionIntensity: 0.5,
  autoRotate: true,
  bassBoost: false,
  showLabels: true
};

export function initScene() {
  // Create a new scene
  scene = new THREE.Scene();

  // Set up a perspective camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 25);

  // Create WebGL renderer with antialiasing for smoother edges
  renderer = createRenderer();
  
  // Add rendering canvas to the DOM
  document.body.appendChild(renderer.domElement);
  
  // Create orbit controls for interactive camera movement
  controls = createControls(camera, renderer.domElement);
  
  // Set up the environment (lights, background, etc.)
  environment = createEnvironment(scene);
  
  // Create audio visualizer
  visualizer = createVisualizer(scene);
  
  // Set up audio analysis
  audioManager = createAudioManager();
  
  // Connect Spotify player if available
  const spotifyPlayer = getPlayer();
  if (spotifyPlayer) {
    audioManager.connectToSpotifyPlayer(spotifyPlayer);
  }
  
  // Apply initial renderer quality setting
  applyQualitySettings(appSettings.quality);
  
  // Setup FPS counter if enabled
  if (appSettings.showFps) {
    setupFpsCounter();
  }
  
  // Handle settings changes
  window.addEventListener('settingsChange', handleSettingsChange);
  
  // Handle window resizing
  window.addEventListener('resize', onWindowResize);
  
  // Start animation loop
  animate();
}

// Create the WebGL renderer
function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true
  });
  
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
  renderer.outputEncoding = THREE.sRGBEncoding; // Correct color space
  renderer.toneMappingExposure = 1.2; // Slightly brighter scene
  
  // Add canvas styles
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.zIndex = '1';
  
  return renderer;
}

// Apply quality settings to renderer
function applyQualitySettings(quality) {
  switch (quality) {
    case 'low':
      renderer.setPixelRatio(1);
      renderer.shadowMap.enabled = false;
      break;
    case 'medium':
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      break;
    case 'high':
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      break;
  }
}

// Setup FPS counter
function setupFpsCounter() {
  // Create stats panel
  if (typeof Stats !== 'undefined') {
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    
    // Style the stats panel
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    stats.dom.style.zIndex = '100';
    
    document.body.appendChild(stats.dom);
  } else {
    // Load Stats.js dynamically if not already available
    const script = document.createElement('script');
    script.onload = function() {
      if (typeof Stats !== 'undefined') {
        stats = new Stats();
        stats.showPanel(0);
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '10px';
        stats.dom.style.left = '10px';
        stats.dom.style.zIndex = '100';
        document.body.appendChild(stats.dom);
      }
    };
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js';
    document.head.appendChild(script);
  }
}

// Handle settings changes
function handleSettingsChange(event) {
  const { settings } = event.detail;
  
  // Update local settings
  appSettings = settings;
  
  // Apply quality settings
  if (renderer) {
    applyQualitySettings(settings.quality);
  }
  
  // Toggle FPS counter
  if (settings.showFps) {
    if (!stats) {
      setupFpsCounter();
    } else if (stats.dom.parentNode !== document.body) {
      document.body.appendChild(stats.dom);
    }
  } else if (stats && stats.dom.parentNode === document.body) {
    document.body.removeChild(stats.dom);
  }
  
  // Update controls auto-rotation
  if (controls) {
    controls.autoRotate = settings.autoRotate;
    controls.autoRotateSpeed = settings.motionIntensity * 4;
  }
  
  // Apply bass boost
  if (audioManager && audioManager.setBassBoost) {
    audioManager.setBassBoost(settings.bassBoost);
  }
  
  // Apply color scheme to visualizer
  if (visualizer && visualizer.setColorScheme) {
    visualizer.setColorScheme(settings.colorScheme);
  }
}

// Resize handling
function onWindowResize() {
  if (!camera || !renderer) return;
  
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Main animation loop
function animate(time = 0) {
  requestAnimationFrame(animate);

  // Update stats if enabled
  if (stats) {
    stats.begin();
  }

  // Calculate delta time for smooth animations
  const deltaTime = time - lastTime;
  lastTime = time;
  
  // Get audio frequency data
  const freqData = audioManager.getFrequencyData();
  
  // Get bass/mid/treble data if available
  let bassData, midData, trebleData;
  if (audioManager.getBassData) {
    bassData = audioManager.getBassData();
    midData = audioManager.getMidData();
    trebleData = audioManager.getTrebleData();
  }
  
  // Update visualizer with audio data
  if (freqData) {
    // Apply motion intensity setting
    const intensityFactor = appSettings.motionIntensity;
    
    // Modify audio data based on settings
    const enhancedFreqData = enhanceAudioData(freqData, {
      bassBoost: appSettings.bassBoost,
      intensityFactor: intensityFactor
    });
    
    // Update visualizer
    visualizer.update(enhancedFreqData);
    
    // Update environment with audio data
    if (environment && environment.update) {
      environment.update(enhancedFreqData);
    }
  }
  
  // Update camera controls
  if (controls) {
    controls.update(deltaTime * 0.001);
  }
  
  // Render the scene
  renderer.render(scene, camera);
  
  // End stats measurement
  if (stats) {
    stats.end();
  }
}

// Enhance audio data based on settings
function enhanceAudioData(freqData, options = {}) {
  const { bassBoost = false, intensityFactor = 1.0 } = options;
  
  // Create a copy of the data to avoid modifying the original
  const enhancedData = new Uint8Array(freqData.length);
  
  for (let i = 0; i < freqData.length; i++) {
    let value = freqData[i];
    
    // Apply bass boost (first ~20% of frequency bins)
    if (bassBoost && i < freqData.length * 0.2) {
      value = Math.min(255, value * 1.5);
    }
    
    // Apply intensity factor
    value = value * intensityFactor;
    
    // Ensure value is within bounds
    enhancedData[i] = Math.min(255, Math.max(0, value));
  }
  
  return enhancedData;
}

// Clean up resources when app is closed or navigated away
export function cleanup() {
  // Stop animation loop
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(animate);
  }
  
  // Dispose of Three.js resources
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
    
    // Remove canvas from DOM
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
  
  // Dispose of geometry and materials
  if (scene) {
    disposeHierarchy(scene);
  }
  
  // Clean up audio context
  if (audioManager && audioManager.context) {
    audioManager.context.close();
  }
  
  // Remove event listeners
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('settingsChange', handleSettingsChange);
  
  // Clear references
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
  visualizer = null;
  audioManager = null;
  environment = null;
  stats = null;
}

// Helper function to dispose Three.js objects
function disposeHierarchy(node) {
  if (!node) return;
  
  for (let i = node.children.length - 1; i >= 0; i--) {
    disposeHierarchy(node.children[i]);
  }
  
  if (node.geometry) {
    node.geometry.dispose();
  }
  
  if (node.material) {
    if (Array.isArray(node.material)) {
      node.material.forEach(material => disposeMaterial(material));
    } else {
      disposeMaterial(node.material);
    }
  }
}

// Helper function to dispose material and its textures
function disposeMaterial(material) {
  if (!material) return;
  
  // Dispose textures
  for (const key in material) {
    if (material[key] && material[key].isTexture) {
      material[key].dispose();
    }
  }
  
  material.dispose();
}

// Handle visibility changes (tab switching)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause intensive rendering when tab is not visible
    // This saves battery and CPU usage
  } else {
    // Resume rendering when tab is visible again
    lastTime = performance.now();
    // If audio context was suspended, resume it
    if (audioManager && audioManager.context && audioManager.context.state === 'suspended') {
      audioManager.context.resume();
    }
  }
});

// Export additional functions for external access
export const appAPI = {
  // Get current visualizer instance
  getVisualizer: () => visualizer,
  
  // Get current audio manager
  getAudioManager: () => audioManager,
  
  // Set color scheme
  setColorScheme: (scheme) => {
    if (visualizer && visualizer.setColorScheme) {
      visualizer.setColorScheme(scheme);
    }
  },
  
  // Toggle auto-rotation
  setAutoRotate: (enabled) => {
    if (controls) {
      controls.autoRotate = enabled;
    }
  },
  
  // Set motion intensity
  setMotionIntensity: (value) => {
    if (controls) {
      controls.autoRotateSpeed = value * 4;
      appSettings.motionIntensity = value;
    }
  },
  
  // Toggle FPS display
  toggleFpsDisplay: (show) => {
    appSettings.showFps = show;
    if (show) {
      setupFpsCounter();
    } else if (stats && stats.dom.parentNode === document.body) {
      document.body.removeChild(stats.dom);
    }
  },
  
  // Take screenshot
  takeScreenshot: () => {
    if (renderer) {
      return renderer.domElement.toDataURL('image/png');
    }
    return null;
  }
};