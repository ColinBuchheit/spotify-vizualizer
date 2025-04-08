// src/ui/TrackInfo.js
let lastTrackId = null;
let isPlaying = true;

export function renderTrackInfo(trackData) {
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
  
  // Update last track ID
  lastTrackId = trackId;
  
  // Create the container
  const container = document.createElement('div');
  container.id = 'track-info';

  // Create HTML content
  container.innerHTML = `
    <div class="track-container">
      <img src="${albumImage}" alt="Album Cover">
      <div class="text">
        <div class="title">${name}</div>
        <div class="artist">${artist}</div>
        <div class="album">${album}</div>
      </div>
    </div>
    <div class="playback-controls">
      <button class="control-button previous" aria-label="Previous">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="19 20 9 12 19 4 19 20"></polygon>
          <line x1="5" y1="4" x2="5" y2="20"></line>
        </svg>
      </button>
      <button class="control-button play-pause" aria-label="Play/Pause">
        ${isPlaying ? getPauseIcon() : getPlayIcon()}
      </button>
      <button class="control-button next" aria-label="Next">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="4" x2="19" y2="20"></line>
        </svg>
      </button>
    </div>
  `;
  
  // Add to the DOM
  document.body.appendChild(container);
  
  // Add event listeners for controls
  setupControlEvents();
  
  // Animate entrance
  setTimeout(() => {
    container.style.opacity = 1;
    container.style.transform = 'translateY(0)';
  }, 10);
}

function setupControlEvents() {
  // Play/Pause button
  const playPauseButton = document.querySelector('.control-button.play-pause');
  if (playPauseButton) {
    playPauseButton.addEventListener('click', () => {
      isPlaying = !isPlaying;
      togglePlayback();
      updatePlayPauseButton();
    });
  }
  
  // Previous track button
  const prevButton = document.querySelector('.control-button.previous');
  if (prevButton) {
    prevButton.addEventListener('click', () => {
      playPreviousTrack();
    });
  }
  
  // Next track button
  const nextButton = document.querySelector('.control-button.next');
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      playNextTrack();
    });
  }
}

function updatePlayPauseButton() {
  const button = document.querySelector('.control-button.play-pause');
  if (button) {
    button.innerHTML = isPlaying ? getPauseIcon() : getPlayIcon();
  }
}

function togglePlayback() {
  // Call the Spotify API to toggle playback
  fetch('https://api.spotify.com/v1/me/player/' + (isPlaying ? 'pause' : 'play'), {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`
    }
  }).catch(error => {
    console.error('Error toggling playback:', error);
    showPlaybackError('Could not control playback. Try again or refresh the page.');
  });
}

function playNextTrack() {
  fetch('https://api.spotify.com/v1/me/player/next', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`
    }
  }).catch(error => {
    console.error('Error playing next track:', error);
    showPlaybackError('Could not play next track. Try again or refresh the page.');
  });
}

function playPreviousTrack() {
  fetch('https://api.spotify.com/v1/me/player/previous', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`
    }
  }).catch(error => {
    console.error('Error playing previous track:', error);
    showPlaybackError('Could not play previous track. Try again or refresh the page.');
  });
}

function getAccessToken() {
  // This is a simple implementation - you'll want to improve this
  // by getting the token from your auth mechanism
  return localStorage.getItem('spotify_access_token') || '';
}

function showPlaybackError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message-notification';
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  
  // Show message
  setTimeout(() => {
    errorDiv.classList.add('show');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    errorDiv.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 300);
  }, 5000);
}

function getPlayIcon() {
  return `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  `;
}

function getPauseIcon() {
  return `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  `;
}