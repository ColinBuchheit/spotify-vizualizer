// Enhanced main entry point with improved device detection
import './src/visualizer.css';
import { SpotifyVisualizer } from './src/spotify/SpotifyVisualizer.js';
import { getAccessTokenFromUrl, isAuthenticated, redirectToLogin } from './src/auth/handleAuth.js';

// Global instance
let spotifyVisualizer = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check WebGL support first
  if (!hasWebGLSupport()) {
    showError('Your browser does not support WebGL, which is required for this visualizer.');
    return;
  }
  
  // Add loading indicator
  const loading = document.createElement('div');
  loading.className = 'loading-spinner';
  document.body.appendChild(loading);
  
  // Check if user is authenticated
  const accessToken = getAccessTokenFromUrl();

  if (accessToken || isAuthenticated()) {
    // User is authenticated, initialize visualizer
    await initializeVisualizer();
  } else {
    // User is not authenticated, show login screen
    showLoginScreen();
    
    // Remove loading spinner
    if (document.body.contains(loading)) {
      document.body.removeChild(loading);
    }
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
    showError('An error occurred while initializing the visualizer. Please try again.');
  } finally {
    // Remove loading indicator
    const loading = document.querySelector('.loading-spinner');
    if (loading && document.body.contains(loading)) {
      document.body.removeChild(loading);
    }
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
 * Enhance login screen with additional information
 */
function enhanceLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  if (!loginScreen) return;
  
  // Add Premium requirement notice
  const premiumNotice = document.createElement('div');
  premiumNotice.className = 'premium-notice';
  premiumNotice.innerHTML = `
    <div class="premium-badge">
      <span>Premium Required</span>
    </div>
    <p class="premium-text">
      This visualizer requires a Spotify Premium account to function properly.
    </p>
  `;
  
  // Add steps section
  const stepsSection = document.createElement('div');
  stepsSection.className = 'steps-section';
  stepsSection.innerHTML = `
    <h3>How It Works</h3>
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <p>Connect your Spotify Premium account</p>
      </div>
      <div class="step">
        <div class="step-number">2</div>
        <p>Select "Spotify Visualizer" as your playback device in the Spotify app</p>
      </div>
      <div class="step">
        <div class="step-number">3</div>
        <p>Play music and enjoy the synchronized visuals!</p>
      </div>
    </div>
  `;
  
  // Find a good place to insert these elements
  const features = loginScreen.querySelector('.features');
  if (features) {
    loginScreen.insertBefore(premiumNotice, features);
    loginScreen.insertBefore(stepsSection, loginScreen.querySelector('.footer'));
  } else {
    loginScreen.appendChild(premiumNotice);
    loginScreen.appendChild(stepsSection);
  }
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .premium-notice {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 15px 20px;
      border-radius: 10px;
      margin: 10px auto 20px;
      display: flex;
      align-items: center;
      gap: 15px;
      max-width: 600px;
    }
    
    .premium-badge {
      background-color: #1DB954;
      padding: 6px 10px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      box-shadow: 0 3px 10px rgba(29, 185, 84, 0.3);
    }
    
    .premium-text {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    
    .steps-section {
      max-width: 800px;
      margin: 30px auto;
      text-align: center;
    }
    
    .steps-section h3 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: #1DB954;
    }
    
    .steps {
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .step {
      background-color: rgba(255, 255, 255, 0.08);
      padding: 20px;
      border-radius: 12px;
      width: 220px;
      text-align: center;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .step:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
      background-color: rgba(29, 185, 84, 0.1);
    }
    
    .step-number {
      width: 40px;
      height: 40px;
      background-color: #1DB954;
      border-radius: 50%;
      margin: 0 auto 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 5px 15px rgba(29, 185, 84, 0.3);
    }
    
    .step p {
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }
    
    @media (max-width: 768px) {
      .premium-notice {
        flex-direction: column;
        text-align: center;
        padding: 15px;
      }
      
      .steps {
        flex-direction: column;
        align-items: center;
      }
      
      .step {
        width: 90%;
        max-width: 280px;
      }
    }
  `;
  
  document.head.appendChild(style);
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
