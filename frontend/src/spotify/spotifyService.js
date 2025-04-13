import { getStoredAccessToken } from './auth.js';

const API_BASE = 'https://api.spotify.com/v1';

function getHeaders() {
  return {
    Authorization: `Bearer ${getStoredAccessToken()}`,
    'Content-Type': 'application/json'
  };
}

export async function getCurrentTrack() {
  const res = await fetch(`${API_BASE}/me/player/currently-playing`, {
    headers: getHeaders()
  });
  if (res.status === 204) return null; // Nothing playing
  const data = await res.json();
  return {
    name: data.item.name,
    artist: data.item.artists.map(a => a.name).join(', '),
    id: data.item.id
  };
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
