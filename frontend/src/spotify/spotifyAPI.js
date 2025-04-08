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
 * Search for tracks
 * @param {string} query - Search query
 * @param {string} accessToken - Spotify access token
 * @param {number} limit - Results limit (default: 10)
 * @returns {Promise<Object>} - Search results
 */
export async function searchTracks(query, accessToken, limit = 10) {
  try {
    const response = await axios.get(`${BASE_URL}/search`, {
      params: {
        q: query,
        type: 'track',
        limit
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error searching tracks:', error.response?.data || error);
    throw error;
  }
}

/**
 * Get audio analysis for a track
 * @param {string} trackId - Spotify track ID
 * @param {string} accessToken - Spotify access token
 * @returns {Promise<Object>} - Audio analysis data
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
 * Get user's recently played tracks
 * @param {string} accessToken - Spotify access token
 * @param {number} limit - Results limit (default: 20)
 * @returns {Promise<Object>} - Recently played tracks
 */
export async function getRecentlyPlayed(accessToken, limit = 20) {
  try {
    const response = await axios.get(`${BASE_URL}/me/player/recently-played`, {
      params: { limit },
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
 * Play a specific track
 * @param {string} trackUri - Spotify track URI
 * @param {string} accessToken - Spotify access token
 * @param {string} deviceId - Device ID to play on (optional)
 * @returns {Promise<Object>} - Response data
 */
export async function playTrack(trackUri, accessToken, deviceId = null) {
  try {
    const endpoint = deviceId
      ? `${BASE_URL}/me/player/play?device_id=${deviceId}`
      : `${BASE_URL}/me/player/play`;
      
    await axios.put(endpoint, 
      { uris: [trackUri] },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Error playing track:', error.response?.data || error);
    throw error;
  }
}