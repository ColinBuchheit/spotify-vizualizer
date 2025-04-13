class SpotifyAudioConnector {
    constructor() {
        this.audioSrc = null;
        this.mediaElement = new Audio();
        this.isSetup = false;
        
        // Create audio element to connect to analyzer
        this.mediaElement.crossOrigin = "anonymous";
    }
    
    setup(audioContext, analyserNode) {
        if (this.isSetup) return;
        
        // Connect media element to audio context
        this.audioSrc = audioContext.createMediaElementSource(this.mediaElement);
        this.audioSrc.connect(analyserNode);
        
        this.isSetup = true;
        console.log('Spotify audio connector initialized');
    }
    
    updateAudioSource(trackUrl) {
        if (!trackUrl) return;
        
        this.mediaElement.src = trackUrl;
        this.mediaElement.play().catch(err => {
            console.error('Audio playback error:', err);
        });
    }
}

// Create global instance
window.spotifyAudioConnector = new SpotifyAudioConnector();