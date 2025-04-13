class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.currentTrackData = null;
        
        // Initialize audio context
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            // Set up analyser node
            this.analyser.fftSize = 2048;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            // Connect analyser to destination
            this.analyser.connect(this.audioContext.destination);
            
            console.log('Audio context initialized');
        } catch (e) {
            console.error('Audio Context could not be created:', e);
        }
    }
    
    updateTrackData(state) {
        this.currentTrackData = state;
    }
    
    getAudioData() {
        if (!this.analyser || !this.dataArray) return null;
        
        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate audio metrics
        const bassValue = this.calculateBassValue();
        const trebleValue = this.calculateTrebleValue();
        const volumeValue = this.calculateVolumeValue();
        
        return {
            raw: this.dataArray,
            bass: bassValue,
            treble: trebleValue,
            volume: volumeValue
        };
    }
    
    calculateBassValue() {
        // Bass frequencies are typically between 20-250Hz
        // We'll take the average of the first portion of the frequency bins
        const bassRange = Math.floor(this.dataArray.length * 0.1); // Use first 10% of bins
        let bassSum = 0;
        
        for (let i = 0; i < bassRange; i++) {
            bassSum += this.dataArray[i];
        }
        
        return bassSum / bassRange / 255; // Normalize to 0-1
    }
    
    calculateTrebleValue() {
        // Treble frequencies are typically above 2000Hz
        // We'll take the average of the upper portion of the frequency bins
        const trebleStart = Math.floor(this.dataArray.length * 0.7); // Start at 70% of bins
        let trebleSum = 0;
        
        for (let i = trebleStart; i < this.dataArray.length; i++) {
            trebleSum += this.dataArray[i];
        }
        
        return trebleSum / (this.dataArray.length - trebleStart) / 255; // Normalize to 0-1
    }
    
    calculateVolumeValue() {
        // Overall volume is the average across all frequencies
        let volumeSum = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            volumeSum += this.dataArray[i];
        }
        
        return volumeSum / this.dataArray.length / 255; // Normalize to 0-1
    }
}

// Create global audio analyzer instance
window.audioAnalyzer = new AudioAnalyzer();