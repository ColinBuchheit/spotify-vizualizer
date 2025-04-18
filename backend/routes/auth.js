// SOLUTION 1: IMPROVED AUTHENTICATION FLOW
// Update backend/routes/auth.js to ensure proper scopes and premium account detection

/**
 * Enhanced authentication with verified scopes and premium check
 * Place this in backend/routes/auth.js
 */

// Define comprehensive scopes with comments
const scope = [
  // User profile and account - basic requirements
  'user-read-private',
  'user-read-email',
  
  // Playback control - core functionality
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  
  // History and data - important for visualization context
  'user-read-recently-played',
  'user-read-playback-position',
  'user-top-read',
  
  // Library and playlists - access to user's music
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-library-modify',   // Required for fully interacting with library
  
  // These additional scopes might help with certain API access patterns
  'playlist-modify-private',
  'playlist-modify-public'
].join(' ');

// After receiving tokens, verify premium status
router.get('/verify-premium', async (req, res) => {
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(400).json({ error: 'No access token provided' });
  }
  
  try {
    // Check if user has premium account
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const user = response.data;
    const isPremium = user.product === 'premium';
    
    // Return user info along with premium status
    res.json({
      isPremium,
      user: {
        id: user.id,
        name: user.display_name,
        email: user.email,
        country: user.country
      }
    });
  } catch (error) {
    console.error('Error verifying premium status:', error);
    res.status(500).json({ error: 'Failed to verify premium status' });
  }
});

// SOLUTION 2: ROBUST WEB PLAYBACK SDK INITIALIZATION
// Enhanced player setup with retries and proper error handling
// Update in frontend/src/three/utils/Visualizer.js

/**
 * Enhanced Spotify Player initialization with fallbacks and retries
 */
async function setupSpotifyPlayer(accessToken) {
  // First verify premium status
  let isPremium = false;
  try {
    const response = await fetch(`/auth/verify-premium?access_token=${accessToken}`);
    const data = await response.json();
    isPremium = data.isPremium;
    
    if (!isPremium) {
      showMessage('Spotify Premium is required for full visualization features.', 8000);
      // Continue anyway - we'll have fallbacks
    }
  } catch (error) {
    console.warn('Could not verify premium status:', error);
    // Continue with initialization assuming it might work
  }

  // Wait with timeout for SDK to be fully loaded
  try {
    await Promise.race([
      waitForSpotifySDK(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('SDK load timeout')), 10000))
    ]);
  } catch (error) {
    console.error('Error waiting for Spotify SDK:', error);
    showError('Spotify playback SDK failed to load. Please check your internet connection and try again.');
    return null;
  }
  
  // Create player with retries
  let playerInitAttempts = 0;
  const maxInitAttempts = 3;
  
  while (playerInitAttempts < maxInitAttempts) {
    try {
      player = new Spotify.Player({
        name: 'Spotify 3D Visualizer',
        getOAuthToken: cb => {
          console.log('Token requested by SDK');
          // Always provide fresh token
          refreshAccessToken()
            .then(newToken => cb(newToken || accessToken))
            .catch(() => cb(accessToken));
        },
        volume: 0.5
      });
      
      break; // Successfully created player
    } catch (error) {
      console.warn(`Player creation attempt ${playerInitAttempts + 1} failed:`, error);
      playerInitAttempts++;
      if (playerInitAttempts >= maxInitAttempts) {
        throw new Error('Failed to create Spotify player after multiple attempts');
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Set up enhanced error handlers with better messages
  player.addListener('initialization_error', ({ message }) => {
    console.error('Player initialization error:', message);
    
    // Categorize errors for better user guidance
    if (message.includes('premium')) {
      showError('Spotify Premium is required for playback. Please upgrade your account.');
    } else if (message.includes('offline') || message.includes('network')) {
      showError('Network error connecting to Spotify. Check your internet connection.');
    } else if (!message.includes('robustness') && !message.includes('404')) {
      // Ignore certain non-critical errors
      showError(`Spotify player initialization error: ${message}`);
    }
  });
  
  // Add backoff retry for connect
  let connectAttempts = 0;
  const maxConnectAttempts = 3;
  let connected = false;
  
  while (!connected && connectAttempts < maxConnectAttempts) {
    try {
      // Add timeout to player.connect call
      connected = await Promise.race([
        player.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connect timeout')), 8000)
        )
      ]);
      
      if (!connected) {
        throw new Error('Connect returned false');
      }
    } catch (error) {
      console.warn(`Connect attempt ${connectAttempts + 1} failed:`, error);
      connectAttempts++;
      
      if (connectAttempts >= maxConnectAttempts) {
        throw new Error('Failed to connect to Spotify after multiple attempts');
      }
      
      // Exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, connectAttempts), 8000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  return player;
}

// SOLUTION 3: AUDIO ANALYSIS WITH CACHING AND FALLBACKS
// Place in frontend/src/spotify/spotifyAPI.js

/**
 * Track analysis cache to reduce API calls and handle 403 errors
 */
const analysisCache = new Map();
const featuresCache = new Map();

/**
 * Get audio analysis with caching and robust error handling
 */
export async function getAudioAnalysis(trackId, accessToken) {
  if (!trackId) {
    console.error('No track ID provided for audio analysis');
    return null;
  }

  // Check cache first
  if (analysisCache.has(trackId)) {
    return analysisCache.get(trackId);
  }
    
  try {
    const response = await spotifyAxios.get(`/audio-analysis/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 8000 // Add timeout to prevent hanging requests
    });

    // Cache the successful response
    analysisCache.set(trackId, response.data);
    return response.data;
  } catch (error) {
    console.error('Audio analysis error details:', {
      status: error.response?.status,
      message: error.response?.data?.error?.message,
      trackId
    });
    
    // Special handling for 403 errors
    if (error.response && error.response.status === 403) {
      console.log('Audio analysis access forbidden for this track. Using fallback values.');
      
      // Check for specific error details
      const errorMsg = error.response.data?.error?.message || '';
      if (errorMsg.toLowerCase().includes('premium')) {
        showMessage('Full audio analysis requires Spotify Premium.');
      }
      
      // Return null so the calling code can use fallback values
      return null;
    }
    
    // For 429 Too Many Requests - implement backoff
    if (error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 3;
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
      // Could implement retry logic here
    }
    
    return null;
  }
}

/**
 * Get audio features with improved error handling
 */
export async function getAudioFeatures(trackId, accessToken) {
  if (!trackId) {
    console.error('No track ID provided for audio features');
    return getDefaultAudioFeatures();
  }
  
  // Check cache first
  if (featuresCache.has(trackId)) {
    return featuresCache.get(trackId);
  }
  
  try {
    const response = await spotifyAxios.get(`/audio-features/${trackId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 5000 // Add timeout
    });

    // Cache successful response
    featuresCache.set(trackId, response.data);
    return response.data;
  } catch (error) {
    // Log detailed error for debugging
    console.error('Audio features error details:', {
      status: error.response?.status,
      message: error.response?.data?.error?.message,
      trackId
    });
    
    // Handle 403 Forbidden with improved messaging
    if (error.response && error.response.status === 403) {
      const errorMsg = error.response.data?.error?.message || '';
      if (errorMsg.toLowerCase().includes('premium')) {
        console.warn('Premium account required for audio features access');
      } else {
        console.log('Audio features access forbidden for this track. Using default values.');
      }
      return getDefaultAudioFeatures();
    }
    
    // Return default features for any error
    console.log('Error fetching audio features. Returning default values.');
    return getDefaultAudioFeatures();
  }
}

// SOLUTION 4: SYNCHRONIZED FALLBACK DATA GENERATION
// Place in frontend/src/audio/AudioAnalyzer.js

/**
 * Enhanced synthetic data generation that better matches actual audio profiles
 * Much more sophisticated fallback system when APIs fail
 */
class AudioAnalyzer {
  // ... existing code ...

  /**
   * Generate high-quality synthetic data based on available track metadata
   * This provides a much better fallback when API access fails
   * @param {number} time - Current animation time in seconds
   * @param {Object} trackInfo - Any available track metadata (optional)
   */
  generateSophisticatedFallback(time, trackInfo = null) {
    // Extract any available track properties or use defaults
    const energy = trackInfo?.energy || this.energy || 0.5;
    const tempo = trackInfo?.tempo || this.tempo || 120;
    const danceability = trackInfo?.danceability || this.danceability || 0.5;
    const valence = trackInfo?.valence || this.valence || 0.5;
    
    // Beat detection with realistic timing
    const beatInterval = 60 / tempo; // beats per second
    const beatOffset = this.lastBeatTime % beatInterval; // maintain phase
    
    // Create more realistic beat patterns based on danceability
    let shouldTriggerBeat = false;
    
    if (time - this.lastBeatTime >= beatInterval) {
      // More danceable tracks have more consistent beats
      const randomFactor = 1 - (danceability * 0.5); // 0.5-1.0 range
      const randomVariation = (Math.random() * 2 - 1) * randomFactor * 0.1;
      
      // Beat with some natural variation
      if (time - this.lastBeatTime >= beatInterval + randomVariation) {
        shouldTriggerBeat = true;
      }
    }
    
    if (shouldTriggerBeat) {
      // Trigger beat with appropriate intensity
      this.beatDetected = true;
      
      // Higher energy and danceability = stronger beats
      this.beatIntensity = 0.4 + (energy * 0.3) + (danceability * 0.3);
      
      // Sometimes add accent beats based on music style
      if (Math.random() < danceability * 0.3) {
        this.beatIntensity *= 1.3; // Occasional stronger beats
      }
      
      this.lastBeatTime = time;
      
      // Call beat callback with confidence proportional to danceability
      if (this.onBeat) {
        this.onBeat({
          time,
          intensity: this.beatIntensity,
          confidence: 0.6 + (danceability * 0.4)
        });
      }
    } else {
      this.beatDetected = false;
    }
    
    // Generate frequency profiles with musical patterns
    const beatProgress = (time - this.lastBeatTime) / beatInterval;
    
    // Base volume with natural fade characteristic of music
    const fadeShape = Math.pow(1 - beatProgress, 0.5); // Non-linear fade
    this.volume = Math.max(0.2, energy * (0.6 + 0.4 * fadeShape));
    
    // Bass frequencies - strong on beat, fades faster for low energy tracks
    const bassFade = Math.pow(1 - beatProgress, energy * 0.5 + 0.5);
    this.bass = Math.max(0.2, energy * (
      0.6 * bassFade + 
      0.4 * Math.pow(Math.sin(time * (1 + danceability * 0.5)), 2)
    ));
    
    // Mid frequencies - more variation, affected by valence (happiness)
    const midFreq = 2 + valence; // Happier songs have faster mid oscillation
    this.mid = Math.max(0.15, energy * (
      0.4 * Math.pow(1 - beatProgress, 0.7) + // Some relation to beat
      0.6 * Math.pow(Math.sin(time * midFreq + 0.4), 2) // Independent oscillation
    ));
    
    // Treble frequencies - fastest changes, less tied to beat
    const trebleFreq = 3 + energy * 2;
    this.treble = Math.max(0.1, energy * (
      0.3 * Math.pow(1 - beatProgress, 0.3) + // Quick decay after beat
      0.7 * Math.pow(Math.sin(time * trebleFreq + beatProgress * 2), 2) // Complex oscillation
    ));
    
    // Different frequency profiles based on valence (happiness)
    if (valence > 0.6) { // Happier music
      this.treble *= 1.2; // More high-end
      this.mid *= 1.1;
    } else if (valence < 0.4) { // Sadder music
      this.bass *= 1.1; // More bass
      this.treble *= 0.9; // Less high-end
    }
    
    // Call analysis callback with generated data
    if (this.onAnalyzed) {
      this.onAnalyzed({
        volume: this.volume,
        bass: this.bass,
        mid: this.mid,
        treble: this.treble,
        beatDetected: this.beatDetected,
        beatIntensity: this.beatIntensity
      });
    }
  }
  
  /**
   * Significantly improved track progress synchronization
   * @param {number} progressMs - Current track progress in milliseconds
   */
  updateProgress(progressMs) {
    // Store previous progress for comparison
    const previousProgress = this.trackProgress;
    
    // Convert to seconds
    this.trackProgress = progressMs / 1000;
    
    // Calculate how much time has passed since last update
    const deltaTime = this.trackProgress - previousProgress;
    
    // Check for unexpected jumps (seeking, buffering, etc.)
    const isSeek = Math.abs(deltaTime) > 1.0; // More than 1 second jump
    
    // If we haven't loaded any analysis data yet, use sophisticated fallback
    if (!this.segments || this.segments.length === 0 || !this.beats || this.beats.length === 0) {
      if (this.analyzing && !this.isPaused) {
        // Use the current time for animation
        const now = performance.now() / 1000;
        this.generateSophisticatedFallback(now);
      } else if (this.isPaused) {
        // Minimal values when paused
        this.setMinimalValues();
      }
      return;
    }
    
    // Process actual data when available
    if (this.analyzing && !this.isPaused) {
      // If seeking occurred, reset any stateful processing
      if (isSeek) {
        this.resetStateAfterSeek();
      }
      
      this.processAudioData();
    } else if (this.isPaused) {
      this.setMinimalValues();
    }
  }
  
  /**
   * Reset internal state after seeking in track
   */
  resetStateAfterSeek() {
    // Reset segment indices
    this.currentSegmentIndex = 0;
    this.nextSegmentIndex = this.segments.length > 1 ? 1 : 0;
    
    // Reset beat detection state
    this.lastBeatTime = 0;
    this.beatDetected = false;
    this.beatIntensity = 0;
    
    // Find new segment indices based on current position
    this.updateSegmentIndices();
  }
  
  /**
   * Set minimal audio values when paused
   */
  setMinimalValues() {
    this.volume = 0.1;
    this.bass = 0.1;
    this.mid = 0.1;
    this.treble = 0.1;
    this.beatDetected = false;
    this.beatIntensity = 0;
    
    // Call onAnalyzed callback
    if (this.onAnalyzed) {
      this.onAnalyzed({
        volume: this.volume,
        bass: this.bass,
        mid: this.mid,
        treble: this.treble,
        beatDetected: this.beatDetected,
        beatIntensity: this.beatIntensity
      });
    }
  }
}

// SOLUTION 5: UNIFIED VISUALIZATION WITH ACCURATE SYNCHRONIZATION
// Update frontend/src/three/utils/Visualizer.js

/**
 * Synchronized visualization update with accurate timing
 */
function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now() / 1000; // Current time in seconds
  const deltaTime = currentTime - lastUpdateTime;
  lastUpdateTime = currentTime;
  
  // Update animation time
  animationTime += deltaTime;
  
  // Update playback progress estimate with more accurate compensation
  // Use different approaches depending on data availability
  if (!isPaused) {
    // If we have real analysis data, align with actual playback position
    if (currentTrackAnalysis && currentTrackData) {
      // Only increment by actual elapsed time
      const estimatedProgressIncrease = deltaTime * 1000; // Convert to ms
      
      // Check if our estimate is reasonably close to actual position
      // If more than 300ms difference, player.getCurrentState might have updated position
      if (Math.abs(currentPlaybackProgressMs - lastKnownPlayerPosition) > 300) {
        // Use the more accurate position when available
        if (lastKnownPlayerPosition > 0) {
          currentPlaybackProgressMs = lastKnownPlayerPosition;
        } else {
          // Otherwise just increment
          currentPlaybackProgressMs += estimatedProgressIncrease;
        }
      } else {
        // Normal increment during playback
        currentPlaybackProgressMs += estimatedProgressIncrease;
      }
    } else {
      // Without analysis data, we still need to update time for synthetic data
      currentPlaybackProgressMs += deltaTime * 1000;
    }
    
    // Update the audio analyzer with our estimated progress
    audioAnalyzer.updateProgress(currentPlaybackProgressMs);
  }
  
  // The rest of your animation logic...
}

/**
 * Polling for current track with improved accuracy
 * Gets playback state more frequently for better sync
 */
function pollCurrentTrack() {
  // Two polling intervals for better balance:
  // - Fast polling for position updates only (250ms)
  // - Slower polling for full state (1000ms)
  
  // Fast polling for position updates
  const positionInterval = setInterval(async () => {
    if (!accessTokenValue || !player) return;
    
    try {
      // Just get playback position without full state
      const state = await player.getCurrentState();
      if (state) {
        // Store position for animator to use
        lastKnownPlayerPosition = state.position;
      }
    } catch (error) {
      // Ignore errors for fast polling
    }
  }, 250); // 4 times per second for smoother updates
  
  // Regular polling for full state
  const stateInterval = setInterval(async () => {
    if (!accessTokenValue || !player) return;
    
    try {
      // Get full playback state
      const state = await player.getCurrentState();
      
      if (state) {
        // Update pause state
        const wasPlaying = !isPaused;
        isPaused = state.paused;
        
        // Update paused state in audio analyzer
        audioAnalyzer.setPaused(isPaused);
        
        // Update current playback position with accurate value
        currentPlaybackProgressMs = state.position;
        lastKnownPlayerPosition = state.position;
        lastPlaybackUpdateTime = performance.now() / 1000;
        
        // Update audio analyzer with current progress
        audioAnalyzer.updateProgress(currentPlaybackProgressMs);
        
        // Handle track changes...
        if (state.track_window && state.track_window.current_track) {
          // Existing track change logic...
        }
      } else {
        // No track playing - set to paused
        isPaused = true;
        audioAnalyzer.setPaused(true);
      }
    } catch (error) {
      // Error handling...
    }
  }, 1000);
  
  // Return both intervals for potential cleanup
  return { positionInterval, stateInterval };
}