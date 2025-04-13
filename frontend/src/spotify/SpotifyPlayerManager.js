// SpotifyPlayerManager.js - Handles Spotify Web Playback SDK and device registration

/**
 * Class to manage Spotify Web Playback SDK and device registration
 */
export class SpotifyPlayerManager {
    constructor(accessToken) {
      this.accessToken = accessToken;
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
      this.isPremium = false;
      this.isActive = false;
      this.isPlaying = false;
      this.currentTrackId = null;
      
      // Event callbacks
      this.callbacks = {
        onReady: null,
        onPlayerStateChanged: null,
        onError: null,
        onNotReady: null,
        onTrackChange: null,
        onInitializationComplete: null
      };
      
      // Player options
      this.playerOptions = {
        name: 'Spotify Visualizer',
        getOAuthToken: cb => cb(this.accessToken),
        volume: 0.8
      };
      
      // Track initialization status
      this.initializationStatus = {
        sdkLoaded: false,
        playerCreated: false,
        playerConnected: false,
        deviceRegistered: false
      };
      
      // Binding methods
      this.handlePlayerStateChanged = this.handlePlayerStateChanged.bind(this);
    }
    
    /**
     * Set event callbacks
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Initialize the Spotify player and register as a playback device
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
      try {
        console.log('Initializing Spotify Player Manager...');
        
        // First check if Spotify Web Playback SDK script is loaded
        if (!this.initializationStatus.sdkLoaded) {
          await this.loadSpotifyWebPlaybackSDK();
        }
        
        // Wait for SDK to load and be ready
        await this.waitForSpotifySDK();
        this.initializationStatus.sdkLoaded = true;
        
        // Create player instance
        this.player = new Spotify.Player(this.playerOptions);
        this.initializationStatus.playerCreated = true;
        
        // Set up event listeners
        this.setupPlayerEvents();
        
        // Connect to Spotify
        const connected = await this.player.connect();
        
        if (!connected) {
          throw new Error('Failed to connect Spotify player');
        }
        
        this.initializationStatus.playerConnected = true;
        console.log('Spotify player connected successfully');
        
        // Callback when initialization is complete (will be called after ready event)
        if (this.callbacks.onInitializationComplete) {
          setTimeout(() => {
            this.callbacks.onInitializationComplete({
              deviceId: this.deviceId,
              isReady: this.isReady,
              isPremium: this.isPremium,
              status: this.initializationStatus
            });
          }, 1000);
        }
        
        return true;
      } catch (error) {
        console.error('Error initializing Spotify Player:', error);
        
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
        
        return false;
      }
    }
    
    /**
     * Load Spotify Web Playback SDK script
     * @returns {Promise<void>}
     */
    loadSpotifyWebPlaybackSDK() {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.Spotify) {
          resolve();
          return;
        }
        
        // Check if script is already in the process of loading
        const existingScript = document.getElementById('spotify-player');
        if (existingScript) {
          existingScript.addEventListener('load', resolve);
          existingScript.addEventListener('error', reject);
          return;
        }
        
        // Create script element
        const script = document.createElement('script');
        script.id = 'spotify-player';
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        
        // Set up event listeners
        script.addEventListener('load', resolve);
        script.addEventListener('error', reject);
        
        // Add to document
        document.head.appendChild(script);
        
        // Set up global callback
        window.onSpotifyWebPlaybackSDKReady = () => {
          this.initializationStatus.sdkLoaded = true;
          resolve();
        };
      });
    }
    
    /**
     * Wait for Spotify SDK to be ready
     * @returns {Promise<void>}
     */
    waitForSpotifySDK() {
      return new Promise((resolve) => {
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
     * Set up event listeners for the Spotify player
     */
    setupPlayerEvents() {
      if (!this.player) return;
      
      // Ready event
      this.player.addListener('ready', ({ device_id }) => {
        console.log('Spotify Player ready with device ID:', device_id);
        this.deviceId = device_id;
        this.isReady = true;
        this.initializationStatus.deviceRegistered = true;
        
        // Attempt to transfer playback to this device automatically
        this.transferPlaybackToThisDevice(false); // Don't start playing automatically
        
        if (this.callbacks.onReady) {
          this.callbacks.onReady({ deviceId: device_id });
        }
      });
      
      // Not ready event
      this.player.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify Player has gone offline:', device_id);
        this.isReady = false;
        
        if (this.callbacks.onNotReady) {
          this.callbacks.onNotReady({ deviceId: device_id });
        }
      });
      
      // Player state changed
      this.player.addListener('player_state_changed', this.handlePlayerStateChanged);
      
      // Errors
      this.player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify Player initialization error:', message);
        
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(`Initialization error: ${message}`));
        }
      });
      
      this.player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify Player authentication error:', message);
        
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(`Authentication error: ${message}`));
        }
      });
      
      this.player.addListener('account_error', ({ message }) => {
        console.error('Spotify Player account error:', message);
        this.isPremium = false;
        
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(`Account error: ${message} (Spotify Premium required)`));
        }
      });
      
      this.player.addListener('playback_error', ({ message }) => {
        console.error('Spotify Player playback error:', message);
        
        if (this.callbacks.onError) {
          this.callbacks.onError(new Error(`Playback error: ${message}`));
        }
      });
    }
    
    /**
     * Handle player state changes
     * @param {Object} state - Spotify player state
     */
    handlePlayerStateChanged(state) {
      if (!state) {
        this.isActive = false;
        this.isPlaying = false;
        console.log('Playback has stopped or is inactive');
        
        if (this.callbacks.onPlayerStateChanged) {
          this.callbacks.onPlayerStateChanged({
            isActive: false,
            isPlaying: false,
            trackId: null,
            track: null
          });
        }
        return;
      }
      
      // Update state
      this.isActive = true;
      this.isPlaying = !state.paused;
      
      // Extract track info
      const currentTrack = state.track_window.current_track;
      const trackId = currentTrack?.id || null;
      
      // Check for track change
      const isNewTrack = trackId !== this.currentTrackId;
      this.currentTrackId = trackId;
      
      // Format track data
      const formattedTrack = this.formatTrackInfo(currentTrack, state);
      
      // Notify track change if needed
      if (isNewTrack && this.callbacks.onTrackChange) {
        this.callbacks.onTrackChange(formattedTrack);
      }
      
      // Notify state change
      if (this.callbacks.onPlayerStateChanged) {
        this.callbacks.onPlayerStateChanged({
          isActive: this.isActive,
          isPlaying: this.isPlaying,
          trackId: this.currentTrackId,
          track: formattedTrack,
          state: state
        });
      }
    }
    
    /**
     * Format track information from player state
     * @param {Object} track - Track data from Spotify player
     * @param {Object} state - Player state
     * @returns {Object} - Formatted track data
     */
    formatTrackInfo(track, state) {
      if (!track) return null;
      
      return {
        item: {
          id: track.id,
          name: track.name,
          duration_ms: track.duration_ms,
          artists: track.artists.map(artist => ({
            name: artist.name,
            id: artist.uri.split(':')[2]
          })),
          album: {
            name: track.album.name,
            images: track.album.images
          }
        },
        is_playing: !state.paused,
        progress_ms: state.position,
        timestamp: Date.now()
      };
    }
    
    /**
     * Transfer playback to this device
     * @param {boolean} play - Whether to start playing immediately
     * @returns {Promise<boolean>} - Success status
     */
    async transferPlaybackToThisDevice(play = true) {
      if (!this.deviceId) {
        console.warn('Cannot transfer playback - device ID not available');
        return false;
      }
      
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            device_ids: [this.deviceId],
            play: play
          })
        });
        
        // Success even if status is 204 No Content
        if (response.status === 204 || response.ok) {
          console.log('Successfully transferred playback to this device');
          return true;
        }
        
        const errorData = await response.json().catch(() => ({}));
        console.error('Error transferring playback:', errorData);
        return false;
      } catch (error) {
        console.error('Failed to transfer playback:', error);
        return false;
      }
    }
    
    /**
     * Start/resume playback
     * @returns {Promise<boolean>} - Success status
     */
    async play() {
      if (!this.player || !this.isReady) {
        return false;
      }
      
      try {
        await this.player.resume();
        return true;
      } catch (error) {
        console.error('Error starting playback:', error);
        return false;
      }
    }
    
    /**
     * Pause playback
     * @returns {Promise<boolean>} - Success status
     */
    async pause() {
      if (!this.player || !this.isReady) {
        return false;
      }
      
      try {
        await this.player.pause();
        return true;
      } catch (error) {
        console.error('Error pausing playback:', error);
        return false;
      }
    }
    
    /**
     * Skip to next track
     * @returns {Promise<boolean>} - Success status
     */
    async nextTrack() {
      if (!this.player || !this.isReady) {
        return false;
      }
      
      try {
        await this.player.nextTrack();
        return true;
      } catch (error) {
        console.error('Error skipping to next track:', error);
        return false;
      }
    }
    
    /**
     * Skip to previous track
     * @returns {Promise<boolean>} - Success status
     */
    async previousTrack() {
      if (!this.player || !this.isReady) {
        return false;
      }
      
      try {
        await this.player.previousTrack();
        return true;
      } catch (error) {
        console.error('Error skipping to previous track:', error);
        return false;
      }
    }
    
    /**
     * Toggle play/pause
     * @returns {Promise<boolean>} - Success status
     */
    async togglePlay() {
      return this.isPlaying ? this.pause() : this.play();
    }
    
    /**
     * Check if device is active and ready
     * @returns {Object} Status object
     */
    getStatus() {
      return {
        isReady: this.isReady,
        isActive: this.isActive,
        isPlaying: this.isPlaying,
        deviceId: this.deviceId,
        currentTrackId: this.currentTrackId,
        isPremium: this.isPremium
      };
    }
    
    /**
     * Disconnect the player
     */
    disconnect() {
      if (this.player) {
        this.player.disconnect();
        this.isReady = false;
        this.isActive = false;
        console.log('Spotify player disconnected');
      }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
      this.disconnect();
      
      // Remove event listeners
      if (this.player) {
        this.player.removeListener('ready');
        this.player.removeListener('not_ready');
        this.player.removeListener('player_state_changed');
        this.player.removeListener('initialization_error');
        this.player.removeListener('authentication_error');
        this.player.removeListener('account_error');
        this.player.removeListener('playback_error');
      }
      
      this.player = null;
    }
  }