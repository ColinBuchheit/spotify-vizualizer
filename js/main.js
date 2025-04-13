// Import dependencies
import * as THREE from 'three';
import SpotifyWebApi from 'spotify-web-api-js';
import CONFIG from './config.js';

// Import project modules
import './auth/spotify-auth.js';
import './audio/analyzer.js';
import './audio/spotify-api.js';
import './visualizer/scene.js';
import './visualizer/renderer.js';
import './visualizer/effects/bass.js';
import './visualizer/effects/treble.js';
import './visualizer/effects/volume.js';
import './utils/helpers.js';

// Make THREE available globally for other modules
window.THREE = THREE;
window.SpotifyWebApi = SpotifyWebApi;

// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
    console.log('Spotify Music Visualizer starting...');
    
    // Initialize visualizer scene when DOM is ready
    const visualizer = new VisualizerScene();
    
    // Add click handler to ensure audio context starts
    // (Audio context requires user interaction to start)
    document.addEventListener('click', () => {
        if (window.audioAnalyzer && 
            window.audioAnalyzer.audioContext && 
            window.audioAnalyzer.audioContext.state === 'suspended') {
            window.audioAnalyzer.audioContext.resume();
        }
    }, { once: true });
});