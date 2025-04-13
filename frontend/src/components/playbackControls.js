import { getPlayer } from '../spotify/Playback.js';
import { playTrack } from '../spotify/SpotifyService.js';

export function createPlaybackControls() {
  // Check if controls already exist
  const existingControls = document.querySelector('.playback-controls');
  if (existingControls) {
    existingControls.remove();
  }
  
  // Create container
  const container = document.createElement('div');
  container.className = 'playback-controls';
  
  // Create controls content
  const controlsContent = `
    <div class="control-button previous" aria-label="Previous track">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 5V19L8 12L19 5Z" fill="currentColor"/>
        <rect x="6" y="6" width="2" height="12" rx="1" fill="currentColor"/>
      </svg>
    </div>
    <div class="control-button play-pause" aria-label="Play or pause">
      <svg class="play-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/>
      </svg>
      <svg class="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: none;">
        <rect x="7" y="6" width="3" height="12" rx="1.5" fill="currentColor"/>
        <rect x="14" y="6" width="3" height="12" rx="1.5" fill="currentColor"/>
      </svg>
    </div>
    <div class="control-button next" aria-label="Next track">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 5V19L16 12L5 5Z" fill="currentColor"/>
        <rect x="16" y="6" width="2" height="12" rx="1" fill="currentColor"/>
      </svg>
    </div>
    <div class="playback-progress">
      <div class="progress-bar">
        <div class="progress-fill"></div>
        <div class="progress-handle"></div>
      </div>
      <div class="time-display">
        <span class="current-time">0:00</span>
        <span class="duration">0:00</span>
      </div>
    </div>
  `;
  
  container.innerHTML = controlsContent;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .playback-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: rgba(20, 20, 20, 0.7);
      padding: 12px 24px;
      border-radius: 40px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 100;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);
    }
    
    .playback-controls:hover {
      background: rgba(25, 25, 25, 0.85);
      transform: translateX(-50%) translateY(-2px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }
    
    .control-button {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      cursor: pointer;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }
    
    .control-button:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }
    
    .control-button:active {
      transform: scale(0.95);
    }
    
    .control-button.play-pause {
      width: 52px;
      height: 52px;
      background: #1DB954;
    }
    
    .control-button.play-pause:hover {
      background: #1ed760;
    }
    
    .playback-progress {
      position: absolute;
      bottom: -20px;
      left: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 20px;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
      pointer-events: none;
    }
    
    .playback-controls:hover .playback-progress {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    
    .progress-bar {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      position: relative;
      cursor: pointer;
      margin-bottom: 5px;
    }
    
    .progress-fill {
      position: absolute;
      height: 100%;
      width: 0%;
      background: #1DB954;
      border-radius: 2px;
      transition: width 0.1s linear;
    }
    
    .progress-handle {
      position: absolute;
      top: 50%;
      left: 0%;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #1DB954;
      transform: translate(-50%, -50%) scale(0);
      transition: transform 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      z-index: 2;
    }
    
    .progress-bar:hover .progress-handle {
      transform: translate(-50%, -50%) scale(1);
    }
    
    .time-display {
      width: 100%;
      display: flex;
      justify-content: space-between;
      color: rgba(255, 255, 255, 0.7);
      font-size: 10px;
      padding: 0 2px;
    }
    
    /* Loading animation for the play button */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .playback-controls.loading .play-pause {
      position: relative;
    }
    
    .playback-controls.loading .play-pause svg {
      opacity: 0.5;
    }
    
    .playback-controls.loading .play-pause::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid #ffffff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    /* Active track pulse animation */
    @keyframes pulse-glow {
      0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(29, 185, 84, 0); }
      100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
    }
    
    .playback-controls.playing .play-pause {
      animation: pulse-glow 2s infinite;
    }
    
    /* Responsive design adjustments */
    @media (max-width: 600px) {
      .playback-controls {
        padding: 10px 16px;
      }
      
      .control-button {
        width: 36px;
        height: 36px;
      }
      
      .control-button.play-pause {
        width: 46px;
        height: 46px;
      }
      
      .playback-progress {
        bottom: -18px;
      }
    }
    
    /* Support for reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .playback-controls,
      .playback-controls:hover,
      .control-button,
      .playback-progress,
      .progress-handle {
        transition: none;
      }
      
      .playback-controls.playing .play-pause {
        animation: none;
      }
      
      .playback-controls.loading .play-pause::after {
        animation: none;
        border: 2px solid rgba(255, 255, 255, 0.5);
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Add to DOM
  document.body.appendChild(container);
  
  // Get elements
  const playPauseButton = container.querySelector('.play-pause');
  const previousButton = container.querySelector('.previous');
  const nextButton = container.querySelector('.next');
  const playIcon = container.querySelector('.play-icon');
  const pauseIcon = container.querySelector('.pause-icon');
  const progressBar = container.querySelector('.progress-bar');
  const progressFill = container.querySelector('.progress-fill');
  const progressHandle = container.querySelector('.progress-handle');
  const currentTimeDisplay = container.querySelector('.current-time');
  const durationDisplay = container.querySelector('.duration');
  
  // Track state
  let isPlaying = false;
  let currentProgress = 0;
  let progressUpdateInterval = null;
  
  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  // Update progress UI
  const updateProgressUI = (positionMs, durationMs) => {
    if (!durationMs) return;
    
    const progress = positionMs / durationMs;
    progressFill.style.width = `${progress * 100}%`;
    progressHandle.style.left = `${progress * 100}%`;
    
    currentTimeDisplay.textContent = formatTime(positionMs / 1000);
    durationDisplay.textContent = formatTime(durationMs / 1000);
    
    currentProgress = progress;
  };
  
  // Update playing state UI
  const updatePlayingState = (playing) => {
    isPlaying = playing;
    
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      container.classList.add('playing');
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      container.classList.remove('playing');
    }
  };
  
  // Set loading state
  const setLoading = (isLoading) => {
    if (isLoading) {
      container.classList.add('loading');
    } else {
      container.classList.remove('loading');
    }
  };
  
  // Handle play/pause
  playPauseButton.addEventListener('click', () => {
    const player = getPlayer();
    
    if (player) {
      setLoading(true);
      
      player.getCurrentState().then((state) => {
        if (!state) {
          console.error('User is not playing music through the Web Playback SDK');
          setLoading(false);
          return;
        }
        
        const { paused } = state;
        
        if (paused) {
          player.resume().then(() => {
            updatePlayingState(true);
            setLoading(false);
          });
        } else {
          player.pause().then(() => {
            updatePlayingState(false);
            setLoading(false);
          });
        }
      });
    }
  });
  
  // Handle previous track
  previousButton.addEventListener('click', () => {
    const player = getPlayer();
    
    if (player) {
      setLoading(true);
      
      player.previousTrack().then(() => {
        setLoading(false);
      });
    }
  });
  
  // Handle next track
  nextButton.addEventListener('click', () => {
    const player = getPlayer();
    
    if (player) {
      setLoading(true);
      
      player.nextTrack().then(() => {
        setLoading(false);
      });
    }
  });
  
  // Handle progress bar interaction
  progressBar.addEventListener('click', (e) => {
    const player = getPlayer();
    
    if (player) {
      // Calculate click position relative to progress bar
      const rect = progressBar.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      
      player.getCurrentState().then(state => {
        if (!state) return;
        
        const { duration } = state;
        const positionMs = duration * clickPosition;
        
        // Seek to position
        player.seek(positionMs).then(() => {
          updateProgressUI(positionMs, duration);
        });
      });
    }
  });
  
  // Initialize Spotify event listeners
  const initSpotifyEvents = () => {
    const player = getPlayer();
    
    if (!player) return;
    
    // Listen for player state changes
    player.addListener('player_state_changed', (state) => {
      if (!state) return;
      
      const { 
        position,
        duration,
        paused,
        track_window: { current_track }
      } = state;
      
      // Update playback progress
      updateProgressUI(position, duration);
      
      // Update play/pause state
      updatePlayingState(!paused);
      
      // Clear any existing interval
      if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
      }
      
      // Start a new interval if playing
      if (!paused) {
        let lastPosition = position;
        let lastUpdateTime = Date.now();
        
        progressUpdateInterval = setInterval(() => {
          // Calculate elapsed time since last update
          const elapsed = Date.now() - lastUpdateTime;
          const estimatedPosition = lastPosition + elapsed;
          
          // Only update UI if we're within the track duration
          if (estimatedPosition < duration) {
            updateProgressUI(estimatedPosition, duration);
          }
        }, 100);
      }
      
      // Remove loading state
      setLoading(false);
    });
    
    // Ready event
    player.addListener('ready', () => {
      console.log('Playback controls ready');
    });
    
    // Not ready event
    player.addListener('not_ready', () => {
      console.log('Playback controls device has gone offline');
    });
  };
  
  // Initialize
  initSpotifyEvents();
  
  // Return control methods
  return {
    element: container,
    updateProgress: updateProgressUI,
    setPlaying: updatePlayingState,
    setLoading,
    hide: () => {
      container.style.display = 'none';
    },
    show: () => {
      container.style.display = 'flex';
    },
    cleanup: () => {
      // Clear any intervals
      if (progressUpdateInterval) {
        clearInterval(progressUpdateInterval);
      }
      
      // Remove from DOM
      container.remove();
    }
  };
}
