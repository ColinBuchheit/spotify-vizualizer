// Enhanced main entry point using the improved components
import './src/visualizer.css';
import { VisualizerManager } from './src/three/VisualizerManager.js';
import { getAccessTokenFromUrl, isAuthenticated, redirectToLogin } from './src/auth/handleAuth.js';

// Global visualizer manager instance
let visualizerManager = null;

document.addEventListener('DOMContentLoaded', () => {
  // Detect WebGL support first
  if (!hasWebGLSupport()) {
    showError('Your browser does not support WebGL, which is required for this visualizer.');
    return;
  }
  
  // Add loading indicator
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  document.body.appendChild(loading);
  
  // Check if we received tokens from authentication or have valid stored tokens
  const accessToken = getAccessTokenFromUrl();

  if (accessToken) {
    // User is authenticated, show visualizer
    showVisualizer(accessToken);
  } else if (isAuthenticated()) {
    // User has a stored valid token
    showVisualizer(localStorage.getItem('spotify_access_token'));
  } else {
    // User is not authenticated, show login screen
    showLoginScreen();
    
    // Remove loading spinner
    if (document.body.contains(loading)) {
      document.body.removeChild(loading);
    }
  }
  
  // Add visualization mode controls
  setupVisualizationControls();
  
  // Add window resize handler
  window.addEventListener('resize', handleWindowResize);
});

/**
 * Show the visualizer and initialize it with the access token
 * @param {string} accessToken - Spotify access token
 */
function showVisualizer(accessToken) {
  // Hide login screen, show app
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('app');
  
  if (loginScreen) loginScreen.style.display = 'none';
  if (app) app.style.display = 'block';
  
  // Initialize visualizer manager
  visualizerManager = new VisualizerManager();
  
  visualizerManager.initialize(app, accessToken)
    .catch(error => {
      console.error('Error initializing visualizer:', error);
      
      // Try to get a more specific error message
      let errorMessage = 'Failed to initialize visualizer. Please try again.';
      
      if (error.message) {
        if (error.message.includes('authentication') || error.message.includes('token')) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (error.message.includes('premium')) {
          errorMessage = 'Spotify Premium is required for this feature.';
        } else if (error.message.includes('WebGL')) {
          errorMessage = 'Your browser does not support WebGL, which is required for this application.';
        }
      }
      
      showError(errorMessage);
    })
    .finally(() => {
      // Remove loading indicator when done
      const loading = document.querySelector('.loading-spinner');
      if (loading && document.body.contains(loading)) {
        document.body.removeChild(loading);
      }
    });
}

/**
 * Show the login screen
 */
function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('app');
  
  if (loginScreen) loginScreen.style.display = 'flex';
  if (app) app.style.display = 'none';
  
  // Add event listener to the connect button
  const connectButton = document.getElementById('connect-button');
  if (connectButton) {
    connectButton.addEventListener('click', () => {
      // Show loading spinner
      const loading = document.createElement('div');
      loading.className = 'loading-spinner';
      document.body.appendChild(loading);
      
      // Redirect to login
      redirectToLogin();
    });
  }
  
  // Check for error parameters in URL
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  
  if (error) {
    showErrorMessage(error);
  }
}

/**
 * Show error message on login screen
 * @param {string} error - Error code
 */
function showErrorMessage(error) {
  const errorMessage = document.getElementById('error-message');
  if (!errorMessage) return;
  
  let message = 'An error occurred during authentication.';
  
  switch (error) {
    case 'access_denied':
      message = 'You need to allow access to Spotify to use this visualizer.';
      break;
    case 'authentication_failed':
      message = 'Authentication failed. Please try again.';
      break;
    default:
      message = `Authentication error: ${error}`;
  }
  
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  // Create error overlay if it doesn't exist
  let errorOverlay = document.getElementById('error-overlay');
  
  if (!errorOverlay) {
    errorOverlay = document.createElement('div');
    errorOverlay.id = 'error-overlay';
    errorOverlay.innerHTML = `
      <div class="error-container">
        <h2>Something went wrong</h2>
        <p id="error-message"></p>
        <div class="error-buttons">
          <button id="error-retry">Try Again</button>
          <button id="error-logout">Log Out</button>
        </div>
      </div>
    `;
    document.body.appendChild(errorOverlay);
    
    // Add event listeners
    document.getElementById('error-retry').addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('error-logout').addEventListener('click', () => {
      // Clear tokens and redirect to login
      localStorage.clear();
      window.location.href = '/';
    });
  }
  
  // Set error message
  document.getElementById('error-message').textContent = message;
  
  // Show error overlay
  errorOverlay.style.display = 'flex';
}

/**
 * Check for WebGL support
 * @returns {boolean} - Whether WebGL is supported
 */
function hasWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    return !!gl;
  } catch (e) {
    return false;
  }
}

/**
 * Setup visualization mode controls
 */
function setupVisualizationControls() {
  // Create visualization controls
  const controls = document.createElement('div');
  controls.id = 'visualization-controls';
  controls.innerHTML = `
    <div class="viz-buttons">
      <button class="viz-button active" data-mode="orbital">Orbital</button>
      <button class="viz-button" data-mode="waveform">Waveform</button>
      <button class="viz-button" data-mode="nebula">Nebula</button>
      <button class="viz-button" data-mode="geometric">Geometric</button>
    </div>
  `;
  
  document.body.appendChild(controls);
  
  // Add event listeners to buttons
  const buttons = controls.querySelectorAll('.viz-button');
  buttons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Update active state
      buttons.forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      
      // Change visualization mode
      const mode = e.target.getAttribute('data-mode');
      if (visualizerManager) {
        visualizerManager.setVisualizationMode(mode);
      }
    });
  });
  
  // Hide controls initially, show when visualizer is active
  controls.style.display = 'none';
  
  // Show controls when visualizer is initialized
  const showControlsInterval = setInterval(() => {
    if (visualizerManager && visualizerManager.initialized) {
      controls.style.display = 'block';
      clearInterval(showControlsInterval);
    }
  }, 1000);
}

/**
 * Handle window resize
 */
function handleWindowResize() {
  if (visualizerManager) {
    visualizerManager.onWindowResize();
  }
}

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (visualizerManager) {
    visualizerManager.dispose();
  }
});