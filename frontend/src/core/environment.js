import * as THREE from 'three';

export function createEnvironment(scene) {
  // Create a more immersive environment with dynamic lighting
  
  // Main lighting setup
  const ambientLight = new THREE.AmbientLight(0x111111, 0.8);
  scene.add(ambientLight);
  
  // Point lights for dynamic illumination
  const pointLight1 = new THREE.PointLight(0x3366ff, 1.0, 50);
  pointLight1.position.set(15, 10, 15);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xff6633, 1.0, 50);
  pointLight2.position.set(-15, -10, -15);
  scene.add(pointLight2);
  
  // Spotlight for dramatic effect
  const spotLight = new THREE.SpotLight(0xffffff, 1.5, 100, Math.PI / 6, 0.5);
  spotLight.position.set(0, 30, 0);
  spotLight.lookAt(0, 0, 0);
  scene.add(spotLight);
  
  // Add moving rim light
  const rimLight = new THREE.PointLight(0x00ffff, 1.2, 30);
  rimLight.position.set(0, 0, -20);
  scene.add(rimLight);
  
  // Background setup - starfield
  const starfield = createStarfield(scene);
  
  function createStarfield(scene) {
    // Create a starfield with thousands of stars at various distances
    const starCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      // Random positions in a sphere
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random colors with a bias toward blue/purple
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        // Blue-white stars (most common)
        colors[i * 3] = 0.8 + Math.random() * 0.2; // R
        colors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // G
        colors[i * 3 + 2] = 1.0; // B
      } else if (colorChoice < 0.8) {
        // Yellow-orange stars
        colors[i * 3] = 1.0; // R
        colors[i * 3 + 1] = 0.7 + Math.random() * 0.3; // G
        colors[i * 3 + 2] = 0.5 * Math.random(); // B
      } else if (colorChoice < 0.95) {
        // Blue stars
        colors[i * 3] = 0.5 * Math.random(); // R
        colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // G
        colors[i * 3 + 2] = 1.0; // B
      } else {
        // Red stars (rare)
        colors[i * 3] = 1.0; // R
        colors[i * 3 + 1] = 0.3 * Math.random(); // G
        colors[i * 3 + 2] = 0.3 * Math.random(); // B
      }
      
      // Random sizes
      sizes[i] = Math.random() * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    
    const starfield = new THREE.Points(geometry, material);
    scene.add(starfield);
    
    return {
      mesh: starfield,
      animate: (audioData) => {
        const time = Date.now() * 0.0001;
        starfield.rotation.y = time * 0.05;
        
        if (audioData) {
          // Make stars twinkle based on high frequencies
          const highFreqAvg = audioData.slice(40, 60).reduce((a, b) => a + b, 0) / 20 / 255;
          material.opacity = 0.6 + highFreqAvg * 0.4;
        }
      }
    };
  }
  
  // Set up dynamic fog
  scene.fog = new THREE.FogExp2(0x000000, 0.02);
  
  // Create a dark background with slight color
  const bgColor = new THREE.Color(0x000811);
  scene.background = bgColor;
  
  // Add post-processing or other environment effects here
  
  // Return an update function to animate environment elements
  return {
    update: (audioData) => {
      // Animate lights based on audio if we have it
      if (audioData) {
        // Get average bass response (first few frequency bins)
        const bassAvg = audioData.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
        const bassNormalized = bassAvg / 255;
        
        // Get average high frequency response
        const highAvg = audioData.slice(40, 60).reduce((a, b) => a + b, 0) / 20;
        const highNormalized = highAvg / 255;
        
        // Animate point lights based on audio
        pointLight1.intensity = 1.0 + bassNormalized * 2.0;
        pointLight2.intensity = 1.0 + highNormalized * 2.0;
        
        // Pulse the spot light
        spotLight.intensity = 1.5 + bassNormalized * 1.5;
        
        // Move rim light in a circle, speed based on mid frequencies
        const midAvg = audioData.slice(20, 30).reduce((a, b) => a + b, 0) / 10;
        const midNormalized = midAvg / 255;
        const time = Date.now() * 0.001;
        const radius = 20;
        rimLight.position.x = Math.sin(time * (0.2 + midNormalized * 0.5)) * radius;
        rimLight.position.z = Math.cos(time * (0.2 + midNormalized * 0.5)) * radius;
        
        // Adjust fog density based on overall energy
        const overallEnergy = audioData.reduce((a, b) => a + b, 0) / audioData.length / 255;
        scene.fog.density = 0.02 + overallEnergy * 0.01;
        
        // Animate starfield
        starfield.animate(audioData);
        
      } else {
        // Default animation when no audio data
        const time = Date.now() * 0.001;
        
        // Gently pulse the lights
        pointLight1.intensity = 1.0 + Math.sin(time * 0.5) * 0.3;
        pointLight2.intensity = 1.0 + Math.sin(time * 0.7 + 1) * 0.3;
        
        // Move rim light in a slow circle
        const radius = 20;
        rimLight.position.x = Math.sin(time * 0.1) * radius;
        rimLight.position.z = Math.cos(time * 0.1) * radius;
        
        // Animate starfield with null audio data
        starfield.animate(null);
      }
    }
  };
}