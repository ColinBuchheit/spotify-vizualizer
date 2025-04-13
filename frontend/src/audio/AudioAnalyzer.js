// Enhanced AudioAnalyzer with better reactivity and beat detection
export class AudioAnalyzer {
  constructor() {
    this.initialized = false;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.frequencyData = null;
    this.audioSource = null;
    this.fftSize = 2048;
    this.smoothingTimeConstant = 0.8; // Slightly more responsive
    
    // Enhanced frequency band analysis
    this.bands = {
      bass: { low: 20, high: 250, energy: 0, history: [] },
      midLow: { low: 250, high: 500, energy: 0, history: [] },
      mid: { low: 500, high: 2000, energy: 0, history: [] },
      highMid: { low: 2000, high: 4000, energy: 0, history: [] },
      high: { low: 4000, high: 20000, energy: 0, history: [] }
    };
    
    // Keep history for more accurate beat detection
    this.energyHistory = {
      length: 30, // Store 30 frames of history
      values: []
    };
    
    // Spotify analysis data
    this.spotifyAnalysis = null;
    this.currentTrackStartTime = 0;
    this.currentTrackProgress = 0;
    this.segments = [];
    this.beats = [];
    this.tatums = [];
    this.bars = [];
    this.sections = [];
    
    // Audio features with defaults
    this.energy = 0.5;
    this.valence = 0.5;
    this.tempo = 120;
    this.danceability = 0.5;
    
    // Beat detection
    this.lastBeatTime = 0;
    this.beatDetected = false;
    this.beatIntensity = 0;
    this.beatPrediction = {
      enabled: false,
      nextBeatTime: 0,
      confidence: 0
    };
    
    // Added parameters for visualization mapping
    this.energySmoothed = 0;
    this.visualParams = {
      pulseFactor: 0,
      waveIntensity: 0,
      colorShift: 0,
      particleSpeed: 0
    };
  }
  
  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create analyser node with optimized settings
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      
      // Create data arrays for analysis
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.frequencyData = new Uint8Array(bufferLength);
      
      // Initialize energy history
      for (let i = 0; i < this.energyHistory.length; i++) {
        this.energyHistory.values.push(0);
      }
      
      // Initialize band histories
      Object.keys(this.bands).forEach(band => {
        for (let i = 0; i < 10; i++) {
          this.bands[band].history.push(0);
        }
      });
      
      this.initialized = true;
      console.log('Enhanced audio analyzer initialized with buffer length:', bufferLength);
      
      return true;
    } catch (error) {
      console.error('Error initializing audio analyzer:', error);
      return false;
    }
  }
  
  connectExternalAudio(audioElement) {
    if (!this.initialized) {
      console.error('Audio analyzer not initialized');
      return false;
    }
    
    try {
      if (this.audioSource) {
        this.audioSource.disconnect();
      }
      
      // Create media element source from audio element
      this.audioSource = this.audioContext.createMediaElementSource(audioElement);
      
      // Connect source to analyzer and then to destination
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      console.log('Connected external audio source to analyzer');
      return true;
    } catch (error) {
      console.error('Error connecting audio source:', error);
      return false;
    }
  }
  
  setSpotifyAnalysis(analysis, audioFeatures) {
    this.spotifyAnalysis = analysis;
    
    if (analysis) {
      this.segments = analysis.segments || [];
      this.beats = analysis.beats || [];
      this.tatums = analysis.tatums || [];
      this.bars = analysis.bars || [];
      this.sections = analysis.sections || [];
      
      // If there are beats, set up beat prediction
      if (this.beats && this.beats.length > 0) {
        this.beatPrediction.enabled = true;
        
        // Calculate average confidence of beats
        let totalConfidence = 0;
        this.beats.forEach(beat => {
          totalConfidence += beat.confidence || 0;
        });
        
        this.beatPrediction.confidence = totalConfidence / this.beats.length;
      }
    }
    
    if (audioFeatures) {
      // Store all useful audio features
      this.energy = audioFeatures.energy || 0.5;
      this.valence = audioFeatures.valence || 0.5;
      this.tempo = audioFeatures.tempo || 120;
      this.danceability = audioFeatures.danceability || 0.5;
      this.acousticness = audioFeatures.acousticness || 0.5;
      this.instrumentalness = audioFeatures.instrumentalness || 0.5;
      this.liveness = audioFeatures.liveness || 0.5;
      this.speechiness = audioFeatures.speechiness || 0.1;
      
      // Set beat detection sensitivity based on track energy
      this.beatDetectionThreshold = 0.6 - (this.energy * 0.2);
    }
  }
  
  updateTrackProgress(progressMs) {
    this.currentTrackProgress = progressMs / 1000; // Convert to seconds
    
    // Update beat prediction if enabled
    if (this.beatPrediction.enabled && this.beats && this.beats.length > 0) {
      // Find the next beat after current progress
      for (let i = 0; i < this.beats.length; i++) {
        if (this.beats[i].start > this.currentTrackProgress) {
          this.beatPrediction.nextBeatTime = this.beats[i].start;
          break;
        }
      }
    }
  }
  
  setTrackStartTime() {
    this.currentTrackStartTime = this.audioContext ? this.audioContext.currentTime : 0;
  }
  
  getElapsedTime() {
    return this.audioContext ? this.audioContext.currentTime - this.currentTrackStartTime : 0;
  }
  
  getIndexForFrequency(frequency) {
    if (!this.audioContext) return 0;
    const nyquist = this.audioContext.sampleRate / 2;
    return Math.round((frequency / nyquist) * this.analyser.frequencyBinCount);
  }
  
  getFrequencyRangeValue(lowFreq, highFreq) {
    if (!this.frequencyData) return 0;
    
    const lowIndex = this.getIndexForFrequency(lowFreq);
    const highIndex = this.getIndexForFrequency(highFreq);
    
    let total = 0;
    let count = 0;
    
    for (let i = lowIndex; i <= highIndex; i++) {
      if (i < this.frequencyData.length) {
        total += this.frequencyData[i];
        count++;
      }
    }
    
    return count > 0 ? (total / (count * 255)) : 0;
  }
  
  updateFrequencyBands() {
    Object.keys(this.bands).forEach(bandName => {
      const band = this.bands[bandName];
      
      // Get current value
      const currentValue = this.getFrequencyRangeValue(band.low, band.high);
      
      // Add to history and remove oldest
      band.history.push(currentValue);
      if (band.history.length > 10) {
        band.history.shift();
      }
      
      // Set energy (current value)
      band.energy = currentValue;
      
      // Calculate variance for reactivity detection
      let sum = 0, mean = 0, variance = 0;
      
      // Calculate mean
      band.history.forEach(val => sum += val);
      mean = sum / band.history.length;
      
      // Calculate variance
      band.history.forEach(val => {
        variance += Math.pow(val - mean, 2);
      });
      
      variance /= band.history.length;
      band.variance = variance;
    });
  }
  
  detectBeats() {
    // 1. First check Spotify beat data if available
    const wasUsingSpotifyBeats = this.useSpotifyBeats();
    if (wasUsingSpotifyBeats) {
      return true; // Beat detected using Spotify data
    }
    
    // 2. Fallback to local detection
    const time = this.audioContext ? this.audioContext.currentTime : 0;
    
    // Ensure minimum time between beats
    const minTimeBetweenBeats = 60 / (this.tempo * 2) * 0.85; // Allow for some variation
    if (time - this.lastBeatTime < minTimeBetweenBeats) {
      this.beatDetected = false;
      return false;
    }
    
    // Get bass energy
    const bassEnergy = this.bands.bass.energy;
    
    // Calculate threshold based on recent history
    let sum = 0;
    this.energyHistory.values.forEach(val => sum += val);
    const averageEnergy = sum / this.energyHistory.values.length;
    
    // Dynamic threshold based on track energy
    const threshold = averageEnergy * 1.3 + (0.4 - (this.energy * 0.2));
    
    // Detect sudden energy spikes in bass frequencies
    if (bassEnergy > threshold && (bassEnergy - averageEnergy) > 0.15) {
      this.beatDetected = true;
      this.beatIntensity = Math.min(1, (bassEnergy - threshold) * 3);
      this.lastBeatTime = time;
      
      // Update energy history (beat detected case)
      this.energyHistory.values.push(bassEnergy);
      this.energyHistory.values.shift();
      
      return true;
    }
    
    // Update energy history (no beat case)
    this.energyHistory.values.push(bassEnergy);
    this.energyHistory.values.shift();
    
    // Reset beat detection after small time window
    this.beatDetected = false;
    return false;
  }
  
  useSpotifyBeats() {
    if (!this.beats || this.beats.length === 0) {
      return false;
    }
    
    const timePredictionWindow = 0.08; // 80ms window for beat prediction
    const currentProgress = this.currentTrackProgress;
    
    // Look for beats around the current track progress
    for (let i = 0; i < this.beats.length; i++) {
      const beat = this.beats[i];
      
      if (Math.abs(currentProgress - beat.start) < timePredictionWindow) {
        const confidence = beat.confidence || 0.5;
        
        // Only count as beat if confidence is high enough
        if (confidence > 0.4) {
          this.beatDetected = true;
          this.beatIntensity = confidence;
          this.lastBeatTime = this.audioContext.currentTime;
          return true;
        }
      }
    }
    
    return false;
  }
  
  calculateVisualizationParameters() {
    // Smoothing for energy value
    const energyTarget = (this.bands.bass.energy * 0.4) + 
                         (this.bands.midLow.energy * 0.3) + 
                         (this.bands.mid.energy * 0.2) + 
                         (this.bands.high.energy * 0.1);
                         
    // Smooth transition for energy
    this.energySmoothed += (energyTarget - this.energySmoothed) * 0.2;
    
    // Calculate pulse factor (affected by beats)
    if (this.beatDetected) {
      this.visualParams.pulseFactor = 1.0;
    } else {
      // Decay pulse faster for high-energy tracks
      const decayRate = 0.08 + (this.energy * 0.04);
      this.visualParams.pulseFactor *= (1 - decayRate);
    }
    
    // Calculate wave intensity based on mid frequencies
    this.visualParams.waveIntensity = (this.bands.mid.energy * 0.5) + 
                                      (this.bands.midLow.energy * 0.3) + 
                                      (this.bands.highMid.energy * 0.2);
    
    // Calculate color shift based on frequency distribution
    const bassWeight = this.bands.bass.energy * 1.5;
    const highWeight = this.bands.high.energy * 1.2;
    this.visualParams.colorShift = (bassWeight + highWeight) / 2.7;
    
    // Particle animation speed based on tempo and energy
    const normalizedTempo = this.tempo / 120; // Normalize around typical 120 BPM
    this.visualParams.particleSpeed = (normalizedTempo * 0.7) + (this.energySmoothed * 0.3);
  }
  
  calculateAveragePower() {
    if (!this.frequencyData) return 0;
    
    let sum = 0;
    const length = this.frequencyData.length;
    
    for (let i = 0; i < length; i++) {
      sum += this.frequencyData[i];
    }
    
    return sum / (length * 255); // Normalize to 0-1 range
  }
  
  suspendIfPossible() {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend().catch(e => console.error('Error suspending audio context:', e));
    }
  }
  
  update() {
    if (!this.initialized) return null;
    
    // Get waveform data
    this.analyser.getByteTimeDomainData(this.dataArray);
    
    // Get frequency data
    this.analyser.getByteFrequencyData(this.frequencyData);
    
    // Update frequency bands
    this.updateFrequencyBands();
    
    // Process beat detection
    this.detectBeats();
    
    // Calculate visualization parameters
    this.calculateVisualizationParameters();
    
    // Return rich data for visualization
    return {
      waveform: this.dataArray,
      frequencies: this.frequencyData,
      beatDetected: this.beatDetected,
      beatIntensity: this.beatIntensity,
      energyByBand: {
        bass: this.bands.bass.energy,
        midLow: this.bands.midLow.energy,
        mid: this.bands.mid.energy,
        highMid: this.bands.highMid.energy,
        high: this.bands.high.energy
      },
      averagePower: this.calculateAveragePower(),
      visualParams: this.visualParams
    };
  }
  
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      return true;
    }
    return false;
  }
  
  dispose() {
    if (this.audioSource) {
      this.audioSource.disconnect();
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.initialized = false;
  }
}