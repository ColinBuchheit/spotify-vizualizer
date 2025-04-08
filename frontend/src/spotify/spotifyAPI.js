// src/spotify/spotifyAPI.js
import axios from 'axios';

const BASE_URL = 'https://api.spotify.com/v1';

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
    return null;
  }
}

export async function getAudioFeatures(trackId, accessToken) {
  try {
    const response = await axios.get(`${BASE_URL}/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching audio features:', error.response?.data || error);
    return null;
  }
}
