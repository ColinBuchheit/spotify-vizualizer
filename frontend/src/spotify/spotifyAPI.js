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
 * @returns {Promise<Object>} - Audio features data or fallback data
 */
export async function getAudioFeatures(trackId, accessToken) {
  if (!trackId) {
    console.warn('No track ID provided for audio features, using fallback data');
    return getFallbackAudioFeatures();
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.warn('Error fetching audio features:', error.response?.data || error);
    console.info('Using fallback audio features data - this is normal for non-Premium users');
    // Return fallback data instead of throwing an error
    return getFallbackAudioFeatures();
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
    console.warn('No track ID provided for audio analysis, using fallback data');
    return getFallbackAudioAnalysis();
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/audio-analysis/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.warn('Error fetching audio analysis:', error.response?.data || error);
    console.info('Using fallback audio analysis data - this is normal for non-Premium users');
    // Return fallback data instead of throwing an error
    return getFallbackAudioAnalysis();
  }
}

/**
 * Provide fallback audio features for when API access fails
 * @returns {Object} - Default audio features
 */
function getFallbackAudioFeatures() {
  return {
    danceability: 0.65,
    energy: 0.7,
    key: 5,
    loudness: -6.0,
    mode: 1,
    speechiness: 0.05,
    acousticness: 0.1,
    instrumentalness: 0.01,
    liveness: 0.15,
    valence: 0.75,
    tempo: 120,
    duration_ms: 220000,
    time_signature: 4
  };
}

/**
 * Provide fallback audio analysis for when API access fails
 * @returns {Object} - Default audio analysis with basic structure
 */
function getFallbackAudioAnalysis() {
  // Create a simple fake analysis with some beats and segments
  const beats = [];
  const segments = [];
  const tatums = [];
  const bars = [];
  const sections = [];
  
  // Generate 30 seconds of fake beats at 120 BPM
  const beatInterval = 60 / 120; // seconds per beat at 120 BPM
  for (let i = 0; i < 60; i++) {
    beats.push({
      start: i * beatInterval,
      duration: beatInterval,
      confidence: 0.8
    });
    
    // Add tatums (smaller rhythmic units)
    tatums.push({
      start: i * beatInterval,
      duration: beatInterval / 2,
      confidence: 0.7
    });
    
    // Add another tatum halfway through the beat
    tatums.push({
      start: i * beatInterval + (beatInterval / 2),
      duration: beatInterval / 2,
      confidence: 0.6
    });
    
    // Add a bar every 4 beats
    if (i % 4 === 0) {
      bars.push({
        start: i * beatInterval,
        duration: beatInterval * 4,
        confidence: 0.9
      });
    }
    
    // Add a section every 16 beats
    if (i % 16 === 0) {
      sections.push({
        start: i * beatInterval,
        duration: beatInterval * 16,
        confidence: 0.9,
        loudness: -8.0,
        tempo: 120,
        key: 5,
        mode: 1
      });
    }
  }
  
  // Generate some segments with audio features
  for (let i = 0; i < 120; i++) {
    segments.push({
      start: i * 0.25,
      duration: 0.25,
      confidence: 0.7,
      loudness_start: -12,
      loudness_max: -6,
      loudness_max_time: 0.1,
      loudness_end: -12,
      pitches: Array(12).fill(0).map(() => Math.random()),
      timbre: Array(12).fill(0).map(() => (Math.random() * 200) - 100)
    });
  }
  
  return {
    meta: {
      analyzer_version: "4.0.0",
      platform: "fallback",
      status_code: 200
    },
    track: {
      duration: 30.0,
      tempo: 120,
      key: 5,
      mode: 1,
      time_signature: 4,
      loudness: -8.0,
      key_confidence: 0.7,
      mode_confidence: 0.7,
      time_signature_confidence: 0.9
    },
    beats,
    bars,
    tatums,
    sections,
    segments
  };
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
