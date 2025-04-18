// Main entry point for the application
import './src/visualizer.css';
import { initVisualizer } from './src/three/index.js';
import { getAccessTokenFromUrl, getStoredAccessToken, redirectToLogin } from './src/auth/handleAuth.js';

// Define the Spotify callback globally if not already defined in index.html
if (typeof window.onSpotifyWebPlaybackSDKReady !== 'function') {
  window.onSpotifyWebPlaybackSDKReady = function () {
    console.log('Spotify Web Playback SDK is ready');
    if (window.spotifySDKCallback) {
      window.spotifySDKCallback();
    }
  };
}

window.onload = async () => {
  // First check for token in URL
  const accessToken = getAccessTokenFromUrl();

  if (accessToken) {
    // 💾 Store the token so it persists after refresh
    localStorage.setItem('spotify_access_token', accessToken);
    // Set expiration 1 hour from now (Spotify tokens last ~3600s)
    const expiresIn = 3600; // or get this from URL if you're parsing it
    const expirationTimestamp = Date.now() + expiresIn * 1000;
    localStorage.setItem('spotify_token_expiration', expirationTimestamp.toString());

    localStorage.setItem('spotify_token_scope', 'user-read-private user-read-email user-read-playback-state user-modify-playback-state streaming');

    // 🧼 Clean the URL (remove code=... from the bar)
    window.history.replaceState({}, document.title, '/');
  
    // 🚀 Start visualizer
    showVisualizer(accessToken);
  } else {
    const storedToken = await getStoredAccessToken();
    console.log('📦 Stored token:', storedToken ? storedToken.substring(0, 15) + '...' : 'none');
    
    if (storedToken) {
      showVisualizer(storedToken);
    } else {
      console.warn('⚠️ No stored token, showing login screen.');
      showLoginScreen();
    }
  }
};

/**
 * Show the visualizer and initialize it with the access token
 * @param {string} accessToken - Spotify access token
 */
function showVisualizer(accessToken) {
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('app');

  if (loginScreen) loginScreen.style.display = 'none';
  if (app) app.style.display = 'block';

  // Create a proper spinner container for better positioning and overlay
  const spinnerContainer = document.createElement('div');
  spinnerContainer.className = 'spinner-container';
  
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  
  spinnerContainer.appendChild(loading);
  document.body.appendChild(spinnerContainer);

  initVisualizer(accessToken)
    .catch(error => {
      console.error('Error initializing visualizer:', error);
      document.body.removeChild(spinnerContainer);
      showError('Failed to initialize visualizer. Please try again.');
    })
    .finally(() => {
      if (document.body.contains(spinnerContainer)) {
        document.body.removeChild(spinnerContainer);
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

    document.getElementById('error-retry').addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('error-logout').addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/';
    });
  }

  document.getElementById('error-message').textContent = message;
  errorOverlay.style.display = 'flex';
}