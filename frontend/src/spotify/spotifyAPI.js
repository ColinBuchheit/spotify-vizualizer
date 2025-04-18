// src/spotify/spotifyAPI.js with improved error handling and consistent implementation
import axios from 'axios';
import { refreshAccessToken, handleAuthError } from '../auth/handleAuth.js';

const BASE_URL = 'https://api.spotify.com/v1';

const featuresCache = new Map();
const analysisCache = new Map();


// Utility for showing messages to the user
// Import this from a shared utility file or define it here
const showMessage = (message, duration) => {
  // Implementation should match your UI notification system
  console.log('UI Message:', message);
  // You should implement this or import it from another file
};

// Create axios instance with built-in auth handling
const spotifyAxios = axios.create({
  baseURL: BASE_URL
});

// Add response interceptor to handle auth errors
spotifyAxios.interceptors.response.use(
  response => response,
  async error => {
    // Only refresh token on 401 Unauthorized errors (not 403 Forbidden)
    if (error.response && error.response.status === 401) {
      // Check if we've already tried refreshing for this request
      if (error.config._isRetry) {
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh the token
        const token = await refreshAccessToken();
        
        if (token) {
          // If token refresh was successful, retry the request
          const originalRequest = error.config;
          originalRequest._isRetry = true;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return spotifyAxios(originalRequest);
        } else {
          handleAuthError(error);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        handleAuthError(refreshError);
        return Promise.reject(error);
      }
    }
    
    // For other errors, just reject the promise
    return Promise.reject(error);
  }
);

/**
 * Get the currently playing track
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Current track data
 */
export async function getCurrentlyPlayingTrack(accessToken) {
  try {
    // Validate token
    if (!accessToken || typeof accessToken !== 'string') {
      console.error('❌ No access token provided to getCurrentlyPlayingTrack');
      throw new Error('Access token is missing or invalid');
    }

    console.log('🔐 Using access token (partial):', accessToken.slice(0, 20) + '...');

    const response = await spotifyAxios.get('/me/player/currently-playing', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching currently playing track:', error.response?.data || error.message || error);
    throw error;
  }
}


/**
 * Get default audio features when API call fails
 * @returns {Object} - Default audio features
 */
function getDefaultAudioFeatures() {
  return {
    energy: 0.5,
    tempo: 120,
    valence: 0.5,
    danceability: 0.5,
    acousticness: 0.5,
    instrumentalness: 0.5,
    liveness: 0.5,
    speechiness: 0.5
  };
}

/**
 * Get audio features with caching and improved error handling
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Audio features data
 */
export async function getAudioFeatures(trackId, accessToken) {
  if (!trackId) {
    console.error('No track ID provided for audio features');
    return getDefaultAudioFeatures();
  }
  
  // Check cache first
  if (featuresCache.has(trackId)) {
    return featuresCache.get(trackId);
  }
  
  try {
    const response = await spotifyAxios.get(`/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 5000
    });

    // Cache successful response
    featuresCache.set(trackId, response.data);
    return response.data;
  } catch (error) {
    // Log detailed error for debugging
    console.error('Audio features error details:', {
      status: error.response?.status,
      message: error.response?.data?.error?.message,
      trackId
    });
    
    // Handle 403 Forbidden with improved messaging
    if (error.response && error.response.status === 403) {
      const errorMsg = error.response.data?.error?.message || '';
      if (errorMsg.toLowerCase().includes('premium')) {
        console.warn('Premium account required for audio features access');
        // You can call showMessage() here if this function is properly defined/imported
      }
      return getDefaultAudioFeatures();
    }
    
    // Return default features for any other error
    return getDefaultAudioFeatures();
  }
}

/**
 * Get detailed audio analysis for a track with caching
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Audio analysis data including segments, beats, etc.
 */
export async function getAudioAnalysis(trackId, accessToken) {
  if (!trackId) {
    console.error('No track ID provided for audio analysis');
    return null;
  }

  // Check cache first
  if (analysisCache.has(trackId)) {
    return analysisCache.get(trackId);
  }
    
  try {
    const response = await spotifyAxios.get(`/audio-analysis/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 8000
    });

    // Cache the successful response
    analysisCache.set(trackId, response.data);
    return response.data;
  } catch (error) {
    console.error('Audio analysis error details:', {
      status: error.response?.status,
      message: error.response?.data?.error?.message,
      trackId
    });
    
    // Special handling for 403 errors
    if (error.response && error.response.status === 403) {
      // Check for specific error details
      const errorMsg = error.response.data?.error?.message || '';
      if (errorMsg.toLowerCase().includes('premium')) {
        // You can call showMessage() here if properly defined/imported
        console.warn('Premium account required for audio analysis');
      }
      
      return null;
    }
    
    // For 429 Too Many Requests - implement backoff
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 3;
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
    }
    
    return null;
  }
}

/**
 * Get user profile information
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - User profile data
 */
export async function getUserProfile(accessToken) {
  try {
    const response = await spotifyAxios.get('/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error);
    throw error;
  }
}

/**
 * Check if the user has a Premium account
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<boolean>} - True if Premium account
 */
export async function isPremiumUser(accessToken) {
  try {
    const profile = await getUserProfile(accessToken);
    return profile.product === 'premium';
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false; // Assume not premium if check fails
  }
}

/**
 * Get recently played tracks
 * @param {string} accessToken - Spotify access token
 * @param {number} limit - Number of tracks to return (default: 20, max: 50)
 * @returns {Promise<Object>} - Recently played tracks
 */
export async function getRecentlyPlayed(accessToken, limit = 20) {
  try {
    const response = await spotifyAxios.get('/me/player/recently-played', {
      params: { limit: Math.min(50, limit) },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching recently played tracks:', error.response?.data || error);
    throw error;
  }
}

/**
 * Get available devices
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Available devices
 */
export async function getAvailableDevices(accessToken) {
  try {
    const response = await spotifyAxios.get('/me/player/devices', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching available devices:', error.response?.data || error);
    throw error;
  }
}

/**
 * Search for tracks, albums, artists, or playlists
 * @param {string} query - Search query
 * @param {string} type - Item types to search across: 'album', 'artist', 'playlist', 'track' (can be comma-separated list)
 * @param {string} accessToken - Spotify access token
 * @param {number} limit - Number of items to return (default: 20, max: 50)
 * @returns {Promise<Object>} - Search results
 */
export async function search(query, type, accessToken, limit = 20) {
  try {
    const response = await spotifyAxios.get('/search', {
      params: {
        q: query,
        type,
        limit: Math.min(50, limit),
        market: 'from_token' // Use user's market
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error searching:', error.response?.data || error);
    throw error;
  }
}

/**
 * Control playback - play, pause, skip, etc.
 * @param {string} action - Action to perform: 'play', 'pause', 'next', 'previous'
 * @param {string} accessToken - Spotify access token
 * @param {string} deviceId - Optional device ID
 * @returns {Promise<Object>} - Response data
 */
export async function controlPlayback(action, accessToken, deviceId = null) {
  if (!accessToken) {
    console.warn('Missing token for audio API call');
  } else {
    console.log('Using token (start):', accessToken.slice(0, 12), '...');
  }
  

  try {
    let endpoint = '';
    let method = 'PUT';
    let body = null;

    // Construct request based on action
    switch (action) {
      case 'play':
        endpoint = deviceId ? 
          `/me/player/play?device_id=${deviceId}` : 
          `/me/player/play`;
        method = 'PUT';
        break;
      case 'pause':
        endpoint = `/me/player/pause`;
        method = 'PUT';
        break;
      case 'next':
        endpoint = `/me/player/next`;
        method = 'POST';
        break;
      case 'previous':
        endpoint = `/me/player/previous`;
        method = 'POST';
        break;
      default:
        throw new Error(`Unknown playback action: ${action}`);
    }

    const response = await spotifyAxios({
      method,
      url: endpoint,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: body,
      timeout: 5000
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Error controlling playback (${action}):`, error.response?.data || error);
    
    // For 404 errors, device might not be ready
    if (error.response && error.response.status === 404) {
      return { 
        success: false, 
        error: 'Playback device not ready. Try again in a moment.' 
      };
    }
    
    // For 403 errors, likely a premium account issue
    if (error.response && error.response.status === 403) {
      return {
        success: false,
        error: 'Premium account required for playback control.'
      };
    }
    
    throw error;
  }
}

// Export the axios instance for use in other modules if needed
export { spotifyAxios };