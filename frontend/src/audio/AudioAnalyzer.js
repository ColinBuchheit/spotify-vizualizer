// src/audio/AudioAnalyzer.js
// Real-time audio analysis module using Spotify's audio analysis data

/**
 * AudioAnalyzer - Provides analysis of audio for visualizations
 * Uses Spotify's audio analysis and features APIs instead of microphone
 */
export class AudioAnalyzer {
  constructor() {
    this.initialized = true; // Always initialized
    this.analyzing = true;  // Always analyzing
    
    // Audio properties
    this.volume = 0.5;
    this.bass = 0.5;
    this.mid = 0.5;
    this.treble = 0.5;
    this.beatDetected = false;
    this.beatIntensity = 0;
    this.isPaused = false;
    
    // Track timing
    this.currentTrackId = null;
    this.trackStart = 0;
    this.trackProgress = 0;
    this.beats = [];
    this.segments = [];
    this.tatums = [];
    this.sections = [];
    
    // Audio features
    this.energy = 0.5;
    this.danceability = 0.5;
    this.valence = 0.5;
    this.tempo = 120;
    
    // Event callbacks
    this.onBeat = null;
    this.onAnalyzed = null;
    
    // Last beat time for calculations
    this.lastBeatTime = 0;
    
    // For interpolating between segments
    this.currentSegmentIndex = 0;
    this.nextSegmentIndex = 0;
    
    // Analysis retry counter
    this.analysisRetryCount = 0;
    this.maxAnalysisRetries = 3;
    
    // Feature detection
    this.hasAnalysisData = false;
    this.useFallbackAnalysis = false;
  }

  /**
   * Initialize the analyzer - no setup needed with this approach
   */
  async initialize() {
    return true;
  }

  /**
   * Start audio analysis using Spotify data
   */
  async startAnalysis() {
    this.analyzing = true;
    return true;
  }

  /**
   * Stop audio analysis
   */
  stopAnalysis() {
    this.analyzing = false;
  }
  
  /**
   * Update track data from Spotify analysis
   * @param {Object} analysisData - Spotify audio analysis data
   * @param {Object} features - Spotify audio features
   */
  updateTrackData(analysisData, features) {
    // Reset retry counter
    this.analysisRetryCount = 0;
    
    // Store feature availability flags
    this.hasAnalysisData = !!analysisData && 
                         ((analysisData.beats && analysisData.beats.length > 0) || 
                          (analysisData.segments && analysisData.segments.length > 0));
    
    this.useFallbackAnalysis = !this.hasAnalysisData;
    
    // If we have analysis data, use it
    if (analysisData) {
      // Store beats, segments and tatums from the analysis
      this.beats = analysisData.beats || [];
      this.segments = analysisData.segments || [];
      this.tatums = analysisData.tatums || [];
      this.sections = analysisData.sections || [];
      
      // Reset segment indices
      this.currentSegmentIndex = 0;
      this.nextSegmentIndex = this.segments.length > 1 ? 1 : 0;
    } else {
      // Clear data if no analysis available
      this.beats = [];
      this.segments = [];
      this.tatums = [];
      this.sections = [];
    }
    
    // Store audio features - always use these even without analysis data
    if (features) {
      this.energy = features.energy || 0.5;
      this.danceability = features.danceability || 0.5;
      this.valence = features.valence || 0.5;
      this.tempo = features.tempo || 120;
    }
    
    console.log('Track data updated:', {
      hasAnalysisData: this.hasAnalysisData,
      useFallback: this.useFallbackAnalysis,
      beatsCount: this.beats.length,
      segmentsCount: this.segments.length,
      tempo: this.tempo,
      energy: this.energy
    });
  }
  
 /**
  * Update the current playback time to sync with the track
  * @param {number} progressMs - Current track progress in milliseconds
  */
 updateProgress(progressMs) {
    // Convert to seconds
    this.trackProgress = progressMs / 1000;
  
    // If paused, use minimal values
    if (this.isPaused) {
      // Minimal values when paused
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
      return;
    }
    
    // If we're analyzing and have data, use it
    if (this.analyzing) {
      if (this.hasAnalysisData && !this.useFallbackAnalysis) {
        this.processAudioData();
      } else {
        // Use fallback synthetic data generation if no analysis data available
        this.generateSyntheticData(performance.now() / 1000, {
          energy: this.energy,
          tempo: this.tempo,
          danceability: this.danceability,
          valence: this.valence
        });
      }
    }
 }
  
  /**
   * Process audio data based on track position to simulate real-time analysis
   */
  processAudioData() {
    // Find current beat
    const currentBeat = this.findCurrentEvent(this.beats);
    
    // Find current segment for frequency data
    const currentSegment = this.findCurrentEvent(this.segments);
    const currentSection = this.findCurrentEvent(this.sections);
    
    // Update current segment indices for smoother transitions
    this.updateSegmentIndices();
    
    // Detect beat
    if (currentBeat) {
      const now = performance.now() / 1000;
      
      // Only trigger a beat if enough time has passed since the last one
      // This prevents multiple beats triggering too close together
      if (now - this.lastBeatTime > 0.1) {
        this.beatDetected = true;
        this.beatIntensity = currentBeat.confidence || 0.8;
        this.lastBeatTime = now;
        
        // Call beat callback
        if (this.onBeat) {
          this.onBeat({
            time: now,
            intensity: this.beatIntensity,
            confidence: currentBeat.confidence || 0.8
          });
        }
      }
    } else {
      this.beatDetected = false;
      this.beatIntensity = 0;
    }
    
    // Extract frequency data from current segment
    if (currentSegment) {
      // Use timbre data from segment to approximate frequency bands
      // Spotify timbre vectors have 12 values representing different frequency characteristics
      const timbre = currentSegment.timbre || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      // Normalize timbre values (they can be negative)
      const normalizedTimbre = timbre.map(t => Math.min(1, Math.max(0, (t + 100) / 200)));
      
      // Map timbre components to frequency bands (approximate)
      this.bass = (normalizedTimbre[0] + normalizedTimbre[1]) / 2; // Low frequencies
      this.mid = (normalizedTimbre[2] + normalizedTimbre[3] + normalizedTimbre[4]) / 3; // Mid frequencies
      this.treble = (normalizedTimbre[5] + normalizedTimbre[6]) / 2; // High frequencies
      
      // Volume from loudness
      this.volume = Math.min(1, Math.max(0, (currentSegment.loudness_max + 60) / 60)) || 0.5;
      
      // Apply energy factor from audio features
      this.volume *= (0.5 + this.energy * 0.5);
      this.bass *= (0.4 + this.energy * 0.6);
      this.mid *= (0.4 + this.energy * 0.6);
      this.treble *= (0.4 + this.energy * 0.6);
    }
    
    // Adjust volume based on section if available
    if (currentSection && currentSection.loudness) {
      const sectionVolume = Math.min(1, Math.max(0, (currentSection.loudness + 60) / 60));
      this.volume = this.volume * 0.7 + sectionVolume * 0.3;
    }
    
    // Call analysis callback
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
   * Update current segment indices for smoother transitions
   */
  updateSegmentIndices() {
    if (!this.segments || this.segments.length <= 1) return;
    
    for (let i = 0; i < this.segments.length - 1; i++) {
      const segment = this.segments[i];
      const nextSegment = this.segments[i + 1];
      
      if (this.trackProgress >= segment.start && this.trackProgress < nextSegment.start) {
        this.currentSegmentIndex = i;
        this.nextSegmentIndex = i + 1;
        return;
      }
    }
    
    // If we're at the last segment
    if (this.trackProgress >= this.segments[this.segments.length - 1].start) {
      this.currentSegmentIndex = this.segments.length - 1;
      this.nextSegmentIndex = this.segments.length - 1;
    }
  }
  
  /**
   * Find the current event (beat, segment, etc.) based on track progress
   * @param {Array} events - Array of timed events from Spotify analysis
   * @returns {Object|null} - Current event or null if not found
   */
  findCurrentEvent(events) {
    if (!events || events.length === 0) return null;
    
    // Binary search would be more efficient here, but for simplicity we'll use linear search
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const start = event.start;
      const end = start + (event.duration || 0);
      
      if (this.trackProgress >= start && this.trackProgress < end) {
        return event;
      }
    }
    
    return null;
  }
  
  /**
   * Get the current segment position
   * @returns {number} - Position within segment (0-1)
   */
  getSegmentProgress() {
    if (!this.segments || this.segments.length === 0) return 0;
    
    const segment = this.segments[this.currentSegmentIndex];
    if (!segment) return 0;
    
    const start = segment.start;
    const duration = segment.duration || 0;
    
    if (duration === 0) return 0;
    
    return Math.min(1, Math.max(0, (this.trackProgress - start) / duration));
  }
  
  /**
   * Set paused state
   * @param {boolean} isPaused - Whether audio is paused
   */
  setPaused(isPaused) {
    this.isPaused = isPaused;
  }
  
  /**
   * Get current audio data
   * @returns {Object} - Current audio data
   */
  getAudioData() {
    return {
      volume: this.volume,
      bass: this.bass,
      mid: this.mid,
      treble: this.treble,
      beatDetected: this.beatDetected,
      beatIntensity: this.beatIntensity
    };
  }
  
  /**
   * Generate synthetic data when no analysis is available
   * @param {number} time - Current animation time
   * @param {Object} trackFeatures - Track features (optional)
   */
  generateSyntheticData(time, trackFeatures = null) {
    // Use provided track features if available, otherwise use class properties
    const energy = trackFeatures?.energy || this.energy || 0.5;
    const tempo = trackFeatures?.tempo || this.tempo || 120;
    const danceability = trackFeatures?.danceability || this.danceability || 0.5;
    const valence = trackFeatures?.valence || this.valence || 0.5;
    
    const beatInterval = 60 / tempo;
    
    // Check if a beat should occur
    if (time - this.lastBeatTime >= beatInterval) {
      // Generate beat with confidence based on danceability
      this.beatDetected = true;
      this.beatIntensity = 0.4 + (energy * 0.3) + (danceability * 0.3);
      this.lastBeatTime = time;
      
      // Call beat callback
      if (this.onBeat) {
        this.onBeat({
          time: time,
          intensity: this.beatIntensity,
          confidence: 0.7 + (danceability * 0.3)
        });
      }
    } else {
      // Reset beat detection
      this.beatDetected = false;
    }
    
    // Generate waveforms for different frequency bands
    const energyFactor = energy * 0.8 + 0.2;
    const beatProgress = (time - this.lastBeatTime) / beatInterval;
    
    // Base volume with natural fade
    this.volume = energyFactor * (0.6 + 0.4 * (1 - beatProgress));
    
    // Bass frequencies - stronger for danceable tracks
    this.bass = energyFactor * (
      0.5 + 0.5 * Math.pow(Math.sin(time * (1 + danceability)), 2)
    );
    
    // Mid frequencies - more variation based on valence (happiness)
    this.mid = energyFactor * (
      0.3 + 0.7 * Math.pow(Math.sin(time * 2.5 + valence * 0.5), 2)
    );
    
    // Treble frequencies - fastest changes
    this.treble = energyFactor * (
      0.2 + 0.8 * Math.pow(Math.sin(time * 4.2 + 0.8), 2)
    );
    
    // Make happier songs have more energetic high frequencies
    if (valence > 0.6) {
      this.treble *= (0.8 + valence * 0.2);
    }
    
    // Call analysis callback
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
   * Try to fetch analysis data again
   * @param {Function} fetchAnalysisFunc - Function to fetch analysis data
   * @returns {Promise<boolean>} - Whether retry was successful
   */
  async retryAnalysisData(fetchAnalysisFunc) {
    if (this.analysisRetryCount >= this.maxAnalysisRetries) {
      console.log('Maximum analysis retry attempts reached, using fallback');
      this.useFallbackAnalysis = true;
      return false;
    }
    
    this.analysisRetryCount++;
    console.log(`Attempting to fetch analysis data, retry ${this.analysisRetryCount}/${this.maxAnalysisRetries}`);
    
    try {
      const success = await fetchAnalysisFunc();
      if (success) {
        this.useFallbackAnalysis = false;
        return true;
      }
    } catch (error) {
      console.error('Error during analysis retry:', error);
    }
    
    return false;
  }
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



// Export a singleton instance
const audioAnalyzer = new AudioAnalyzer();
export default audioAnalyzer;