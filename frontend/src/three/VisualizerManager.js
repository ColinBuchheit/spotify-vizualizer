// VisualizerManager.js - Manages integration between Spotify API, audio analysis, and visualization
import { ImmersiveVisualizer } from './ImmersiveVisualizer.js';
import { AudioAnalyzer } from '../audio/AudioAnalyzer.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from '../spotify/spotifyAPI.js';
import { renderTrackInfo } from '../ui/TrackInfo.js';

export class VisualizerManager {
  constructor() {
    this.visualizer = null;
    this.audioAnalyzer = null;
    this.accessToken = null;
    this.currentTrackId = null;
    this.initialized = false;
    this.container = null;
    this.lastUpdateTime = 0;
    this.isActive = false;
    this.pollInterval = null;
    
    // Track metadata
    this.currentTrack = {
      id: null,
      name: null,
      artist: null,
      album: null,
      albumImageUrl: null,
      isPlaying: false
    };
    
    // Performance monitoring
    this.fpsCounter = {
      count: 0,
      lastCheck: 0,
      value: 0
    };
    
    // Configuration
    this.config = {
      pollFrequency: 5000, // How often to check for track changes (ms)
      visualMode: 'orbital', // Default visualization mode
      autoResume: true, // Auto-resume on visibility change
      useWebAudio: true, // Use Web Audio API if available
      enableDebug: false // Debug mode
    };
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }
  
  /**
   * Initialize the visualizer system
   * @param {HTMLElement} containerElement - DOM element to render in
   * @param {string} accessToken - Spotify access token
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(containerElement, accessToken) {
    if (this.initialized) {
      console.warn('VisualizerManager already initialized');
      return true;
    }
    
    try {
      this.container = containerElement;
      this.accessToken = accessToken;
      
      // Show loading indicator
      this.showLoading();
      
      // Initialize audio analyzer
      this.audioAnalyzer = new AudioAnalyzer();
      await this.audioAnalyzer.initialize();
      
      // Initialize visualizer
      this.visualizer = new ImmersiveVisualizer();
      this.visualizer.init(containerElement);
      
      // Fetch current track and audio data
      await this.updateCurrentTrack();
      
      // Setup visibility change handler
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Start animation loop
      this.isActive = true;
      this.lastUpdateTime = performance.now();
      this.animate();
      
      // Start polling for track changes
      this.startTrackPolling();
      
      // Hide loading indicator
      this.hideLoading();
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing VisualizerManager:', error);
      this.showError('Failed to initialize visualization. Please try again.');
      this.hideLoading();
      return false;
    }
  }
  
  /**
   * Update the current track information and audio data
   * @returns {Promise<boolean>} - Success status
   */
  async updateCurrentTrack() {
    try {
      // Get currently playing track
      const trackData = await getCurrentlyPlayingTrack(this.accessToken);
      
      if (!trackData || !trackData.item) {
        console.log('No track currently playing');
        return false;
      }
      
      // Check if track changed
      const trackId = trackData.item.id;
      const isNewTrack = trackId !== this.currentTrackId;
      const isPlaying = trackData.is_playing;
      
      // Update track info UI
      renderTrackInfo(trackData);
      
      // Update current track data
      this.currentTrack = {
        id: trackId,
        name: trackData.item.name,
        artist: trackData.item.artists?.[0]?.name || 'Unknown Artist',
        album: trackData.item.album?.name || 'Unknown Album',
        albumImageUrl: trackData.item.album?.images?.[0]?.url || null,
        isPlaying: isPlaying
      };
      
      // If track changed, update visualizer with new data
      if (isNewTrack) {
        this.currentTrackId = trackId;
        
        // Update album artwork
        if (this.visualizer && this.currentTrack.albumImageUrl) {
          this.visualizer.updateAlbumCover(this.currentTrack.albumImageUrl);
        }
        
        // Get detailed audio analysis
        await this.updateTrackAnalysis(trackId);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating current track:', error);
      return false;
    }
  }
  
  /**
   * Fetch and process detailed audio analysis for a track
   * @param {string} trackId - Spotify track ID
   * @returns {Promise<boolean>} - Success status
   */
  async updateTrackAnalysis(trackId) {
    try {
      if (!trackId) return false;
      
      // Show loading message for audio analysis
      this.showMessage('Analyzing track...');
      
      // Get audio features (high-level track data)
      const features = await getAudioFeatures(trackId, this.accessToken);
      
      // Get detailed audio analysis (beat/segment data)
      const analysis = await getAudioAnalysis(trackId, this.accessToken);
      
      // Update audio analyzer with Spotify data
      if (this.audioAnalyzer && features && analysis) {
        this.audioAnalyzer.setSpotifyAnalysis(analysis, features);
        this.audioAnalyzer.setTrackStartTime();
      }
      
      return true;
    } catch (error) {
      console.error('Error fetching audio data:', error);
      this.showMessage('Could not get detailed audio analysis. Visualization may be less accurate.');
      return false;
    }
  }
  
  /**
   * Start polling for track changes
   */
  startTrackPolling() {
    // Clear existing interval if any
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    // Set up new polling interval
    this.pollInterval = setInterval(async () => {
      if (!this.isActive || !this.accessToken) return;
      
      await this.updateCurrentTrack();
    }, this.config.pollFrequency);
  }
  
  /**
   * Handle document visibility changes
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Document not visible, pause updates to save resources
      this.isActive = false;
      
      if (this.audioAnalyzer) {
        this.audioAnalyzer.suspendIfPossible();
      }
    } else if (this.config.autoResume) {
      // Document visible again, resume updates
      this.isActive = true;
      this.lastUpdateTime = performance.now();
      
      if (this.audioAnalyzer) {
        this.audioAnalyzer.resumeAudioContext();
      }
      
      // Restart animation if it was stopped
      if (!this.animationFrameId) {
        this.animate();
      }
      
      // Refresh track info when returning to the page
      this.updateCurrentTrack();
    }
  }
  
  /**
   * Main animation loop
   */
  animate() {
    if (!this.isActive || !this.initialized) return;
    
    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    // Calculate time delta
    const now = performance.now();
    const delta = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;
    
    // Update FPS counter every second
    this.fpsCounter.count++;
    if (now - this.fpsCounter.lastCheck >= 1000) {
      this.fpsCounter.value = this.fpsCounter.count;
      this.fpsCounter.count = 0;
      this.fpsCounter.lastCheck = now;
      
      // Log FPS in debug mode
      if (this.config.enableDebug) {
        console.log(`FPS: ${this.fpsCounter.value}`);
      }
    }
    
    // Update audio analyzer
    if (this.audioAnalyzer) {
      const audioData = this.audioAnalyzer.update();
      
      // Update visualizer with audio data
      if (this.visualizer && audioData) {
        this.visualizer.updateAudioData(audioData);
      }
    }
  }
  
  /**
   * Change the visualization mode
   * @param {string} mode - Visualization mode name
   */
  setVisualizationMode(mode) {
    if (!this.visualizer) return;
    
    this.config.visualMode = mode;
    // Visualizer implementation of mode switching would be called here
    
    this.showMessage(`Visualization mode: ${mode}`);
  }
  
  /**
   * Show loading indicator
   */
  showLoading() {
    // Check for existing loading element
    let loading = document.querySelector('.loading-spinner');
    
    if (!loading) {
      loading = document.createElement('div');
      loading.className = 'loading-spinner';
      document.body.appendChild(loading);
    } else {
      loading.style.display = 'block';
    }
  }
  
  /**
   * Hide loading indicator
   */
  hideLoading() {
    const loading = document.querySelector('.loading-spinner');
    if (loading) {
      loading.style.display = 'none';
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  showError(message) {
    // Check for existing error overlay
    let errorOverlay = document.getElementById('error-overlay');
    
    if (!errorOverlay) {
      // Create error overlay
      errorOverlay = document.createElement('div');
      errorOverlay.id = 'error-overlay';
      errorOverlay.innerHTML = `
        <div class="error-container">
          <h2>Something went wrong</h2>
          <p id="error-message"></p>
          <div class="error-buttons">
            <button id="error-retry">Try Again</button>
            <button id="error-close">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(errorOverlay);
      
      // Add event listeners
      document.getElementById('error-retry').addEventListener('click', () => {
        window.location.reload();
      });
      
      document.getElementById('error-close').addEventListener('click', () => {
        errorOverlay.style.display = 'none';
      });
    }
    
    // Set error message
    document.getElementById('error-message').textContent = message;
    
    // Show error overlay
    errorOverlay.style.display = 'flex';
  }
  
  /**
   * Show temporary message notification
   * @param {string} message - Message to display
   * @param {boolean} isError - Whether it's an error message
   * @param {number} duration - How long to show message (ms)
   */
  showMessage(message, isError = false, duration = 5000) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message-notification';
    if (isError) messageEl.classList.add('error');
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    // Animate entrance
    setTimeout(() => {
      messageEl.classList.add('show');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(messageEl)) {
          document.body.removeChild(messageEl);
        }
      }, 300);
    }, duration);
  }
  
  /**
   * Handle window resize event
   */
  onWindowResize() {
    if (this.visualizer) {
      this.visualizer.onWindowResize();
    }
  }
  
  /**
   * Clean up and dispose resources
   */
  dispose() {
    // Stop animation loop
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Clear polling interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    // Dispose visualizer
    if (this.visualizer) {
      this.visualizer.dispose();
      this.visualizer = null;
    }
    
    // Dispose audio analyzer
    if (this.audioAnalyzer) {
      this.audioAnalyzer.dispose();
      this.audioAnalyzer = null;
    }
    
    this.initialized = false;
  }
}