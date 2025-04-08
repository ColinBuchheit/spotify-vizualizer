// frontend/src/three/VisualizerIntegration.js

import { ImmersiveVisualizer } from './ImmersiveVisualizer.js';
import { AudioAnalyzer } from '../audio/AudioAnalyzer.js';

export class VisualizerIntegration {
  constructor() {
    this.visualizer = new ImmersiveVisualizer();
    this.audioAnalyzer = new AudioAnalyzer();
    this.initialized = false;
    this.currentTrackId = null;
    this.isPaused = true;
  }
  
  async initialize(containerElement, accessToken) {
    // Initialize audio analyzer
    await this.audioAnalyzer.initialize();
    
    // Initialize visualizer
    this.visualizer.init(containerElement);
    
    // Connect components
    this.visualizer.setAudioAnalyser(this.audioAnalyzer);
    
    this.initialized = true;
    return true;
  }
  
  updateTrack(trackInfo) {
    if (!this.initialized) return;
    
    if (trackInfo && trackInfo.item) {
      // Update track ID
      this.currentTrackId = trackInfo.item.id;
      
      // Update album artwork
      const albumImage = trackInfo.item.album?.images?.[0]?.url;
      if (albumImage) {
        this.visualizer.updateAlbumCover(albumImage);
      }
      
      // Update playback state
      this.isPaused = !trackInfo.is_playing;
    }
  }
  
  updateAudioFeatures(features, analysis) {
    if (!this.initialized) return;
    
    this.audioAnalyzer.setSpotifyAnalysis(analysis, features);
  }
  
  updatePlaybackState(isPlaying) {
    this.isPaused = !isPlaying;
  }
  
  update(deltaTime) {
    if (!this.initialized) return;
    
    // Update audio analyzer
    const audioData = this.audioAnalyzer.update();
    
    // Update visualizer with audio data
    this.visualizer.updateAudioData(audioData);
  }
  
  resize(width, height) {
    if (this.visualizer) {
      this.visualizer.onWindowResize();
    }
  }
  
  dispose() {
    if (this.visualizer) {
      this.visualizer.dispose();
    }
    
    if (this.audioAnalyzer) {
      this.audioAnalyzer.dispose();
    }
    
    this.initialized = false;
  }
}