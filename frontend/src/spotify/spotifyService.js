import { getStoredAccessToken } from './auth.js';

const API_BASE = 'https://api.spotify.com/v1';

function getHeaders() {
  return {
    Authorization: `Bearer ${getStoredAccessToken()}`,
    'Content-Type': 'application/json'
  };
}

// In spotifyService.js - Add better error handling with retry logic
export async function getCurrentTrack(maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const res = await fetch(`${API_BASE}/me/player/currently-playing`, {
          headers: getHeaders()
        });
        
        if (res.status === 204) return null; // Nothing playing
        if (res.status === 401) {
          // Token expired, trigger refresh flow
          throw new Error('AUTH_EXPIRED');
        }
        
        const data = await res.json();
        return {
          name: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          id: data.item.id
        };
      } catch (error) {
        retries++;
        if (error.message === 'AUTH_EXPIRED') throw error; // Bubble up auth errors
        if (retries >= maxRetries) throw error;
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
      }
    }
  }

export async function transferPlaybackTo(device_id) {
  await fetch(`${API_BASE}/me/player`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      device_ids: [device_id],
      play: true
    })
  });
}

export async function playTrack(uri) {
  await fetch(`${API_BASE}/me/player/play`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ uris: [uri] })
  });
}
