// AudioVisualizerConnector.js - Enhances connection between audio analysis and visualization

/**
 * Class to handle the enhanced synchronization between audio analysis and visualization
 */
export class AudioVisualizerConnector {
    constructor(audioAnalyzer, visualizer) {
      this.audioAnalyzer = audioAnalyzer;
      this.visualizer = visualizer;
      this.isActive = false;
      this.updateInterval = null;
      this.lastAnalysisTime = 0;
      this.analysisInterval = 16; // ~60fps timing for smooth visuals
      
      // Beat detection history
      this.beatHistory = [];
      this.beatHistoryMaxLength = 30;
      
      // Connection state
      this.connectionState = {
        analyzerInitialized: false,
        visualizerInitialized: false,
        dataFlowActive: false
      };
      
      // Beat detection settings with defaults
      this.beatDetectionSettings = {
        threshold: 0.2,
        decay: 0.05,
        minimumTime: 0.25,
        adaptiveThreshold: true
      };
      
      // Audio feature mapping configuration
      this.featureMapping = {
        // Map audio features to visualization parameters
        bass: {
          primary: 'particleSpeed',
          secondary: 'pulseFactor',
          weight: 1.0
        },
        midLow: {
          primary: 'cameraMovement',
          secondary: 'colorShift',
          weight: 0.8
        },
        mid: {
          primary: 'waveIntensity',
          secondary: 'albumRotation',
          weight: 0.7
        },
        highMid: {
          primary: 'particleSize',
          secondary: 'glowIntensity',
          weight: 0.6
        },
        high: {
          primary: 'bloomIntensity',
          secondary: 'colorBrightness',
          weight: 0.6
        }
      };
      
      // Bound methods
      this.update = this.update.bind(this);
    }
    
    /**
     * Initialize the connector
     * @returns {Promise<boolean>} - Success status
     */
    async initialize() {
      try {
        // Check if both components are available
        if (!this.audioAnalyzer || !this.visualizer) {
          console.error('Audio analyzer or visualizer not provided');
          return false;
        }
        
        // Check initialization status
        this.connectionState.analyzerInitialized = this.audioAnalyzer.initialized;
        this.connectionState.visualizerInitialized = this.visualizer.initialized;
        
        if (!this.connectionState.analyzerInitialized || !this.connectionState.visualizerInitialized) {
          console.error('Audio analyzer or visualizer not initialized');
          return false;
        }
        
        // Start the update loop
        this.start();
        
        return true;
      } catch (error) {
        console.error('Error initializing audio-visualizer connector:', error);
        return false;
      }
    }
    
    /**
     * Start the update loop
     */
    start() {
      if (this.isActive) return;
      
      this.isActive = true;
      this.connectionState.dataFlowActive = true;
      this.lastAnalysisTime = performance.now();
      
      // Use requestAnimationFrame for better performance and sync with visualization
      this.update();
      
      console.log('Audio-visualizer connector started');
    }
    
    /**
     * Stop the update loop
     */
    stop() {
      this.isActive = false;
      this.connectionState.dataFlowActive = false;
      
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      console.log('Audio-visualizer connector stopped');
    }
    
    /**
     * Update audio data and send to visualizer
     */
    update() {
      if (!this.isActive) return;
      
      // Request next frame
      requestAnimationFrame(this.update);
      
      // Check if it's time for a new analysis
      const now = performance.now();
      const timeSinceLastAnalysis = now - this.lastAnalysisTime;
      
      if (timeSinceLastAnalysis < this.analysisInterval) {
        return; // Skip this frame if not enough time has passed
      }
      
      this.lastAnalysisTime = now;
      
      try {
        // Get audio data from analyzer
        const audioData = this.audioAnalyzer.update();
        
        if (!audioData) {
          return; // No audio data available
        }
        
        // Enhance audio data with additional processing
        const enhancedData = this.enhanceAudioData(audioData);
        
        // Send enhanced data to visualizer
        this.visualizer.updateAudioData(enhancedData);
        
      } catch (error) {
        console.error('Error in audio-visualizer update loop:', error);
        // Don't stop the loop on error, just log it
      }
    }
    
    /**
     * Enhance raw audio data with additional analysis
     * @param {Object} audioData - Raw audio data from analyzer
     * @returns {Object} - Enhanced audio data
     */
    enhanceAudioData(audioData) {
      // Create a copy to avoid modifying the original
      const enhanced = { ...audioData };
      
      // Refine beat detection for better visual responsiveness
      enhanced.beatDetected = this.refineBeatDetection(
        enhanced.beatDetected,
        enhanced.energyByBand.bass,
        enhanced.averagePower
      );
      
      // Add enhanced beat intensity that builds up over consecutive beats
      enhanced.beatIntensity = this.calculateBeatIntensity(enhanced.beatDetected);
      
      // Add visual mapping parameters based on feature mapping configuration
      enhanced.visualParams = {};
      
      // Apply feature mappings with smoothing
      Object.keys(this.featureMapping).forEach(feature => {
        const mapping = this.featureMapping[feature];
        const energy = enhanced.energyByBand[feature] || 0;
        const weightedEnergy = energy * mapping.weight;
        
        // Apply to primary parameter
        if (mapping.primary) {
          enhanced.visualParams[mapping.primary] = 
            (enhanced.visualParams[mapping.primary] || 0) + weightedEnergy;
        }
        
        // Apply to secondary parameter with reduced weight
        if (mapping.secondary) {
          enhanced.visualParams[mapping.secondary] = 
            (enhanced.visualParams[mapping.secondary] || 0) + (weightedEnergy * 0.7);
        }
      });
      
      // Add overall energy measure that combines all frequencies
      enhanced.totalEnergy = Object.values(enhanced.energyByBand).reduce((sum, value) => sum + value, 0) / 
                            Object.keys(enhanced.energyByBand).length;
      
      // Add rhythm stability measure (how consistent the beats are)
      enhanced.rhythmStability = this.calculateRhythmStability();
      
      return enhanced;
    }
    
    /**
     * Refine beat detection by filtering false positives and adding context
     * @param {boolean} beatDetected - Raw beat detection result
     * @param {number} bassEnergy - Current bass energy level
     * @param {number} averagePower - Average audio power
     * @returns {boolean} - Refined beat detection
     */
    refineBeatDetection(beatDetected, bassEnergy, averagePower) {
      // Get current time
      const now = performance.now();
      
      // Check last detected beat time
      const lastBeatTime = this.beatHistory.length > 0 
        ? this.beatHistory[this.beatHistory.length - 1].time 
        : 0;
      
      // Calculate time since last beat in seconds
      const timeSinceLastBeat = (now - lastBeatTime) / 1000;
      
      // Apply minimum time between beats to avoid false positives
      if (timeSinceLastBeat < this.beatDetectionSettings.minimumTime) {
        return false; // Too soon for another beat
      }
      
      // Calculate adaptive threshold based on recent energy history
      let threshold = this.beatDetectionSettings.threshold;
      
      if (this.beatDetectionSettings.adaptiveThreshold && this.beatHistory.length > 5) {
        // Calculate average energy from recent beats
        const recentBeats = this.beatHistory.slice(-5);
        const avgEnergy = recentBeats.reduce((sum, beat) => sum + beat.energy, 0) / recentBeats.length;
        
        // Adjust threshold based on recent beats
        threshold = avgEnergy * 0.8;
      }
      
      // Refined beat detection logic
      if (beatDetected && bassEnergy > threshold) {
        // Add to beat history
        this.beatHistory.push({
          time: now,
          energy: bassEnergy,
          power: averagePower
        });
        
        // Trim history if too long
        if (this.beatHistory.length > this.beatHistoryMaxLength) {
          this.beatHistory.shift();
        }
        
        return true;
      }
      
      return false;
    }
    
    /**
     * Calculate beat intensity based on beat history
     * @param {boolean} currentBeatDetected - Current beat detection result
     * @returns {number} - Beat intensity value (0-1)
     */
    calculateBeatIntensity(currentBeatDetected) {
      if (this.beatHistory.length < 2) {
        return currentBeatDetected ? 1.0 : 0.0;
      }
      
      // Get current time
      const now = performance.now();
      
      // Get last beat
      const lastBeat = this.beatHistory[this.beatHistory.length - 1];
      
      // Calculate time since last beat
      const timeSinceLastBeat = (now - lastBeat.time) / 1000;
      
      // If current beat detected, return full intensity
      if (currentBeatDetected) {
        return 1.0;
      }
      
      // Decay beat intensity over time
      const decayRate = this.beatDetectionSettings.decay;
      const normalizedTime = Math.min(1.0, timeSinceLastBeat / 0.5); // Normalize to 0-1 over 500ms
      
      return Math.max(0, 1.0 - (normalizedTime * decayRate * 20));
    }
    
    /**
     * Calculate rhythm stability based on beat history
     * @returns {number} - Stability value (0-1)
     */
    calculateRhythmStability() {
      if (this.beatHistory.length < 4) {
        return 0.5; // Default stability
      }
      
      // Get beat intervals
      const intervals = [];
      for (let i = 1; i < this.beatHistory.length; i++) {
        intervals.push(this.beatHistory[i].time - this.beatHistory[i - 1].time);
      }
      
      // Calculate average interval
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      
      // Calculate variance
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2);
      }, 0) / intervals.length;
      
      // Normalize variance to 0-1 stability value (higher variance = lower stability)
      const standardDeviation = Math.sqrt(variance);
      const normalizedDeviation = Math.min(1.0, standardDeviation / avgInterval);
      
      // Invert so higher value means more stable
      return 1.0 - normalizedDeviation;
    }
    
    /**
     * Update beat detection settings
     * @param {Object} settings - New settings
     */
    updateBeatDetectionSettings(settings) {
      this.beatDetectionSettings = {
        ...this.beatDetectionSettings,
        ...settings
      };
    }
    
    /**
     * Update feature mapping configuration
     * @param {Object} mapping - New feature mapping
     */
    updateFeatureMapping(mapping) {
      this.featureMapping = {
        ...this.featureMapping,
        ...mapping
      };
    }
    
    /**
     * Get connection status
     * @returns {Object} - Connection state
     */
    getConnectionStatus() {
      return {
        ...this.connectionState,
        beatHistoryLength: this.beatHistory.length,
        isActive: this.isActive
      };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
      this.stop();
      this.beatHistory = [];
    }
  }