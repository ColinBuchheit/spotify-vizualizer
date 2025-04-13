// DeviceStatusUI.js - Enhanced UI for Spotify device connection status

/**
 * Class to create and manage device status UI elements
 */
export class DeviceStatusUI {
    constructor() {
      this.elements = {
        container: null,
        statusOverlay: null,
        deviceStatus: null,
        deviceName: null,
        statusMessage: null,
        actionButton: null,
        loadingIndicator: null
      };
      
      this.states = {
        initializing: {
          message: 'Connecting to Spotify...',
          buttonText: null,
          overlayVisible: true,
          loadingVisible: true
        },
        notRegistered: {
          message: 'Registering as a Spotify device...',
          buttonText: null,
          overlayVisible: true,
          loadingVisible: true
        },
        deviceReady: {
          message: 'Device ready! Play music from your Spotify account.',
          buttonText: 'Open Spotify',
          overlayVisible: true,
          loadingVisible: false
        },
        noTrackPlaying: {
          message: 'No track currently playing. Start playback in Spotify.',
          buttonText: 'Open Spotify',
          overlayVisible: true,
          loadingVisible: false
        },
        playing: {
          message: null,
          buttonText: null,
          overlayVisible: false,
          loadingVisible: false
        },
        error: {
          message: 'Error connecting to Spotify.',
          buttonText: 'Try Again',
          overlayVisible: true,
          loadingVisible: false
        },
        premiumRequired: {
          message: 'Spotify Premium subscription required for this feature.',
          buttonText: 'Learn More',
          overlayVisible: true,
          loadingVisible: false
        }
      };
      
      this.currentState = 'initializing';
      this.onActionButtonClick = null;
    }
    
    /**
     * Initialize and create UI elements
     * @param {HTMLElement} container - Container element
     * @param {Function} actionCallback - Callback for action button
     * @returns {void}
     */
    initialize(container, actionCallback) {
      this.elements.container = container;
      this.onActionButtonClick = actionCallback;
      
      // Create status overlay
      this.createStatusOverlay();
      
      // Set initial state
      this.setState('initializing');
    }
    
    /**
     * Create the status overlay UI
     */
    createStatusOverlay() {
      // Create overlay
      const statusOverlay = document.createElement('div');
      statusOverlay.className = 'device-status-overlay';
      statusOverlay.innerHTML = `
        <div class="device-status-container">
          <div class="device-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v8H2z"></path>
              <path d="M6 12h.01"></path>
              <path d="M10 12h.01"></path>
            </svg>
          </div>
          <div class="device-name">Spotify Visualizer</div>
          <div class="device-status">Initializing...</div>
          <div class="loading-indicator">
            <div class="loading-spinner"></div>
          </div>
          <div class="action-button-container">
            <button class="action-button">Open Spotify</button>
          </div>
          <div class="help-text">
            <p>Having trouble? Make sure you're using Spotify Premium and that you've selected this device in your Spotify app.</p>
            <p class="keyboard-shortcuts">
              Keyboard shortcuts: <span>Space</span> (play/pause), <span>→</span> (next track), <span>←</span> (previous track)
            </p>
          </div>
        </div>
      `;
      
      // Store element references
      this.elements.statusOverlay = statusOverlay;
      this.elements.deviceName = statusOverlay.querySelector('.device-name');
      this.elements.deviceStatus = statusOverlay.querySelector('.device-status');
      this.elements.loadingIndicator = statusOverlay.querySelector('.loading-indicator');
      this.elements.actionButton = statusOverlay.querySelector('.action-button');
      
      // Add event listener to action button
      if (this.elements.actionButton) {
        this.elements.actionButton.addEventListener('click', () => {
          if (this.onActionButtonClick) {
            this.onActionButtonClick(this.currentState);
          } else {
            // Default action: open Spotify
            this.openSpotify();
          }
        });
      }
      
      // Add to container
      this.elements.container.appendChild(statusOverlay);
      
      // Add styles
      this.addStyles();
    }
    
    /**
     * Add CSS styles
     */
    addStyles() {
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .device-status-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.85);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(10px);
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        
        .device-status-overlay.visible {
          opacity: 1;
        }
        
        .device-status-container {
          background-color: rgba(40, 40, 40, 0.8);
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 90%;
          text-align: center;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .device-icon {
          width: 80px;
          height: 80px;
          background-color: #1DB954;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 10px;
          box-shadow: 0 6px 20px rgba(29, 185, 84, 0.4);
        }
        
        .device-icon svg {
          color: white;
          width: 40px;
          height: 40px;
        }
        
        .device-name {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .device-status {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 20px;
        }
        
        .loading-indicator {
          margin: 15px 0;
          display: flex;
          justify-content: center;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(29, 185, 84, 0.3);
          border-radius: 50%;
          border-top-color: #1DB954;
          animation: spin 1s ease-in-out infinite;
        }
        
        .action-button-container {
          margin-top: 10px;
        }
        
        .action-button {
          background-color: #1DB954;
          color: white;
          border: none;
          border-radius: 30px;
          padding: 12px 30px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 15px rgba(29, 185, 84, 0.3);
        }
        
        .action-button:hover {
          background-color: #1ed760;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(29, 185, 84, 0.4);
        }
        
        .action-button:active {
          transform: translateY(1px);
        }
        
        .help-text {
          margin-top: 20px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          max-width: 400px;
          line-height: 1.6;
        }
        
        .keyboard-shortcuts {
          margin-top: 15px;
          font-size: 13px;
        }
        
        .keyboard-shortcuts span {
          background-color: rgba(255, 255, 255, 0.1);
          padding: 3px 8px;
          border-radius: 4px;
          margin: 0 2px;
          font-family: monospace;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        
        @media (max-width: 600px) {
          .device-status-container {
            padding: 30px 20px;
          }
          
          .device-icon {
            width: 60px;
            height: 60px;
          }
          
          .device-name {
            font-size: 20px;
          }
          
          .device-status {
            font-size: 16px;
          }
        }
      `;
      
      document.head.appendChild(styleElement);
    }
    
    /**
     * Set device name
     * @param {string} name - Device name
     */
    setDeviceName(name) {
      if (this.elements.deviceName) {
        this.elements.deviceName.textContent = name;
      }
    }
    
    /**
     * Set the current state of the UI
     * @param {string} state - State key
     * @param {Object} customData - Optional custom data for the state
     */
    setState(state, customData = {}) {
      if (!this.states[state]) {
        console.warn(`Unknown state: ${state}`);
        return;
      }
      
      this.currentState = state;
      const stateConfig = this.states[state];
      
      // Update status message
      if (this.elements.deviceStatus) {
        this.elements.deviceStatus.textContent = customData.message || stateConfig.message || '';
      }
      
      // Update button
      if (this.elements.actionButton) {
        const buttonText = customData.buttonText || stateConfig.buttonText;
        if (buttonText) {
          this.elements.actionButton.textContent = buttonText;
          this.elements.actionButton.style.display = 'block';
        } else {
          this.elements.actionButton.style.display = 'none';
        }
      }
      
      // Update loading indicator
      if (this.elements.loadingIndicator) {
        this.elements.loadingIndicator.style.display = 
          customData.loadingVisible !== undefined ? 
            (customData.loadingVisible ? 'flex' : 'none') : 
            (stateConfig.loadingVisible ? 'flex' : 'none');
      }
      
      // Update overlay visibility
      if (this.elements.statusOverlay) {
        if (customData.overlayVisible !== undefined ? customData.overlayVisible : stateConfig.overlayVisible) {
          this.elements.statusOverlay.classList.add('visible');
        } else {
          this.elements.statusOverlay.classList.remove('visible');
        }
      }
    }
    
    /**
     * Show a custom message
     * @param {string} message - Message to display
     * @param {boolean} isError - Whether it's an error message
     * @param {string} buttonText - Optional button text
     * @param {boolean} showLoading - Whether to show loading indicator
     */
    showMessage(message, isError = false, buttonText = null, showLoading = false) {
      const state = isError ? 'error' : 'deviceReady';
      
      this.setState(state, {
        message: message,
        buttonText: buttonText,
        overlayVisible: true,
        loadingVisible: showLoading
      });
    }
    
    /**
     * Show an error message
     * @param {string} message - Error message
     * @param {string} buttonText - Button text (optional)
     */
    showError(message, buttonText = 'Try Again') {
      this.showMessage(message, true, buttonText, false);
    }
    
    /**
     * Hide the status overlay
     */
    hide() {
      if (this.elements.statusOverlay) {
        this.elements.statusOverlay.classList.remove('visible');
      }
    }
    
    /**
     * Show the status overlay
     */
    show() {
      if (this.elements.statusOverlay) {
        this.elements.statusOverlay.classList.add('visible');
      }
    }
    
    /**
     * Open Spotify web player or app
     */
    openSpotify() {
      // Try to open Spotify app first, fallback to web player
      const spotifyAppUrl = 'spotify:';
      const spotifyWebUrl = 'https://open.spotify.com';
      
      // Try to open Spotify app
      window.location.href = spotifyAppUrl;
      
      // Fallback to web player after a short delay
      setTimeout(() => {
        window.open(spotifyWebUrl, '_blank');
      }, 500);
    }
    
    /**
     * Clean up resources
     */
    dispose() {
      // Remove event listeners
      if (this.elements.actionButton) {
        this.elements.actionButton.removeEventListener('click', this.onActionButtonClick);
      }
      
      // Remove elements
      if (this.elements.statusOverlay && this.elements.container.contains(this.elements.statusOverlay)) {
        this.elements.container.removeChild(this.elements.statusOverlay);
      }
    }
  }