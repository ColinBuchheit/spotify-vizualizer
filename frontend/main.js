// Main entry point for the application
import './src/visualizer.css';
import { initVisualizer } from './src/three/index.js';
import { getAccessTokenFromUrl, isAuthenticated, redirectToLogin } from './src/auth/handleAuth.js';

// Define the Spotify callback globally if not already defined in index.html
if (typeof window.onSpotifyWebPlaybackSDKReady !== 'function') {
  window.onSpotifyWebPlaybackSDKReady = function() {
    console.log('Spotify Web Playback SDK is ready');
    // This will be used by the setupSpotifyPlayer function
    if (window.spotifySDKCallback) {
      window.spotifySDKCallback();
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if we received tokens from authentication or have valid stored tokens
  const accessToken = getAccessTokenFromUrl();

  if (accessToken) {
    // User is authenticated, show visualizer
    showVisualizer(accessToken);
  } else if (isAuthenticated()) {
    // User has a stored valid token
    showVisualizer(getAccessTokenFromUrl());
  } else {
    // User is not authenticated, show login screen
    showLoginScreen();
  }
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
  
  // Show loading indicator
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  document.body.appendChild(loading);
  
  // Initialize visualizer
  initVisualizer(accessToken)
    .catch(error => {
      console.error('Error initializing visualizer:', error);
      document.body.removeChild(loading);
      showError('Failed to initialize visualizer. Please try again.');
    })
    .finally(() => {
      // Remove loading indicator when done
      if (document.body.contains(loading)) {
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
      redirectToLogin();
    });
  }
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
        <h2>Error</h2>
        <p id="error-message"></p>
        <div class="error-buttons">
          <button id="error-retry">Retry</button>
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