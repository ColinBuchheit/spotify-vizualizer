// src/spotify/spotifyAPI.js
import axios from 'axios';

const BASE_URL = 'https://api.spotify.com/v1';

/**
 * Get the currently playing track
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Current track data
 */
export async function getCurrentlyPlayingTrack(accessToken) {
  try {
    const response = await axios.get(`${BASE_URL}/me/player/currently-playing`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching currently playing track:', error.response?.data || error);
    throw error;
  }
}

/**
 * Get audio features for a track
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Audio features data
 */
export async function getAudioFeatures(trackId, accessToken) {
  if (!trackId) {
    console.error('No track ID provided for audio features');
    return null;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching audio features:', error.response?.data || error);
    throw error;
  }
}

/**
 * Get detailed audio analysis for a track
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Audio analysis data including segments, beats, bars, etc.
 */
export async function getAudioAnalysis(trackId, accessToken) {
  if (!trackId) {
    console.error('No track ID provided for audio analysis');
    return null;
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/audio-analysis/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching audio analysis:', error.response?.data || error);
    throw error;
  }
}

/**
 * Get user profile information
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - User profile data
 */
export async function getUserProfile(accessToken) {
  try {
    const response = await axios.get(`${BASE_URL}/me`, {
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
 * Control playback - play, pause, skip, etc.
 * @param {string} action - Action to perform: 'play', 'pause', 'next', 'previous'
 * @param {string} accessToken - Spotify access token
 * @param {string} deviceId - Optional device ID
 * @returns {Promise<Object>} - Response data
 */
export async function controlPlayback(action, accessToken, deviceId = null) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  try {
    let endpoint = '';
    let method = 'PUT';
    let body = null;

    // Construct request based on action
    switch (action) {
      case 'play':
        endpoint = deviceId ? 
          `${BASE_URL}/me/player/play?device_id=${deviceId}` : 
          `${BASE_URL}/me/player/play`;
        method = 'PUT';
        break;
      case 'pause':
        endpoint = `${BASE_URL}/me/player/pause`;
        method = 'PUT';
        break;
      case 'next':
        endpoint = `${BASE_URL}/me/player/next`;
        method = 'POST';
        break;
      case 'previous':
        endpoint = `${BASE_URL}/me/player/previous`;
        method = 'POST';
        break;
      default:
        throw new Error(`Unknown playback action: ${action}`);
    }

    // Send request
    const response = await axios({
      method,
      url: endpoint,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: body
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error(`Error controlling playback (${action}):`, error.response?.data || error);
    throw error;
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
    const response = await axios.get(`${BASE_URL}/me/player/recently-played`, {
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
    const response = await axios.get(`${BASE_URL}/me/player/devices`, {
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
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        q: query,
        type,
        limit: Math.min(50, limit)
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