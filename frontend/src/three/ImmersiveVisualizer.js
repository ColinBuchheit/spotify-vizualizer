// frontend/src/three/ImmersiveVisualizer.js

import * as THREE from 'three';

export class ImmersiveVisualizer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.analyser = null;
    this.albumCover = null;
    this.particles = [];
    this.wavePoints = [];
    this.initialized = false;
    this.time = 0;
    
    // Audio reactive elements
    this.bassIntensity = 0;
    this.midIntensity = 0;
    this.trebleIntensity = 0;
    this.beatDetected = false;
    this.beatTime = 0;
    
    // Configuration
    this.config = {
      particles: {
        count: 2000,
        size: 0.1,
        minSize: 0.05,
        maxSize: 0.3,
        speed: 0.2
      },
      waves: {
        count: 128,
        amplitude: 5,
        speed: 0.2
      },
      colors: {
        primary: new THREE.Color(0x1db954),    // Spotify green
        secondary: new THREE.Color(0x2e77ff),  // Blue
        accent: new THREE.Color(0xff1e88),     // Pink
        background: new THREE.Color(0x111111)  // Dark background
      }
    };
  }
  
  init(containerElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = this.config.colors.background;
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 20;
    
    // Create renderer with antialiasing and device pixel ratio optimization
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Append renderer to container
    containerElement.appendChild(this.renderer.domElement);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(0, 1, 1);
    this.scene.add(directionalLight);
    
    // Add album cover placeholder in center
    this.createAlbumCover();
    
    // Create particle system
    this.createParticleSystem();
    
    // Create wave system
    this.createWaveSystem();
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.initialized = true;
    
    // Start animation loop
    this.animate();
  }
  
  createAlbumCover(imageUrl) {
    // Remove existing album cover if any
    if (this.albumCover) {
      this.scene.remove(this.albumCover);
      if (this.albumCover.material.map) {
        this.albumCover.material.map.dispose();
      }
      this.albumCover.material.dispose();
      this.albumCover.geometry.dispose();
    }
    
    // Create a placeholder if no image URL is provided
    const texture = imageUrl 
      ? new THREE.TextureLoader().load(imageUrl) 
      : null;
      
    const geometry = new THREE.BoxGeometry(6, 6, 0.1);
    const material = new THREE.MeshPhongMaterial({
      color: texture ? 0xffffff : 0x1db954,
      map: texture,
      shininess: 30,
      emissive: 0x111111,
      emissiveIntensity: 0.1
    });
    
    this.albumCover = new THREE.Mesh(geometry, material);
    this.scene.add(this.albumCover);
    
    // Create glowing edges around album cover
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: this.config.colors.primary,
      linewidth: 2
    });
    
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.albumCover.add(edges);
  }
  
  createParticleSystem() {
    const { count, size } = this.config.particles;
    
    // Create instanced particles for better performance
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    
    // Distribute particles in a sphere around the album
    for (let i = 0; i < count; i++) {
      // Random position in a sphere
      const radius = 10 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Random scale
      scales[i] = size * (0.5 + Math.random());
      
      // Color gradient based on position
      const colorMix = Math.random();
      colors[i * 3] = this.config.colors.primary.r * (1 - colorMix) + this.config.colors.secondary.r * colorMix;
      colors[i * 3 + 1] = this.config.colors.primary.g * (1 - colorMix) + this.config.colors.secondary.g * colorMix;
      colors[i * 3 + 2] = this.config.colors.primary.b * (1 - colorMix) + this.config.colors.secondary.b * colorMix;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    // Create point material with custom shader for more control
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        beatIntensity: { value: 0 }
      },
      vertexShader: `
        attribute float scale;
        attribute vec3 color;
        uniform float time;
        uniform float beatIntensity;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          
          // Calculate position with some movement
          vec3 pos = position;
          float noise = sin(pos.x * 0.1 + time) * cos(pos.y * 0.1 + time * 0.5) * sin(pos.z * 0.1 + time * 0.3);
          
          // Add beat effect
          float beatEffect = 1.0 + beatIntensity * 0.3 * noise;
          pos *= beatEffect;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Size attenuation based on beat
          gl_PointSize = scale * (1.0 + beatIntensity * 0.5) * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create circle point
          float r = distance(gl_PointCoord, vec2(0.5, 0.5));
          if (r > 0.5) discard;
          
          // Add glow effect
          float glow = 0.5 - r;
          
          gl_FragColor = vec4(vColor * glow, glow * 2.0);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true
    });
    
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }
  
  createWaveSystem() {
    const { count, amplitude } = this.config.waves;
    
    // Create circular wave
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 8;
      
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = 0;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: this.config.colors.primary,
      linewidth: 2,
      transparent: true,
      opacity: 0.7
    });
    
    this.waveCircle = new THREE.LineLoop(geometry, material);
    this.scene.add(this.waveCircle);
    
    // Store original positions for wave animation
    this.waveCircle.userData.originalPositions = originalPositions;
  }
  
  updateAlbumCover(imageUrl) {
    if (!this.initialized) return;
    
    // Update with new image
    this.createAlbumCover(imageUrl);
  }
  
  setAudioAnalyser(analyser) {
    this.analyser = analyser;
  }
  
  updateAudioData(audioData) {
    if (!audioData) return;
    
    // Get frequency data
    const { frequencies, beatDetected } = audioData;
    
    if (frequencies) {
      // Split frequency range into bass, mid, treble
      const bassEnd = Math.floor(frequencies.length * 0.1);
      const midEnd = Math.floor(frequencies.length * 0.5);
      
      // Calculate average intensity for each range
      let bassSum = 0;
      for (let i = 0; i < bassEnd; i++) {
        bassSum += frequencies[i];
      }
      this.bassIntensity = bassSum / (bassEnd * 255); // Normalize to 0-1
      
      let midSum = 0;
      for (let i = bassEnd; i < midEnd; i++) {
        midSum += frequencies[i];
      }
      this.midIntensity = midSum / ((midEnd - bassEnd) * 255);
      
      let trebleSum = 0;
      for (let i = midEnd; i < frequencies.length; i++) {
        trebleSum += frequencies[i];
      }
      this.trebleIntensity = trebleSum / ((frequencies.length - midEnd) * 255);
    }
    
    // Handle beat detection
    if (beatDetected) {
      this.beatDetected = true;
      this.beatTime = this.time;
    } else if (this.time - this.beatTime > 0.3) {
      // Reset beat detection after a short time
      this.beatDetected = false;
    }
  }
  
  onWindowResize() {
    if (!this.initialized) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  animate() {
    if (!this.initialized) return;
    
    requestAnimationFrame(this.animate.bind(this));
    
    this.time += 0.016; // Approximate 60fps delta
    
    this.updateVisuals();
    this.render();
  }
  
  updateVisuals() {
    // Update beat intensity - either from detected beat or fallback to bass
    const beatIntensity = this.beatDetected ? 1.0 : this.bassIntensity * 0.7;
    
    // Smoothly decay beat effect
    const beatDecay = Math.max(0, 1 - (this.time - this.beatTime) * 3);
    const currentBeatEffect = Math.max(beatIntensity, beatDecay);
    
    // Update album cover
    if (this.albumCover) {
      // Pulse scale on beat
      const scale = 1 + currentBeatEffect * 0.05;
      this.albumCover.scale.set(scale, scale, 1);
      
      // Rotate slowly
      this.albumCover.rotation.y = this.time * 0.1;
      
      // Edges color based on frequency bands
      if (this.albumCover.children[0]) {
        const edgeColor = new THREE.Color().lerpColors(
          this.config.colors.primary,
          this.config.colors.accent,
          this.midIntensity
        );
        this.albumCover.children[0].material.color = edgeColor;
      }
    }
    
    // Update particle system
    if (this.particleSystem) {
      // Update shader uniforms
      this.particleSystem.material.uniforms.time.value = this.time;
      this.particleSystem.material.uniforms.beatIntensity.value = currentBeatEffect;
      
      // Rotate based on mid frequencies
      this.particleSystem.rotation.y = this.time * this.config.particles.speed;
      this.particleSystem.rotation.x = Math.sin(this.time * 0.2) * 0.2;
    }
    
    // Update wave circle
    if (this.waveCircle) {
      const positions = this.waveCircle.geometry.attributes.position.array;
      const originalPositions = this.waveCircle.userData.originalPositions;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const angle = (i / (positions.length / 3)) * Math.PI * 2;
        
        // Create wave effect
        const wave1 = Math.sin(angle * 8 + this.time * 2) * this.bassIntensity * 2;
        const wave2 = Math.sin(angle * 4 - this.time * 1.5) * this.midIntensity * 1.5;
        const wave3 = Math.sin(angle * 16 + this.time * 3) * this.trebleIntensity;
        
        const displacement = (wave1 + wave2 + wave3) * this.config.waves.amplitude;
        
        // Calculate direction from center
        const originalX = originalPositions[i * 3];
        const originalY = originalPositions[i * 3 + 1];
        const length = Math.sqrt(originalX * originalX + originalY * originalY);
        const dirX = originalX / length;
        const dirY = originalY / length;
        
        // Apply displacement in radial direction
        positions[i * 3] = originalX + dirX * displacement * (1 + currentBeatEffect);
        positions[i * 3 + 1] = originalY + dirY * displacement * (1 + currentBeatEffect);
      }
      
      this.waveCircle.geometry.attributes.position.needsUpdate = true;
      
      // Update color based on audio
      const waveColor = new THREE.Color().lerpColors(
        this.config.colors.primary,
        this.config.colors.secondary,
        this.midIntensity + this.trebleIntensity * 0.5
      );
      this.waveCircle.material.color = waveColor;
      
      // Update opacity based on treble
      this.waveCircle.material.opacity = 0.5 + this.trebleIntensity * 0.5;
    }
    
    // Move camera slightly for more dynamic feel
    this.camera.position.x = Math.sin(this.time * 0.2) * 2;
    this.camera.position.y = Math.cos(this.time * 0.3) * 1;
    this.camera.lookAt(0, 0, 0);
  }
  
  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  dispose() {
    if (!this.initialized) return;
    
    // Clean up resources
    if (this.albumCover) {
      this.scene.remove(this.albumCover);
      if (this.albumCover.material.map) {
        this.albumCover.material.map.dispose();
      }
      this.albumCover.material.dispose();
      this.albumCover.geometry.dispose();
    }
    
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      this.particleSystem.material.dispose();
    }
    
    if (this.waveCircle) {
      this.scene.remove(this.waveCircle);
      this.waveCircle.geometry.dispose();
      this.waveCircle.material.dispose();
    }
    
    this.renderer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}