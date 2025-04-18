// src/ui/TrackInfo.js
// Complete implementation with playback information but without duplicate controls

import { getStoredAccessToken } from '../auth/handleAuth.js';

let currentTrackId = null;
let isPlaying = false;

/**
 * Render track information display
 * @param {Object} trackData - Track data from Spotify API
 * @param {Function} onTrackInfoClick - Optional callback when track info is clicked
 */
export function renderTrackInfo(trackData, onTrackInfoClick = null) {
  // Remove existing track info if present
  const existingInfo = document.getElementById('track-info');
  if (existingInfo) {
    existingInfo.remove();
  }

  // Extract track information
  const name = trackData.item?.name || 'Unknown Track';
  const artist = trackData.item?.artists?.[0]?.name || 'Unknown Artist';
  const album = trackData.item?.album?.name || 'Unknown Album';
  const albumImage = trackData.item?.album?.images?.[0]?.url || '';
  const trackId = trackData.item?.id || '';
  
  // Update play state if available
  if (trackData.is_playing !== undefined) {
    isPlaying = trackData.is_playing;
  }
  
  // Update track ID
  currentTrackId = trackId;
  
  // Create the container
  const container = document.createElement('div');
  container.id = 'track-info';

  // Create HTML content
  container.innerHTML = `
    <div class="track-container">
      <img src="${albumImage}" alt="Album Cover for ${name}">
      <div class="text">
        <div class="title">${name}</div>
        <div class="artist">${artist}</div>
        <div class="album">${album}</div>
      </div>
    </div>
  `;
  
  // Add click handler for the container if callback provided
  if (typeof onTrackInfoClick === 'function') {
    container.addEventListener('click', () => {
      onTrackInfoClick(trackData);
    });
    container.style.cursor = 'pointer';
    
    // Add tooltip
    container.setAttribute('title', 'Click for more details');
  }
  
  // Add to the DOM
  document.body.appendChild(container);
  
  // Animate entrance
  setTimeout(() => {
    container.style.opacity = 1;
    container.style.transform = 'translateY(0)';
  }, 10);
  
  return container;
}

/**
 * Update track information without recreating the entire element
 * @param {Object} trackData - Track data from Spotify API
 */
export function updateTrackInfo(trackData) {
  if (!trackData || !trackData.item) return;
  
  const trackInfo = document.getElementById('track-info');
  if (!trackInfo) {
    // If track info doesn't exist, create it
    renderTrackInfo(trackData);
    return;
  }
  
  // Extract track information
  const name = trackData.item.name || 'Unknown Track';
  const artist = trackData.item.artists?.[0]?.name || 'Unknown Artist';
  const album = trackData.item.album?.name || 'Unknown Album';
  const albumImage = trackData.item.album?.images?.[0]?.url || '';
  
  // Update elements
  const titleEl = trackInfo.querySelector('.title');
  const artistEl = trackInfo.querySelector('.artist');
  const albumEl = trackInfo.querySelector('.album');
  const imgEl = trackInfo.querySelector('img');
  
  if (titleEl) titleEl.textContent = name;
  if (artistEl) artistEl.textContent = artist;
  if (albumEl) albumEl.textContent = album;
  if (imgEl) {
    imgEl.src = albumImage;
    imgEl.alt = `Album Cover for ${name}`;
  }
  
  // Update play state if available
  if (trackData.is_playing !== undefined) {
    isPlaying = trackData.is_playing;
  }
  
  // Update current track ID
  currentTrackId = trackData.item.id || '';
}

/**
 * Get current track info including ID and playing state
 * @returns {Object} - Current track info
 */
export function getCurrentTrackInfo() {
  return {
    trackId: currentTrackId,
    isPlaying
  };
}

/**
 * Get and display more detailed track information
 * @param {string} trackId - Spotify track ID
 */
export async function showDetailedTrackInfo(trackId) {
  if (!trackId) return;
  
  try {
    // Get access token
    const accessToken = await getStoredAccessToken();
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Get track details from Spotify API
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get track details: ${response.status}`);
    }
    
    const trackDetails = await response.json();
    
    // Get audio features for the track
    const featuresResponse = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    let audioFeatures = null;
    if (featuresResponse.ok) {
      audioFeatures = await featuresResponse.json();
    }
    
    // Show modal with detailed info
    showTrackInfoModal(trackDetails, audioFeatures);
    
  } catch (error) {
    console.error('Error getting detailed track info:', error);
    showTrackInfoError('Could not load detailed track information');
  }
}

/**
 * Show modal with detailed track information
 * @param {Object} trackDetails - Track details from Spotify API
 * @param {Object} audioFeatures - Audio features from Spotify API
 */
function showTrackInfoModal(trackDetails, audioFeatures) {
  // Remove existing modal if any
  const existingModal = document.getElementById('track-info-modal');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }
  
  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'track-info-modal';
  modal.className = 'track-info-modal';
  
  // Format duration
  const durationMin = Math.floor(trackDetails.duration_ms / 60000);
  const durationSec = Math.floor((trackDetails.duration_ms % 60000) / 1000);
  const formattedDuration = `${durationMin}:${durationSec.toString().padStart(2, '0')}`;
  
  // Format release date
  const releaseDate = new Date(trackDetails.album.release_date);
  const formattedReleaseDate = releaseDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Create modal content
  let modalContent = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${trackDetails.name}</h2>
        <button class="close-modal">×</button>
      </div>
      <div class="modal-body">
        <div class="track-details-grid">
          <div class="album-cover">
            <img src="${trackDetails.album.images[0]?.url || ''}" alt="Album Cover">
          </div>
          <div class="track-details-info">
            <p><strong>Artist:</strong> ${trackDetails.artists.map(a => a.name).join(', ')}</p>
            <p><strong>Album:</strong> ${trackDetails.album.name}</p>
            <p><strong>Release Date:</strong> ${formattedReleaseDate}</p>
            <p><strong>Duration:</strong> ${formattedDuration}</p>
            <p><strong>Popularity:</strong> ${trackDetails.popularity}/100</p>
            <p><strong>Track Number:</strong> ${trackDetails.track_number}</p>
  `;
  
  // Add audio features if available
  if (audioFeatures) {
    modalContent += `
            <div class="audio-features">
              <h3>Audio Features</h3>
              <div class="feature-bars">
                <div class="feature-bar">
                  <label>Energy</label>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${audioFeatures.energy * 100}%"></div>
                  </div>
                  <span>${Math.round(audioFeatures.energy * 100)}%</span>
                </div>
                <div class="feature-bar">
                  <label>Danceability</label>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${audioFeatures.danceability * 100}%"></div>
                  </div>
                  <span>${Math.round(audioFeatures.danceability * 100)}%</span>
                </div>
                <div class="feature-bar">
                  <label>Valence (Positivity)</label>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${audioFeatures.valence * 100}%"></div>
                  </div>
                  <span>${Math.round(audioFeatures.valence * 100)}%</span>
                </div>
                <div class="feature-bar">
                  <label>Acousticness</label>
                  <div class="bar-container">
                    <div class="bar-fill" style="width: ${audioFeatures.acousticness * 100}%"></div>
                  </div>
                  <span>${Math.round(audioFeatures.acousticness * 100)}%</span>
                </div>
                <div class="feature-bar">
                  <label>Tempo</label>
                  <span>${Math.round(audioFeatures.tempo)} BPM</span>
                </div>
              </div>
            </div>
    `;
  }
  
  // Add Spotify link
  modalContent += `
            <div class="spotify-link">
              <a href="${trackDetails.external_urls.spotify}" target="_blank" rel="noopener noreferrer">
                Open in Spotify
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set modal content
  modal.innerHTML = modalContent;
  
  // Add to DOM
  document.body.appendChild(modal);
  
  // Add event listeners
  modal.querySelector('.close-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Close when clicking outside content
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // Show modal with animation
  setTimeout(() => {
    modal.classList.add('visible');
  }, 10);
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showTrackInfoError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'track-info-error';
  errorEl.textContent = message;
  
  document.body.appendChild(errorEl);
  
  setTimeout(() => {
    errorEl.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    errorEl.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(errorEl)) {
        document.body.removeChild(errorEl);
      }
    }, 300);
  }, 3000);
}