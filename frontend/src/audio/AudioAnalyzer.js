// Real-time audio analysis using Web Audio API integrated with Spotify

export class AudioAnalyzer {
    constructor() {
      this.initialized = false;
      this.audioContext = null;
      this.analyser = null;
      this.dataArray = null;
      this.frequencyData = null;
      this.audioSource = null;
      this.fftSize = 2048;
      this.smoothingTimeConstant = 0.85;
      
      // Spotify analysis data
      this.spotifyAnalysis = null;
      this.currentTrackStartTime = 0;
      this.currentTrackProgress = 0;
      this.segments = [];
      this.beats = [];
      this.tatums = [];
      
      // Audio features
      this.energy = 0.5;
      this.valence = 0.5;
      this.tempo = 120;
      
      // Beat detection
      this.lastBeatTime = 0;
      this.beatDetected = false;
      this.beatIntensity = 0;
    }
    
    async initialize() {
      try {
        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create analyser node
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
        
        // Create data arrays
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        this.frequencyData = new Uint8Array(bufferLength);
        
        this.initialized = true;
        console.log('Audio analyzer initialized with buffer length:', bufferLength);
        
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
    
    // This is called when we want to use a mock audio source or simulate audio data
    simulateAudioSource() {
      if (!this.initialized) {
        console.error('Audio analyzer not initialized');
        return false;
      }
      
      // Create oscillator for testing
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
      
      // Connect oscillator to analyzer
      oscillator.connect(this.analyser);
      oscillator.start();
      
      console.log('Simulated audio source connected');
      return true;
    }
    
    setSpotifyAnalysis(analysis, audioFeatures) {
      this.spotifyAnalysis = analysis;
      
      if (analysis) {
        this.segments = analysis.segments || [];
        this.beats = analysis.beats || [];
        this.tatums = analysis.tatums || [];
      }
      
      if (audioFeatures) {
        this.energy = audioFeatures.energy || 0.5;
        this.valence = audioFeatures.valence || 0.5;
        this.tempo = audioFeatures.tempo || 120;
      }
    }
    
    updateTrackProgress(progressMs) {
      this.currentTrackProgress = progressMs / 1000; // Convert to seconds
    }
    
    setTrackStartTime() {
      this.currentTrackStartTime = this.audioContext ? this.audioContext.currentTime : 0;
    }
    
    getElapsedTime() {
      return this.audioContext ? this.audioContext.currentTime - this.currentTrackStartTime : 0;
    }
    
    update() {
      if (!this.initialized) return null;
      
      // Get waveform data
      this.analyser.getByteTimeDomainData(this.dataArray);
      
      // Get frequency data
      this.analyser.getByteFrequencyData(this.frequencyData);
      
      // Process beat detection
      this.detectBeats();
      
      return {
        waveform: this.dataArray,
        frequencies: this.frequencyData,
        beatDetected: this.beatDetected,
        beatIntensity: this.beatIntensity,
        averagePower: this.calculateAveragePower()
      };
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
    
    detectBeats() {
      const time = this.audioContext ? this.audioContext.currentTime : 0;
      
      // If we have Spotify beat data, use that
      if (this.beats && this.beats.length > 0) {
        const currentProgress = this.currentTrackProgress;
        
        // Look for beats within a small window of current progress
        for (let i = 0; i < this.beats.length; i++) {
          const beat = this.beats[i];
          
          if (Math.abs(currentProgress - beat.start) < 0.05) { // 50ms window
            const confidence = beat.confidence || 0.5;
            
            // Only count as beat if confidence is high enough
            if (confidence > 0.5) {
              this.beatDetected = true;
              this.beatIntensity = confidence;
              this.lastBeatTime = time;
              return true;
            }
          }
        }
      }
      
      // Fallback: use Web Audio API for beat detection by looking at low frequencies
      const lowFreqAvg = this.getLowFrequencyAverage();
      const threshold = 0.65 + this.energy * 0.1; // Adaptive threshold based on track energy
      
      if (lowFreqAvg > threshold && time - this.lastBeatTime > 0.25) { // Minimum 250ms between beats
        this.beatDetected = true;
        this.beatIntensity = Math.min(1, lowFreqAvg);
        this.lastBeatTime = time;
        return true;
      }
      
      // Reset beat detection after 100ms
      if (time - this.lastBeatTime > 0.1) {
        this.beatDetected = false;
      }
      
      return false;
    }
    
    getLowFrequencyAverage() {
      if (!this.frequencyData) return 0;
      
      // Use only the first ~80Hz for bass detection
      const lowFreqRange = Math.min(10, Math.floor(this.frequencyData.length / 32));
      let sum = 0;
      
      for (let i = 0; i < lowFreqRange; i++) {
        sum += this.frequencyData[i];
      }
      
      return sum / (lowFreqRange * 255); // Normalize to 0-1
    }
    
    // Resume audio context (needed for Chrome autoplay policy)
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