// Manages the Spotify playback state and handles error recovery

export class PlaybackStateManager {
    constructor(accessToken) {
      this.accessToken = accessToken;
      this.player = null;
      this.deviceId = null;
      
      // State machine
      this.currentState = 'idle'; // idle, connecting, ready, playing, paused, error, recovering
      this.stateTransitions = {
        idle: ['connecting', 'error'],
        connecting: ['ready', 'error'],
        ready: ['playing', 'paused', 'error'],
        playing: ['paused', 'error', 'recovering'],
        paused: ['playing', 'error', 'recovering'],
        error: ['idle', 'connecting', 'recovering'],
        recovering: ['ready', 'playing', 'paused', 'error']
      };
      
      // Event callbacks
      this.callbacks = {
        onStateChange: null,
        onTrackChange: null,
        onError: null,
        onReady: null
      };
      
      // Track info
      this.currentTrackId = null;
      this.currentTrackInfo = null;
      this.isPlaying = false;
    }
    
    setState(newState) {
      if (!this.stateTransitions[this.currentState].includes(newState)) {
        console.error(`Invalid state transition from ${this.currentState} to ${newState}`);
        return false;
      }
      
      const prevState = this.currentState;
      this.currentState = newState;
      
      console.log(`Playback state changed: ${prevState} -> ${newState}`);
      
      if (this.callbacks.onStateChange) {
        this.callbacks.onStateChange(newState, prevState);
      }
      
      return true;
    }
    
    setCallbacks(callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    async initialize() {
      if (this.currentState !== 'idle') {
        console.warn('Player is already initialized or initializing');
        return false;
      }
      
      this.setState('connecting');
      
      try {
        // Wait for Spotify SDK to load
        await this.waitForSpotifySDK();
        
        // Create player
        this.player = new Spotify.Player({
          name: 'Web Visualizer Player',
          getOAuthToken: cb => cb(this.accessToken),
          volume: 0.8
        });
        
        // Set up event listeners
        this.setupPlayerEvents();
        
        // Connect player
        const connected = await this.player.connect();
        
        if (!connected) {
          throw new Error('Failed to connect Spotify player');
        }
        
        return true;
      } catch (error) {
        console.error('Error initializing Spotify player:', error);
        this.setState('error');
        
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
        
        return false;
      }
    }
    
    setupPlayerEvents() {
        if (!this.player) return;
        
        // Ready event
        this.player.addListener('ready', ({ device_id }) => {
          console.log('Player ready with device ID', device_id);
          this.deviceId = device_id;
          this.setState('ready');
          
          if (this.callbacks.onReady) {
            this.callbacks.onReady(device_id);
          }
        });
        
        // Not ready event
        this.player.addListener('not_ready', ({ device_id }) => {
          console.log('Player has gone offline', device_id);
          
          // Try to recover by reconnecting
          this.recoverPlayback();
        });
        
        // Player state changed event
        this.player.addListener('player_state_changed', (state) => {
          if (!state) {
            console.warn('Received empty player state');
            this.isPlaying = false;
            return;
          }
          
          // Update play state
          this.isPlaying = !state.paused;
          
          if (this.isPlaying) {
            this.setState('playing');
          } else {
            this.setState('paused');
          }
          
          // Check for track change
          if (state.track_window && state.track_window.current_track) {
            const track = state.track_window.current_track;
            
            if (!this.currentTrackId || track.id !== this.currentTrackId) {
              this.currentTrackId = track.id;
              this.currentTrackInfo = this.formatTrackInfo(track);
              
              if (this.callbacks.onTrackChange) {
                this.callbacks.onTrackChange(this.currentTrackInfo);
              }
            }
          }
        });
        
        // Error handling
        this.player.addListener('initialization_error', ({ message }) => {
          console.error('Failed to initialize player:', message);
          this.setState('error');
          
          if (this.callbacks.onError) {
            this.callbacks.onError(new Error(`Initialization error: ${message}`));
          }
        });
        
        this.player.addListener('authentication_error', ({ message }) => {
          console.error('Failed to authenticate:', message);
          this.setState('error');
          
          if (this.callbacks.onError) {
            this.callbacks.onError(new Error(`Authentication error: ${message}`));
          }
        });
        
        this.player.addListener('account_error', ({ message }) => {
          console.error('Account error:', message);
          this.setState('error');
          
          if (this.callbacks.onError) {
            this.callbacks.onError(new Error(`Account error: ${message} (Spotify Premium required)`));
          }
        });
        
        this.player.addListener('playback_error', ({ message }) => {
          console.error('Playback error:', message);
          
          // Don't go directly to error state, try to recover
          this.setState('recovering');
          this.recoverPlayback();
        });
      }
      
      formatTrackInfo(track) {
        // Format track data to match our internal structure
        return {
          item: {
            name: track.name,
            artists: track.artists.map(artist => ({ name: artist.name })),
            album: {
              name: track.album.name,
              images: track.album.images
            },
            id: track.id
          },
          is_playing: this.isPlaying
        };
      }
      
      async waitForSpotifySDK() {
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
      
      async transferPlaybackToThisDevice(play = true) {
        if (!this.deviceId) {
          console.error('No device ID available');
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
              play
            })
          });
          
          if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to transfer playback: ${response.status}`);
          }
          
          return true;
        } catch (error) {
          console.error('Error transferring playback:', error);
          return false;
        }
      }
      
      async togglePlayback() {
        if (!this.player) {
          console.error('Player not initialized');
          return false;
        }
        
        try {
          if (this.isPlaying) {
            await this.player.pause();
            this.setState('paused');
          } else {
            await this.player.resume();
            this.setState('playing');
          }
          
          this.isPlaying = !this.isPlaying;
          return true;
        } catch (error) {
          console.error('Error toggling playback:', error);
          return false;
        }
      }
      
      async nextTrack() {
        if (!this.player) {
          console.error('Player not initialized');
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
      
      async previousTrack() {
        if (!this.player) {
          console.error('Player not initialized');
          return false;
        }
        
        try {
          await this.player.previousTrack();
          return true;
        } catch (error) {
          console.error('Error going to previous track:', error);
          return false;
        }
      }
      
      async recoverPlayback() {
        console.log('Attempting to recover playback...');
        this.setState('recovering');
        
        try {
          // Disconnect and reconnect player
          await this.player.disconnect();
          
          // Small delay to allow disconnection to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Reconnect player
          const connected = await this.player.connect();
          
          if (!connected) {
            throw new Error('Failed to reconnect player');
          }
          
          // When reconnected, onReady will be called with new device ID
          return true;
        } catch (error) {
          console.error('Failed to recover playback:', error);
          this.setState('error');
          
          if (this.callbacks.onError) {
            this.callbacks.onError(new Error(`Recovery failed: ${error.message}`));
          }
          
          return false;
        }
      }
      
      disconnect() {
        if (this.player) {
          this.player.disconnect();
        }
        
        this.setState('idle');
      }
    }