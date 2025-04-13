// Enhanced main entry point with improved device detection and error handling
import './src/visualizer.css';
import { SpotifyVisualizer } from './src/spotify/SpotifyVisualizer.js';
import { getAccessTokenFromUrl, isAuthenticated, redirectToLogin, clearTokens } from './src/auth/handleAuth.js';

// Global instance
let spotifyVisualizer = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check WebGL support first
  if (!hasWebGLSupport()) {
    showError('Your browser does not support WebGL, which is required for this visualizer.');
    return;
  }
  
  // Add loading indicator (only if it doesn't already exist)
  addLoadingIndicator();
  
  // Check if user is authenticated
  const accessToken = getAccessTokenFromUrl();

  if (accessToken || isAuthenticated()) {
    // User is authenticated, initialize visualizer
    await initializeVisualizer();
  } else {
    // User is not authenticated, show login screen
    showLoginScreen();
    
    // Remove loading spinner
    removeLoadingIndicator();
  }
  
  // Add window unload handler
  window.addEventListener('beforeunload', () => {
    if (spotifyVisualizer) {
      spotifyVisualizer.dispose();
    }
  });
  
  // Add special handler for Spotify app redirection
  window.addEventListener('focus', () => {
    // This handles cases where user opened Spotify app and comes back
    if (spotifyVisualizer && spotifyVisualizer.deviceStatus && !spotifyVisualizer.deviceStatus.active) {
      spotifyVisualizer.pollForTrackChanges();
    }
  });
});

/**
 * Add loading indicator if it doesn't exist already
 */
function addLoadingIndicator() {
  if (!document.querySelector('.loading-spinner')) {
    const loading = document.createElement('div');
    loading.className = 'loading-spinner';
    document.body.appendChild(loading);
  }
}

/**
 * Remove loading indicator safely
 */
function removeLoadingIndicator() {
  const loading = document.querySelector('.loading-spinner');
  if (loading) {
    try {
      if (document.body.contains(loading)) {
        document.body.removeChild(loading);
      } else if (loading.parentNode) {
        // Handle case where loading might be in another container
        loading.parentNode.removeChild(loading);
      } else {
        // Just hide it if we can't remove it
        loading.style.display = 'none';
      }
    } catch (e) {
      console.warn('Error removing loading indicator:', e);
      loading.style.display = 'none';
    }
  }
}

/**
 * Initialize the Spotify visualizer
 */
async function initializeVisualizer() {
  try {
    // Hide login screen, show app
    const loginScreen = document.getElementById('login-screen');
    const app = document.getElementById('app');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (app) app.style.display = 'block';
    
    // Create and initialize visualizer
    spotifyVisualizer = new SpotifyVisualizer();
    
    const success = await spotifyVisualizer.initialize(app);
    
    if (!success) {
      console.error('Failed to initialize visualizer');
      showError('Failed to initialize visualizer. Please try refreshing the page.');
    }
  } catch (error) {
    console.error('Error initializing visualizer:', error);
    
    // Handle specific error types
    if (error.message && error.message.includes('Premium')) {
      showError('Spotify Premium Required: This visualizer requires a Spotify Premium account. Please upgrade your account to use this feature.', true);
    } else if (error.message && error.message.includes('authentication') || error.status === 401) {
      clearTokens(); // Clear invalid tokens
      showError('Authentication failed. Please log in again.', false, true);
    } else {
      showError('An error occurred while initializing the visualizer. Please try again.');
    }
  } finally {
    // Remove loading indicator safely
    removeLoadingIndicator();
  }
}

/**
 * Show the login screen
 */
function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const app = document.getElementById('app');
  
  if (loginScreen) loginScreen.style.display = 'flex';
  if (app) app.style.display = 'none';
  
  // Enhanced login screen with more helpful information
  enhanceLoginScreen();
  
  // Add event listener to the connect button
  const connectButton = document.getElementById('connect-button');
  if (connectButton) {
    connectButton.addEventListener('click', () => {
      // Show loading spinner
      addLoadingIndicator();
      
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
 * Enhance login screen with additional information
 */
function enhanceLoginScreen() {
  // Implementation unchanged
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
    case 'premium_required':
      message = 'Spotify Premium is required for this visualizer. Please upgrade your account.';
      break;
    default:
      message = `Authentication error: ${error}`;
  }
  
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

/**
 * Show error message in overlay
 * @param {string} message - Error message
 * @param {boolean} isPremiumError - Whether it's a Premium account error
 * @param {boolean} isAuthError - Whether it's an authentication error
 */
function showError(message, isPremiumError = false, isAuthError = false) {
  // Create error overlay if it doesn't exist
  let errorOverlay = document.getElementById('error-overlay');
  
  if (!errorOverlay) {
    errorOverlay = document.createElement('div');
    errorOverlay.id = 'error-overlay';
    errorOverlay.innerHTML = `
      <div class="error-container">
        <h2>${isPremiumError ? 'Spotify Premium Required' : 'Something went wrong'}</h2>
        <p id="error-message"></p>
        <div class="error-buttons">
          ${isPremiumError ? 
            '<button id="error-premium">Upgrade to Premium</button>' : 
            '<button id="error-retry">Try Again</button>'}
          <button id="error-logout">Log Out</button>
        </div>
      </div>
    `;
    document.body.appendChild(errorOverlay);
    
    // Add event listeners
    if (isPremiumError) {
      document.getElementById('error-premium').addEventListener('click', () => {
        window.open('https://www.spotify.com/premium/', '_blank');
      });
    } else {
      const retryButton = document.getElementById('error-retry');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
    
    document.getElementById('error-logout').addEventListener('click', () => {
      // Clear tokens and redirect to login
      clearTokens();
      window.location.href = '/';
    });
  }
  
  // Set error message
  const errorMessageEl = document.getElementById('error-message');
  if (errorMessageEl) {
    errorMessageEl.textContent = message;
  }
  
  // Handle auth error - automatically redirect after a delay
  if (isAuthError) {
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }
  
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
