// src/audio/AudioAnalyzer.js
// Real-time audio analysis module for accurate beat and frequency detection

/**
 * AudioAnalyzer - Provides real-time analysis of audio for visualizations
 * Uses Web Audio API to capture and analyze audio from the device output
 */
export class AudioAnalyzer {
    constructor() {
      this.initialized = false;
      this.analyzing = false;
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
      this.bufferLength = 0;
      this.stream = null;
      this.source = null;
  
      // Audio properties
      this.volume = 0;
      this.bass = 0;
      this.mid = 0;
      this.treble = 0;
      this.beats = [];
      this.lastBeatTime = 0;
      this.beatThreshold = 0.5;
      this.beatDecay = 0.98;
      this.beatHoldTime = 0.25;
      this.beatDetected = false;
      this.beatIntensity = 0;
      this.energyHistory = [];
      this.energyThreshold = 0.8;
      this.isPaused = false;
  
      // Event callbacks
      this.onBeat = null;
      this.onAnalyzed = null;
    }
  
    /**
     * Initialize the audio analyzer
     * @returns {Promise<boolean>} - Success state
     */
    async initialize() {
      try {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyzer node
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        // Configure analyzer for better music visualization
        this.analyser.smoothingTimeConstant = 0.85;
        this.analyser.minDecibels = -90;
        this.analyser.maxDecibels = -10;
        
        console.log('Audio analyzer initialized with buffer length:', this.bufferLength);
        this.initialized = true;
        return true;
      } catch (error) {
        console.error('Failed to initialize audio analyzer:', error);
        return false;
      }
    }
  
    /**
     * Start audio analysis by capturing device audio output
     * @returns {Promise<boolean>} - Success state
     */
    async startAnalysis() {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (this.analyzing) return true;
      
      try {
        // Request access to microphone (captures system audio on some browsers)
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        // Create and connect the audio source
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.source.connect(this.analyser);
        
        // Start analysis loop
        this.analyzing = true;
        this.analyze();
        
        console.log('Audio analysis started');
        return true;
      } catch (error) {
        console.error('Failed to start audio analysis:', error);
        return false;
      }
    }
  
    /**
     * Stop audio analysis and release resources
     */
    stopAnalysis() {
      if (!this.analyzing) return;
      
      this.analyzing = false;
      
      // Stop all tracks in the stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      // Disconnect the source
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }
      
      console.log('Audio analysis stopped');
    }
  
    /**
     * Main analysis loop - processes audio data and calculates features
     */
    analyze() {
      if (!this.analyzing) return;
      
      // Get frequency data
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate features
      this.calculateVolume();
      this.calculateFrequencyBands();
      this.detectBeat();
      
      // Call onAnalyzed callback if defined
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
      
      // Continue the loop
      requestAnimationFrame(() => this.analyze());
    }
  
    /**
     * Calculate overall volume level
     */
    calculateVolume() {
      let sum = 0;
      const length = this.dataArray.length;
      
      // Sum all frequency bin values
      for (let i = 0; i < length; i++) {
        sum += this.dataArray[i];
      }
      
      // Calculate average and normalize to 0-1 range
      this.volume = sum / length / 255;
      
      // Add to energy history for beat detection
      this.energyHistory.unshift(this.volume);
      
      // Keep history at a reasonable size
      if (this.energyHistory.length > 30) {
        this.energyHistory.pop();
      }
    }
  
    /**
     * Calculate energy in different frequency bands
     */
    calculateFrequencyBands() {
      const length = this.dataArray.length;
      
      // Define frequency band ranges (approximate for music visualization)
      const bassRange = Math.floor(length * 0.1);    // 0-10% of spectrum (low frequencies)
      const midRange = Math.floor(length * 0.3);     // 10-40% of spectrum (mid frequencies)
      const trebleRange = Math.floor(length * 0.6);  // 40-100% of spectrum (high frequencies)
      
      // Calculate bass energy (low frequencies)
      let bassSum = 0;
      for (let i = 0; i < bassRange; i++) {
        bassSum += this.dataArray[i];
      }
      this.bass = bassSum / bassRange / 255;
      
      // Calculate mid-range energy
      let midSum = 0;
      for (let i = bassRange; i < bassRange + midRange; i++) {
        midSum += this.dataArray[i];
      }
      this.mid = midSum / midRange / 255;
      
      // Calculate treble energy (high frequencies)
      let trebleSum = 0;
      for (let i = bassRange + midRange; i < length; i++) {
        trebleSum += this.dataArray[i];
      }
      this.treble = trebleSum / trebleRange / 255;
    }
  
    /**
     * Detect beats based on energy levels and thresholds
     */
    detectBeat() {
      // Skip beat detection if paused
      if (this.isPaused) {
        this.beatDetected = false;
        this.beatIntensity = 0;
        return;
      }
      
      const now = performance.now() / 1000;
      
      // Calculate average energy over recent history
      let avgEnergy = 0;
      if (this.energyHistory.length > 1) {
        const sum = this.energyHistory.slice(1).reduce((a, b) => a + b, 0);
        avgEnergy = sum / (this.energyHistory.length - 1);
      }
      
      // Detect sudden energy spike (beat)
      const currentEnergy = this.energyHistory[0];
      const energyDelta = currentEnergy - avgEnergy;
      
      // Only detect a beat if:
      // 1. Current energy is above threshold
      // 2. Energy delta is significant (sudden increase)
      // 3. Enough time has passed since the last beat (to prevent multiple triggers)
      if (currentEnergy > this.beatThreshold && 
          energyDelta > avgEnergy * this.energyThreshold && 
          now - this.lastBeatTime > this.beatHoldTime) {
        
        // Beat detected!
        this.beatDetected = true;
        this.beatIntensity = Math.min(1, energyDelta * 2); // Scale intensity
        this.lastBeatTime = now;
        
        // Call beat callback if defined
        if (this.onBeat) {
          this.onBeat({
            time: now,
            intensity: this.beatIntensity,
            bass: this.bass,
            mid: this.mid,
            treble: this.treble
          });
        }
      } else {
        // No new beat detected
        this.beatDetected = false;
      }
    }
  
    /**
     * Set beat detection sensitivity
     * @param {number} threshold - Beat detection threshold (0-1)
     * @param {number} energyThreshold - Energy change threshold (0-1)
     * @param {number} holdTime - Minimum time between beats (seconds)
     */
    setBeatSensitivity(threshold, energyThreshold, holdTime) {
      this.beatThreshold = threshold || this.beatThreshold;
      this.energyThreshold = energyThreshold || this.energyThreshold;
      this.beatHoldTime = holdTime || this.beatHoldTime;
    }
    
    /**
     * Update paused state
     * @param {boolean} isPaused - Whether audio is paused
     */
    setPaused(isPaused) {
      this.isPaused = isPaused;
    }
    
    /**
     * Get detailed audio data for advanced visualization
     * @returns {Object} - Audio data object
     */
    getAudioData() {
      return {
        volume: this.volume,
        bass: this.bass,
        mid: this.mid,
        treble: this.treble,
        beatDetected: this.beatDetected,
        beatIntensity: this.beatIntensity,
        fullSpectrum: Array.from(this.dataArray)
      };
    }
    
    /**
     * Get the raw frequency data array
     * @returns {Uint8Array} - Frequency data
     */
    getFrequencyData() {
      if (!this.analyzing) return new Uint8Array(0);
      return this.dataArray;
    }
  }
  
  // Export a singleton instance
  const audioAnalyzer = new AudioAnalyzer();
  export default audioAnalyzer;