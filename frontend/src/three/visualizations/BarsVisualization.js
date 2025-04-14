// BarsVisualization.js
// Handles the bars visualization type for the audio visualizer

import * as THREE from 'three';

// Configuration for bars visualization
const config = {
  numBars: 64,
  spacing: 1,
  color: 0x1db954,
  maxHeight: 15
};

/**
 * Create bars visualization
 * @param {THREE.Scene} scene - Three.js scene
 * @returns {Array} - Array of bar meshes
 */
export function createBarsVisualization(scene) {
  const bars = [];
  const { numBars, spacing } = config;
  
  for (let i = 0; i < numBars; i++) {
    const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
    const material = new THREE.MeshPhongMaterial({ 
      color: config.color,
      specular: 0x666666,
      shininess: 30,
      emissive: 0x222222
    });
    const bar = new THREE.Mesh(geometry, material);
    bar.position.x = (i - numBars / 2) * spacing;
    // Start with minimum height
    bar.scale.y = 0.1;
    bar.position.y = bar.scale.y / 2;
    bars.push(bar);
    scene.add(bar);
  }
  
  return bars;
}

/**
 * Remove bars visualization from scene
 * @param {Array} bars - Array of bar meshes
 * @param {THREE.Scene} scene - Three.js scene
 */
export function removeBarsVisualization(bars, scene) {
  bars.forEach(bar => {
    scene.remove(bar);
    bar.geometry.dispose();
    bar.material.dispose();
  });
}

/**
 * Update bars visualization based on audio data
 * @param {Array} bars - Array of bar meshes
 * @param {number} powerLevel - Current audio power level (0-1)
 * @param {number} pulseTime - Beat pulse effect time (0-1)
 * @param {boolean} isPaused - Whether playback is paused
 * @param {number} animationTime - Current animation time
 * @param {Object} audioFeatures - Audio features from Spotify API
 */
export function updateBarsVisualization(bars, powerLevel, pulseTime, isPaused, animationTime, audioFeatures) {
  if (bars.length === 0) return;
  
  // Use audio features to influence visualization
  const energy = audioFeatures ? audioFeatures.energy : 0.5;
  const valence = audioFeatures ? audioFeatures.valence : 0.5; // happiness
  const danceability = audioFeatures ? audioFeatures.danceability : 0.5;
  
  // Beat pulse modifier
  const beatPulse = isPaused ? 1 : 1 + pulseTime;
  
  // Create frequency distribution simulation (since we don't have real-time frequency data)
  const frequencyDistribution = [];
  for (let i = 0; i < bars.length; i++) {
    // Base height uses a quadratic distribution to simulate frequency response
    // Lower frequencies (left) and higher frequencies (right) have more energy
    let height;
    
    if (isPaused) {
      // When paused, just show a very minimal equalized bar pattern
      height = 0.5 + Math.sin(i / bars.length * Math.PI) * 0.4;
    } else {
      height = Math.pow(Math.sin(i / bars.length * Math.PI), 2);
      
      // Add random noise that changes over time
      height += 0.3 * Math.sin(animationTime * 2 + i * 0.2) * energy;
      
      // Add harmonic patterns based on music characteristics
      if (danceability > 0.6) {
        // More rhythmic patterns for danceable tracks
        const tempo = audioFeatures ? audioFeatures.tempo / 60 : 2; // Beats per second
        height += 0.4 * Math.sin(animationTime * tempo * 2 + i * 0.1) * danceability;
      }
      
      // Scale by current music power and beat pulse
      height *= powerLevel * config.maxHeight * beatPulse;
    }
    
    // Ensure minimum height but keep it low when paused
    height = Math.max(height, isPaused ? 0.1 : 0.5);
    
    frequencyDistribution.push(height);
  }
  
  // Update bars
  bars.forEach((bar, i) => {
    // Height based on simulated frequency
    const targetHeight = frequencyDistribution[i];
    
    // Smoothly animate towards target height
    bar.scale.y = bar.scale.y * 0.9 + targetHeight * 0.1;
    bar.position.y = bar.scale.y / 2;
    
    // Color based on position, valence (happiness) and energy
    const hue = (i / bars.length) * 0.3 + 0.3 + ((valence - 0.5) * 0.2);
    const saturation = isPaused ? 0.5 : 0.8 + energy * 0.2;
    const lightness = isPaused ? 0.3 : 0.4 + pulseTime * 0.2;
    bar.material.color.setHSL(hue, saturation, lightness);
    
    // Emissive color for glow effect during beats
    const emissiveIntensity = isPaused ? 0 : Math.min(0.3, pulseTime * 0.3);
    bar.material.emissive.setHSL(hue, saturation, emissiveIntensity);
    
    // Add some rotation based on position and danceability - minimal when paused
    const rotationSpeed = isPaused ? 0.01 : 0.2 + danceability * 0.5;
    bar.rotation.y = animationTime * rotationSpeed + i * 0.05;
  });
}

// Export configuration for other modules to access
export { config };