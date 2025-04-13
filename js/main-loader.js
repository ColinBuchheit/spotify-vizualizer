// This file loads all modules in the correct order

// First make sure THREE is globally available
window.THREE = THREE; 

// Load config first
import './config.js';

// Load utils
import './utils/helpers.js';

// Load audio modules
import './audio/analyzer.js';
import './audio/spotify-audio-connector.js';
import './audio/spotify-api.js';

// Load auth modules
import './auth/spotify-auth.js';

// Load visualizer modules
import './visualizer/effects/bass.js';
import './visualizer/effects/treble.js';
import './visualizer/effects/volume.js';
import './visualizer/renderer.js';
import './visualizer/scene.js';

// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
    console.log('Spotify Music Visualizer starting...');
    
    // Initialize visualizer scene when DOM is ready
    if (window.VisualizerScene) {
        const visualizer = new window.VisualizerScene();
    }
    
    // Add click handler to ensure audio context starts
    document.addEventListener('click', () => {
        if (window.audioAnalyzer && 
            window.audioAnalyzer.audioContext && 
            window.audioAnalyzer.audioContext.state === 'suspended') {
            window.audioAnalyzer.audioContext.resume();
        }
    }, { once: true });
});