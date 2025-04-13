// SpotifyVisualizer.js - Updated implementation with device registration

import { VisualizerManager } from '../three/VisualizerManager.js';
import { AudioAnalyzer } from '../audio/AudioAnalyzer.js';
import { AudioVisualizerConnector } from '../audio/AudioVisualizer.js';
import { getCurrentlyPlayingTrack, getAudioFeatures, getAudioAnalysis } from './spotifyAPI.js';
import { renderTrackInfo } from '../ui/TrackInfo.js';
import { createErrorOverlay } from '../ui/ErrorOverlay.js';
import { SpotifyPlayerManager } from './SpotifyPlayerManager.js';
import { DeviceStatusUI } from '../ui/DeviceStatusUI.js';
import { getAccessTokenFromUrl, isAuthenticated, redirectToLogin } from '../auth/handleAuth.js';


/**
 * Main class for Spotify Visualizer application
 */
export class SpotifyVisualizer {
  constructor() {
    this.accessToken = null;
    this.initialized = false;
    this.trackId = null;
    this.errorOverlay = null;
    
    // Core components
    this.visualizerManager = null;
    this.audioAnalyzer = null;
    this.connector = null;
    this.spotifyPlayer = null;
    this.deviceStatusUI = null;
    
    // Polling and update timers
    this.pollInterval = null;
    this.pollFrequency = 3000; // Check for track changes every 3 seconds
    
    // UI elements
    this.container = null;
    this.loadingSpinner = null;
    this.trackInfoElement = null;
    
    // Visualization modes
    this.visualizationModes = [
      'orbital',    // Particles orbiting album
      'waveform',   // Audio waveform visualization
      'nebula',     // Particle clouds that react to audio
      'geometric'   // Geometric shapes that pulse to the beat
    ];
    this.currentMode = this.visualizationModes[0];
    
    // Device status
    this.deviceStatus = {
      registered: false,
      active: false,
      playing: false,
      deviceId: null,
      isPremium: false
    };
    
    // Settings
    this.settings = {
      autoPlay: true,
      highQuality: true,
      showTrackInfo: true,
      visualSensitivity: 0.8,
      useBeatDetection: true
    };
    
    // Bind methods
    this.handleTrackChange = this.handleTrackChange.bind(this);
    this.handleError = this.handleError.bind(this);
    this.pollForTrackChanges = this.pollForTrackChanges.bind(this);
    this.updateVisualization = this.updateVisualization.bind(this);
    this.handleStatusUIAction = this.handleStatusUIAction.bind(this);
    this.handlePlayerStateChanged = this.handlePlayerStateChanged.bind(this);
    this.handlePlayerReady = this.handlePlayerReady.bind(this);
  }
  
  /**
   * Initialize the Spotify Visualizer
   * @param {HTMLElement} container - DOM container for the visualizer
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(container) {
    try {
      // Store container reference
      this.container = container;
      
      // Show loading spinner
      this.showLoading();
      
      // Check authentication status
      if (!isAuthenticated()) {
        this.hideLoading();
        redirectToLogin();
        return false;
      }
      
      // Get Spotify access token
      this.accessToken = getAccessTokenFromUrl() || localStorage.getItem('spotify_access_token');
      
      if (!this.accessToken) {
        this.hideLoading();
        redirectToLogin();
        return false;
      }
      
      // Create error overlay
      this.errorOverlay = createErrorOverlay();
      
      // Initialize device status UI
      this.deviceStatusUI = new DeviceStatusUI();
      this.deviceStatusUI.initialize(container, this.handleStatusUIAction);
      this.deviceStatusUI.setState('initializing');
      
      // Initialize Spotify Player Manager for device registration
      this.spotifyPlayer = new SpotifyPlayerManager(this.accessToken);
      this.spotifyPlayer.setCallbacks({
        onReady: this.handlePlayerReady,
        onPlayerStateChanged: this.handlePlayerStateChanged,
        onError: this.handleError,
        onTrackChange: this.handleTrackChange,
        onInitializationComplete: this.handlePlayerInitialized.bind(this)
      });
      
      // Show initializing message
      this.deviceStatusUI.showMessage('Connecting to Spotify...', false, null, true);
      
      // Initialize the Spotify Player (registers device with Spotify)
      await this.spotifyPlayer.initialize();
      
      // Initialize audio analyzer
      console.log('Initializing audio analyzer...');
      this.audioAnalyzer = new AudioAnalyzer();
      await this.audioAnalyzer.initialize();
      
      // Initialize visualizer manager
      console.log('Initializing visualizer manager...');
      this.visualizerManager = new VisualizerManager();
      await this.visualizerManager.initialize(container, this.accessToken);
      
      // Create connector between analyzer and visualizer
      console.log('Setting up audio-visual connection...');
      this.connector = new AudioVisualizerConnector(
        this.audioAnalyzer,
        this.visualizerManager.visualizer
      );
      await this.connector.initialize();
      
      // Setup UI controls
      this.setupControls();
      
      // Start polling for track changes
      this.startTrackPolling();
      
      this.initialized = true;
      this.hideLoading();
      
      console.log('Spotify Visualizer initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Error initializing Spotify Visualizer:', error);
      this.handleError(error);
      this.hideLoading();
      return false;
    }
  }
  
  /**
   * Handle Spotify Player ready event
   * @param {Object} data - Player ready data
   */
  handlePlayerReady(data) {
    console.log('Spotify Player ready with device ID:', data.deviceId);
    
    // Update device status
    this.deviceStatus.registered = true;
    this.deviceStatus.deviceId = data.deviceId;
    
    // Update UI
    this.deviceStatusUI.setState('deviceReady');
    this.deviceStatusUI.showMessage('Device ready! Select "Spotify Visualizer" in your Spotify app to begin.', false, 'Open Spotify');
    
    // Check for current track
    this.getCurrentTrackAndVisualize();
  }
  
  /**
   * Handle player initialization complete
   * @param {Object} data - Initialization data
   */
  handlePlayerInitialized(data) {
    console.log('Spotify Player initialization complete:', data);
    
    // Update device status
    this.deviceStatus.isPremium = data.isPremium;
    
    // Check if Premium is required but not available
    if (!data.isPremium) {
      this.deviceStatusUI.setState('premiumRequired');
      
      // Show Premium requirement error
      const error = new Error('Spotify Premium is required for full functionality of this visualizer. Some features will be limited.');
      error.isPremiumError = true;
      error.isFatal = false; // Allow continued use with limited features
      
      this.handleError(error);
      
      console.warn('Non-Premium account detected: Some features like audio analysis and detailed visualization will use fallback data.');
      
      // Display info message after a slight delay
      setTimeout(() => {
        this.showMessage('Non-Premium account: Using fallback audio data. Some visualizations may not sync perfectly with music.', false, 8000);
      }, 3000);
      
      // Continue initialization, but with limited features
      return;
    }
  }
  
  /**
   * Handle player state changes
   * @param {Object} data - Player state data
   */
  handlePlayerStateChanged(data) {
    // Update device status
    this.deviceStatus.active = data.isActive;
    this.deviceStatus.playing = data.isPlaying;
    
    // Update UI based on state
    if (data.isActive) {
      if (data.isPlaying) {
        // Track is playing, hide device status overlay
        this.deviceStatusUI.setState('playing');
        
        // Update visualization with track data
        if (data.trackId !== this.trackId && data.track) {
          this.handleTrackChange(data.track);
        }
      } else {
        // Track is paused
        this.deviceStatusUI.setState('deviceReady');
        this.deviceStatusUI.showMessage('Playback paused. Press play in Spotify to continue.', false, 'Open Spotify');
      }
    } else {
      // Not active
      this.deviceStatusUI.setState('noTrackPlaying');
    }
  }
  
  /**
   * Handle status UI action button click
   * @param {string} state - Current UI state
   */
  handleStatusUIAction(state) {
    switch (state) {
      case 'deviceReady':
      case 'noTrackPlaying':
        // Open Spotify
        this.deviceStatusUI.openSpotify();
        break;
        
      case 'error':
        // Try again - refresh the page
        window.location.reload();
        break;
        
      case 'premiumRequired':
        // Open Spotify Premium page
        window.open('https://www.spotify.com/premium/', '_blank');
        break;
        
      default:
        // Default action - open Spotify
        this.deviceStatusUI.openSpotify();
    }
  }
  
  /**
   * Show loading spinner
   */
  showLoading() {
    if (this.loadingSpinner) return;
    
    this.loadingSpinner = document.createElement('div');
    this.loadingSpinner.className = 'loading-spinner';
    document.body.appendChild(this.loadingSpinner);
  }
  
  /**
   * Hide loading spinner
   */
  hideLoading() {
    if (this.loadingSpinner && document.body.contains(this.loadingSpinner)) {
      document.body.removeChild(this.loadingSpinner);
      this.loadingSpinner = null;
    }
  }
  
  /**
   * Setup UI controls for the visualizer
   */
  setupControls() {
    // Create visualization mode controls
    const controls = document.createElement('div');
    controls.id = 'visualization-controls';
    controls.innerHTML = `
      <div class="viz-buttons">
        ${this.visualizationModes.map(mode => 
          `<button class="viz-button ${mode === this.currentMode ? 'active' : ''}" 
           data-mode="${mode}">${mode.charAt(0).toUpperCase() + mode.slice(1)}</button>`
        ).join('')}
      </div>
    `;
    
    document.body.appendChild(controls);
    
    // Add event listeners to buttons
    const buttons = controls.querySelectorAll('.viz-button');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        // Update active state
        buttons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        // Change visualization mode
        const mode = e.target.getAttribute('data-mode');
        this.setVisualizationMode(mode);
      });
    });
    
    // Add beat indicator
    const beatIndicator = document.createElement('div');
    beatIndicator.className = 'audio-beats-indicator';
    document.body.appendChild(beatIndicator);
    
    // Update beat indicator when beat detected
    this.beatIndicator = beatIndicator;
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case '1': case '2': case '3': case '4':
          const index = parseInt(e.key) - 1;
          if (index >= 0 && index < this.visualizationModes.length) {
            this.setVisualizationMode(this.visualizationModes[index]);
            buttons.forEach(btn => btn.classList.remove('active'));
            buttons[index].classList.add('active');
          }
          break;
          
        case ' ': // Space bar
          this.togglePlayback();
          break;
          
        case 'ArrowRight':
          this.skipToNextTrack();
          break;
          
        case 'ArrowLeft':
          this.skipToPreviousTrack();
          break;
      }
    });
  }
  
  /**
   * Get current track and start visualization
   * @returns {Promise<boolean>} - Success status
   */
  async getCurrentTrackAndVisualize() {
    try {
      // Get currently playing track from Spotify API
      const trackData = await getCurrentlyPlayingTrack(this.accessToken);
      
      if (!trackData || !trackData.item) {
        console.warn('No track currently playing');
        this.deviceStatusUI.setState('noTrackPlaying');
        return false;
      }
      
      // Process track info
      await this.handleTrackChange(trackData);
      
      // Track is playing, hide device status overlay
      this.deviceStatusUI.setState('playing');
      
      return true;
    } catch (error) {
      console.error('Error getting current track:', error);
      this.deviceStatusUI.showMessage('Could not get currently playing track. Please try again.', true, 'Try Again');
      return false;
    }
  }
  
  /**
   * Handle track change event
   * @param {Object} trackData - Track data from Spotify API
   * @returns {Promise<boolean>} - Success status
   */
  async handleTrackChange(trackData) {
    try {
      // Extract track info
      const track = trackData.item;
      const trackId = track.id;
      const isPlaying = trackData.is_playing;
      
      // Update UI with track info
      renderTrackInfo(trackData);
      
      // Skip processing if same track is still playing
      if (trackId === this.trackId) {
        return true;
      }
      
      console.log(`Track changed: ${track.name} by ${track.artists[0].name}`);
      
      // Update current track ID
      this.trackId = trackId;
      
      // Update album cover in visualizer
      if (this.visualizerManager && track.album && track.album.images && track.album.images.length > 0) {
        const albumImageUrl = track.album.images[0].url;
        this.visualizerManager.visualizer.updateAlbumCover(albumImageUrl);
      }
      
      // Get audio features for track
      const features = await getAudioFeatures(trackId, this.accessToken);
      
      // Get detailed audio analysis
      const analysis = await getAudioAnalysis(trackId, this.accessToken);
      
      // Update audio analyzer with Spotify data
      if (this.audioAnalyzer && features && analysis) {
        this.audioAnalyzer.setSpotifyAnalysis(analysis, features);
        this.audioAnalyzer.setTrackStartTime();
        
        // Update beat detection settings based on track features
        if (this.connector) {
          this.connector.updateBeatDetectionSettings({
            // Adjust threshold based on track energy and danceability
            threshold: 0.2 - (features.energy * 0.05),
            decay: 0.05 + (features.tempo / 1000),
            // Faster minimum time for higher BPM tracks
            minimumTime: Math.max(0.1, 0.25 - (features.tempo / 1000))
          });
        }
      } else {
        console.warn('Could not get audio analysis for track');
      }
      
      // Show track change message
      this.showMessage(`Now playing: ${track.name} by ${track.artists[0].name}`);
      
      return true;
    } catch (error) {
      console.error('Error handling track change:', error);
      return false;
    }
  }
  
  /**
   * Start polling for track changes
   */
  startTrackPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    
    this.pollInterval = setInterval(this.pollForTrackChanges, this.pollFrequency);
  }
  
  /**
   * Stop polling for track changes
   */
  stopTrackPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
  
  /**
   * Poll for track changes
   */
  async pollForTrackChanges() {
    try {
      // Skip if not initialized
      if (!this.initialized || !this.accessToken) return;
      
      // If device is not active or registered, check status
      if (!this.deviceStatus.active || !this.deviceStatus.registered) {
        const playerStatus = this.spotifyPlayer.getStatus();
        
        // If player reports being active but our status doesn't reflect that, update status
        if (playerStatus.isActive && !this.deviceStatus.active) {
          this.deviceStatus.active = true;
          this.deviceStatus.playing = playerStatus.isPlaying;
          
          if (playerStatus.isPlaying) {
            // Device is now active and playing, hide device status overlay
            this.deviceStatusUI.setState('playing');
          }
        }
      }
      
      // Get currently playing track
      const trackData = await getCurrentlyPlayingTrack(this.accessToken);
      
      // Process track data if available
      if (trackData && trackData.item) {
        await this.handleTrackChange(trackData);
        
        // Update beat indicator based on audio analyzer data
        this.updateBeatIndicator();
        
        // If track is playing, make sure UI is updated
        if (trackData.is_playing) {
          this.deviceStatusUI.setState('playing');
        }
      } else {
        // No track playing, update UI
        this.deviceStatusUI.setState('noTrackPlaying');
      }
    } catch (error) {
      console.error('Error polling for track changes:', error);
      // Don't show error to user for polling errors
    }
  }
  
  /**
   * Update beat indicator based on audio analyzer
   */
  updateBeatIndicator() {
    if (!this.beatIndicator || !this.audioAnalyzer) return;
    
    // Get beat detection state
    const beatDetected = this.audioAnalyzer.beatDetected;
    
    // Update indicator
    if (beatDetected) {
      this.beatIndicator.classList.add('active');
      
      // Remove active class after a short delay
      setTimeout(() => {
        this.beatIndicator.classList.remove('active');
      }, 100);
    }
  }
  
  /**
   * Update visualization
   */
  updateVisualization() {
    // This method is called by the animation loop to update visualization
    if (!this.visualizerManager || !this.audioAnalyzer) {
      return;
    }
    
    // Get audio data from analyzer
    const audioData = this.audioAnalyzer.update();
    
    // Update visualizer with audio data
    if (audioData) {
      this.visualizerManager.updateAudioData(audioData);
    }
  }
  
  /**
   * Set visualization mode
   * @param {string} mode - Visualization mode
   */
  setVisualizationMode(mode) {
    if (!this.visualizationModes.includes(mode)) {
      console.warn(`Unknown visualization mode: ${mode}`);
      return;
    }
    
    this.currentMode = mode;
    
    // Update visualizer
    if (this.visualizerManager) {
      this.visualizerManager.setVisualizationMode(mode);
    }
    
    console.log(`Visualization mode changed to: ${mode}`);
  }
  
  /**
   * Toggle playback (play/pause)
   */
  async togglePlayback() {
    try {
      if (this.spotifyPlayer) {
        const result = await this.spotifyPlayer.togglePlay();
        console.log(`Playback ${result ? 'toggled' : 'toggle failed'}`);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      this.showMessage('Could not control playback', true);
    }
  }
  
  /**
   * Skip to next track
   */
  async skipToNextTrack() {
    try {
      if (this.spotifyPlayer) {
        const result = await this.spotifyPlayer.nextTrack();
        console.log(`Skip to next ${result ? 'succeeded' : 'failed'}`);
      }
    } catch (error) {
      console.error('Error skipping to next track:', error);
      this.showMessage('Could not skip to next track', true);
    }
  }
  
  /**
   * Skip to previous track
   */
  async skipToPreviousTrack() {
    try {
      if (this.spotifyPlayer) {
        const result = await this.spotifyPlayer.previousTrack();
        console.log(`Skip to previous ${result ? 'succeeded' : 'failed'}`);
      }
    } catch (error) {
      console.error('Error skipping to previous track:', error);
      this.showMessage('Could not skip to previous track', true);
    }
  }
  
  /**
   * Show message notification
   * @param {string} message - Message to display
   * @param {boolean} isError - Whether it's an error message
   * @param {number} duration - How long to show message (ms)
   */
  showMessage(message, isError = false, duration = 3000) {
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
   * Handle error
   * @param {Error} error - Error object
   */
  handleError(error) {
    console.error('Spotify Visualizer error:', error);
    
    let message = 'An error occurred. Please try again.';
    let state = 'error';
    
    // Try to get more specific error message
    if (error.message) {
      if (error.message.includes('authentication') || error.message.includes('token')) {
        message = 'Authentication failed. Please login again.';
      } else if (error.message.includes('premium') || error.message.includes('subscription')) {
        message = 'Spotify Premium is required for this feature.';
        state = 'premiumRequired';
      } else if (error.message.includes('WebGL') || error.message.includes('graphics')) {
        message = 'Your browser does not support WebGL, which is required for this application.';
      } else {
        message = error.message;
      }
    }
    
    // Show error in device status UI
    this.deviceStatusUI.setState(state, {
      message: message
    });
    
    // Show error in overlay for severe errors
    if (this.errorOverlay && (state === 'premiumRequired' || message.includes('WebGL'))) {
      this.errorOverlay.show(message);
    } else {
      this.showMessage(message, true, 5000);
    }
  }
  
  /**
   * Clean up and dispose resources
   */
  dispose() {
    // Stop polling
    this.stopTrackPolling();
    
    // Dispose components
    if (this.connector) {
      this.connector.dispose();
    }
    
    if (this.visualizerManager) {
      this.visualizerManager.dispose();
    }
    
    if (this.audioAnalyzer) {
      this.audioAnalyzer.dispose();
    }
    
    if (this.spotifyPlayer) {
      this.spotifyPlayer.dispose();
    }
    
    if (this.deviceStatusUI) {
      this.deviceStatusUI.dispose();
    }
    
    // Remove UI elements
    const controls = document.getElementById('visualization-controls');
    if (controls && document.body.contains(controls)) {
      document.body.removeChild(controls);
    }
    
    if (this.beatIndicator && document.body.contains(this.beatIndicator)) {
      document.body.removeChild(this.beatIndicator);
    }
    
    console.log('Spotify Visualizer disposed');
  }
}
