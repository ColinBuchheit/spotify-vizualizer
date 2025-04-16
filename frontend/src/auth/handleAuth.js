// Modified auth/handleAuth.js to fix authentication issues

/**
 * Get access token from URL parameters or localStorage
 * @returns {string|null} - Spotify access token or null if not found
 */
export function getAccessTokenFromUrl() {
  // First try to get from URL
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token');
  const expiresIn = urlParams.get('expires_in');
  
  if (accessToken) {
    // Store in localStorage with expiration
    storeTokens(accessToken, refreshToken, expiresIn);
    
    // Clean up URL to remove tokens
    cleanUrl();
    
    return accessToken;
  }
  
  // If not in URL, try localStorage
  return getStoredAccessToken();
}

/**
 * Store tokens in localStorage with expiration
 * @param {string} accessToken - Spotify access token
 * @param {string} refreshToken - Spotify refresh token
 * @param {string} expiresIn - Token expiration in seconds
 */
function storeTokens(accessToken, refreshToken, expiresIn) {
  if (!accessToken) return;
  
  // Calculate expiration time
  const expirationTime = Date.now() + (parseInt(expiresIn) * 1000);
  
  // Store tokens and expiration
  localStorage.setItem('spotify_access_token', accessToken);
  
  if (refreshToken) {
    localStorage.setItem('spotify_refresh_token', refreshToken);
  }
  
  localStorage.setItem('spotify_token_expiration', expirationTime.toString());
  
  // Store scope to check if we have the right permissions
  localStorage.setItem('spotify_token_scope', 'user-read-private user-read-email user-read-playback-state user-modify-playback-state user-read-currently-playing streaming user-read-recently-played user-read-playback-position');
}

/**
 * Get stored access token if valid
 * @returns {string|null} - Spotify access token or null if not found/expired
 */
function getStoredAccessToken() {
  const accessToken = localStorage.getItem('spotify_access_token');
  const expirationTime = localStorage.getItem('spotify_token_expiration');
  
  if (!accessToken || !expirationTime) {
    return null;
  }
  
  // Check if token is expired
  if (Date.now() > parseInt(expirationTime)) {
    // Token expired, try to refresh
    console.log('Token expired, attempting to refresh...');
    refreshAccessToken();
    return null;
  }
  
  // Check if token will expire soon (within 5 minutes)
  if (Date.now() > parseInt(expirationTime) - 300000) {
    // Token will expire soon, refresh in background
    console.log('Token expiring soon, refreshing in background...');
    refreshAccessToken();
  }
  
  return accessToken;
}

/**
 * Clean up URL to remove tokens
 */
function cleanUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('access_token');
  url.searchParams.delete('refresh_token');
  url.searchParams.delete('expires_in');
  
  // Replace URL without reloading page
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

/**
 * Refresh access token using stored refresh token
 * @returns {Promise<string|null>} - New access token or null if refresh failed
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  
  if (!refreshToken) {
    console.error('No refresh token available');
    clearTokens();
    return null;
  }
  
  try {
    const response = await fetch('http://127.0.0.1:8888/auth/refresh_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('No access token in refresh response');
    }
    
    // Store new access token
    storeTokens(data.access_token, refreshToken, data.expires_in || '3600');
    
    console.log('Token refreshed successfully');
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    // If server returns 401 or 400, token might be invalid
    if (error.message && (error.message.includes('401') || error.message.includes('400'))) {
      clearTokens();
      redirectToLogin();
    }
    
    return null;
  }
}

/**
 * Clear all stored tokens
 */
export function clearTokens() {
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_token_expiration');
  localStorage.removeItem('spotify_token_scope');
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user has a valid access token
 */
export function isAuthenticated() {
  return getStoredAccessToken() !== null;
}

/**
 * Redirect to login page
 */
export function redirectToLogin() {
  window.location.href = 'http://127.0.0.1:8888/auth/login';
}

/**
 * Handle authentication error
 * @param {Error} error - Authentication error
 */
export function handleAuthError(error) {
  console.error('Authentication error:', error);
  
  // If it's a 403 error, we need to re-authenticate with proper scopes
  if (error.response && error.response.status === 403) {
    console.log('Permission error detected, clearing tokens and redirecting to login');
    clearTokens();
    redirectToLogin();
    return;
  }
  
  // For other errors, just try to refresh the token
  refreshAccessToken().then(token => {
    if (!token) {
      // If refresh failed, redirect to login
      redirectToLogin();
    } else {
      // Refresh succeeded, reload the page
      window.location.reload();
    }
  });
}
