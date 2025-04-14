// VisualizerUtils.js
// Utility functions for the audio visualizer

/**
 * Detect beats in the audio based on Spotify analysis data
 * @param {number} time - Current animation time
 * @param {Array} beats - Beats data from Spotify analysis
 * @param {number} lastBeatTime - Time of last detected beat
 * @param {number} currentTempo - Current track tempo (BPM)
 * @param {number} energy - Track energy value (0-1)
 * @param {boolean} isPaused - Whether playback is paused
 * @returns {Object} - Beat detection results
 */
export function detectBeats(time, beats, lastBeatTime, currentTempo, energy, isPaused) {
    // Default result
    const result = {
      beatDetected: false,
      beatIntensity: 0,
      lastBeatTime: lastBeatTime
    };
    
    // If paused, don't detect beats
    if (isPaused) {
      return result;
    }
    
    // Use actual beat data from Spotify analysis if available
    if (beats && beats.length > 0) {
      // Convert seconds to milliseconds for comparison
      const currentTimeMs = time * 1000;
      
      // Look for beats within a small window of the current time
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        // Convert beat time to milliseconds and add offset
        const beatStart = beat.start * 1000;
        const beatDuration = beat.duration * 1000;
        
        if (Math.abs(currentTimeMs - beatStart) < 100) { // 100ms window
          // Beat detected!
          const confidence = beat.confidence || 0.5;
          
          // Only count as beat if confidence is high enough
          if (confidence > 0.5) {
            result.beatDetected = true;
            result.beatIntensity = confidence;
            result.lastBeatTime = time;
            return result;
          }
        }
      }
    }
    
    // If we don't have beats data or no beat was found, use a timer based on tempo
    const tempoInterval = 60 / currentTempo; // Beat interval in seconds
    
    if (time - lastBeatTime > tempoInterval && energy > 0.3) {
      result.lastBeatTime = time;
      result.beatDetected = true;
      result.beatIntensity = energy;
      return result;
    }
    
    // Reset beat detection
    if (time - lastBeatTime > 0.1) {
      result.beatDetected = false;
    }
    
    return result;
  }
  
  /**
   * Get current music power level based on audio analysis
   * @param {number} time - Current animation time
   * @param {Array} segments - Segments data from Spotify analysis
   * @param {number} lastPowerLevel - Previous power level
   * @param {number} energy - Track energy value (0-1)
   * @param {boolean} isPaused - Whether playback is paused
   * @returns {number} - Current power level (0-1)
   */
  export function getCurrentMusicPower(time, segments, lastPowerLevel, energy, isPaused) {
    // If paused, return a very low power level
    if (isPaused) {
      return 0.1; // Just enough to see something, but minimal movement
    }
    
    // Use audio analysis segments to get loudness data
    if (segments && segments.length > 0) {
      // Find current segment
      const segmentTimeMs = time * 1000;
      let foundSegment = null;
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentStart = segment.start * 1000;
        const segmentEnd = segmentStart + (segment.duration * 1000);
        
        if (segmentTimeMs >= segmentStart && segmentTimeMs < segmentEnd) {
          foundSegment = segment;
          break;
        }
      }
      
      if (foundSegment) {
        // Loudness is in negative dB, so convert to 0-1 range
        // Typical range is -60 (quiet) to 0 (loud)
        const loudness = foundSegment.loudness_max || foundSegment.loudness_start || -20;
        const normalizedLoudness = Math.min(1, Math.max(0, (loudness + 60) / 60));
        
        // Smooth the loudness changes
        return lastPowerLevel * 0.7 + normalizedLoudness * 0.3;
      }
    }
    
    // Fallback: use energy value with pulsing effect
    if (isPaused) {
      return 0.1; // Minimal movement when paused
    }
    
    const pulsing = Math.sin(time * 4) * 0.2 + 0.8;
    return energy * pulsing;
  }
  
  /**
   * Create error overlay for displaying errors
   * @returns {Object} - Error overlay object with show/hide methods
   */
  export function createErrorOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
      <div class="error-container">
        <h2 style="margin-top: 0; color: #e61e32; font-size: 18px;">Error</h2>
        <p id="error-message" style="margin-bottom: 15px; font-size: 14px;"></p>
        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="error-close" style="background: transparent; border: 1px solid #666; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Dismiss</button>
          <button id="error-retry" style="background: #1db954; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Retry</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('error-close').addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    
    document.getElementById('error-retry').addEventListener('click', () => {
      window.location.reload();
    });
    
    return overlay;
  }
  
  /**
   * Wait for Spotify SDK to load
   * @returns {Promise} - Resolves when SDK is ready
   */
  export function waitForSpotifySDK() {
    return new Promise(resolve => {
      if (window.Spotify) {
        resolve();
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => {
          resolve();
        };
      }
    });
  }
  
  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  export function showError(message) {
    const errorOverlay = document.getElementById('error-overlay') || createErrorOverlay();
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorOverlay.style.display = 'flex';
    
    // Auto-dismiss after 10 seconds for non-critical errors
    if (!message.includes('Failed to initialize') && 
        !message.includes('Authentication failed') && 
        !message.includes('Premium required')) {
      setTimeout(() => {
        if (errorOverlay.style.display === 'flex') {
          errorOverlay.style.display = 'none';
        }
      }, 10000);
    }
  }
  
  /**
   * Show message notification
   * @param {string} message - Message to display
 */
export function showMessage(message) {
    // Remove any existing notifications to prevent stacking
    const existingNotifications = document.querySelectorAll('.message-notification');
    existingNotifications.forEach(notification => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    });
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message-notification';
    messageEl.textContent = message;
    messageEl.style.position = 'fixed';
    messageEl.style.top = '20px';
    messageEl.style.right = '20px';
    messageEl.style.backgroundColor = 'rgba(29, 185, 84, 0.9)';
    messageEl.style.color = 'white';
    messageEl.style.padding = '15px 20px';
    messageEl.style.borderRadius = '4px';
    messageEl.style.borderLeft = '4px solid #1db954';
    messageEl.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
    messageEl.style.zIndex = '1000';
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateX(20px)';
    messageEl.style.transition = 'all 0.3s ease';
    messageEl.style.maxWidth = '350px';
    messageEl.style.width = 'auto';
    messageEl.style.display = 'block';
    messageEl.style.boxSizing = 'border-box';
    messageEl.style.textAlign = 'left';
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.style.opacity = '1';
      messageEl.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (document.body.contains(messageEl)) {
          document.body.removeChild(messageEl);
        }
      }, 500);
    }, 5000);
  }
  
  /**
   * Add visualization controls to the UI
   * @param {Function} onModeChange - Callback when mode changes
   */
  export function addVisualizationControls(onModeChange) {
    const controls = document.createElement('div');
    controls.id = 'visualization-controls';
    controls.innerHTML = `
      <div class="viz-buttons">
        <button class="viz-button active" data-mode="bars">Bars</button>
        <button class="viz-button" data-mode="particles">Particles</button>
        <button class="viz-button" data-mode="waveform">Waveform</button>
      </div>
    `;
    
    document.body.appendChild(controls);
    
    // Add event listeners
    document.querySelectorAll('.viz-button').forEach(button => {
      button.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('.viz-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Change visualization mode
        if (onModeChange) {
          onModeChange(button.dataset.mode);
        }
      });
    });
  }