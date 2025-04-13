// Enhanced ImmersiveVisualizer with more dynamic effects
import * as THREE from 'three';

export class ImmersiveVisualizer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.analyser = null;
    this.albumCover = null;
    this.particleSystem = null;
    this.waveCircle = null;
    this.initialized = false;
    this.time = 0;
    this.lastFrameTime = 0;
    
    // Camera animation
    this.cameraPosition = {
      current: new THREE.Vector3(0, 0, 20),
      target: new THREE.Vector3(0, 0, 20),
      lookAt: new THREE.Vector3(0, 0, 0)
    };
    
    // Audio reactive elements
    this.audioData = {
      bass: 0,
      midLow: 0,
      mid: 0,
      highMid: 0,
      high: 0,
      beatDetected: false,
      beatTime: 0,
      energy: 0
    };
    
    // Visual state
    this.visualState = {
      albumRotation: 0,
      particleScale: 1,
      waveAmplitude: 1,
      colorPulse: 0,
      bloomIntensity: 1.0
    };
    
    // Track data
    this.trackInfo = {
      albumImageLoaded: false,
      albumImageUrl: null,
      colorPalette: null
    };
    
    // Render targets and post-processing
    this.composer = null;
    this.effectPass = null;
    
    // Configuration
    this.config = {
      camera: {
        fov: 70,
        near: 0.1,
        far: 2000,
        dampingFactor: 0.05
      },
      particles: {
        count: 4000,
        size: { min: 0.05, max: 0.4 },
        speed: 0.2,
        responsiveness: 0.8
      },
      waves: {
        count: 256,
        amplitude: { min: 2, max: 10 },
        speed: 0.2,
        detail: 16
      },
      colors: {
        primary: new THREE.Color(0x1db954),    // Spotify green
        secondary: new THREE.Color(0x2e77ff),  // Blue
        accent: new THREE.Color(0xff1e88),     // Pink
        background: new THREE.Color(0x111111)  // Dark background
      },
      postprocessing: {
        enabled: true,
        bloom: {
          threshold: 0.3,
          strength: 1.0,
          radius: 0.7
        }
      }
    };
    
    // Visual modes
    this.visualModes = [
      'orbital',    // Particles orbiting album
      'waveform',   // Audio waveform visualization
      'nebula',     // Particle clouds that react to audio
      'geometric'   // Geometric shapes that pulse to the beat
    ];
    
    this.currentMode = this.visualModes[0];
    
    // Add Geometry collections
    this.geometries = {
      particles: null,
      waves: null,
      extras: []
    };
    
    // Store dynamic materials
    this.materials = {};
    
    // Animation frame ID
    this.animationFrameId = null;
    
    // Bind animate method
    this.animate = this.animate.bind(this);
  }
  
  /**
   * Initialize the visualizer
   * @param {HTMLElement} containerElement - DOM element to attach the renderer to
   */
  init(containerElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = this.config.colors.background;
    this.scene.fog = new THREE.FogExp2(this.config.colors.background, 0.001);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      this.config.camera.fov,
      window.innerWidth / window.innerHeight,
      this.config.camera.near,
      this.config.camera.far
    );
    this.camera.position.z = 20;
    
    // Create renderer with enhanced settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Append renderer to container
    containerElement.appendChild(this.renderer.domElement);
    
    // Add lighting system
    this.setupLighting();
    
    // Add album cover placeholder in center
    this.createAlbumCover();
    
    // Create particle system
    this.createParticleSystem();
    
    // Create wave system
    this.createWaveSystem();
    
    // Add post-processing
    if (this.config.postprocessing.enabled && window.innerWidth > 768) {
      this.setupPostProcessing();
    }
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.initialized = true;
    this.lastFrameTime = performance.now();
    
    // Start animation loop
    this.animate();
  }
  
  /**
   * Set up the lighting system
   */
  setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);
    
    // Point light that will pulse with the beat
    const mainLight = new THREE.PointLight(0x1db954, 1, 100);
    mainLight.position.set(0, 0, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 512;
    mainLight.shadow.mapSize.height = 512;
    this.scene.add(mainLight);
    this.mainLight = mainLight;
    
    // Directional light for highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Add subtle rim light for depth
    const rimLight = new THREE.DirectionalLight(0x2233ff, 0.3);
    rimLight.position.set(-5, -3, -5);
    this.scene.add(rimLight);
    this.rimLight = rimLight;
  }
  
  /**
   * Create or update album cover with image
   * @param {string} imageUrl - URL of album artwork
   */
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
    
    // Update track info
    if (imageUrl) {
      this.trackInfo.albumImageUrl = imageUrl;
      this.trackInfo.albumImageLoaded = false;
    }
    
    // Create a placeholder if no image URL is provided
    const texture = imageUrl 
      ? new THREE.TextureLoader().load(imageUrl, () => {
          this.trackInfo.albumImageLoaded = true;
          this.extractColorsFromAlbumArt(imageUrl);
        }) 
      : null;
      
    // Create album cover with beveled edges
    const geometry = new THREE.BoxGeometry(7, 7, 0.2);
    const material = new THREE.MeshPhysicalMaterial({
      color: texture ? 0xffffff : 0x1db954,
      map: texture,
      metalness: 0.1,
      roughness: 0.3,
      envMapIntensity: 0.8,
      reflectivity: 0.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2
    });
    
    this.albumCover = new THREE.Mesh(geometry, material);
    this.albumCover.castShadow = true;
    this.albumCover.receiveShadow = true;
    this.scene.add(this.albumCover);
    
    // Store material for later updates
    this.materials.albumCover = material;
    
    // Create glowing edges around album cover
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: this.config.colors.primary,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.albumCover.add(edges);
    
    // Store for animations
    this.materials.albumEdges = edgeMaterial;
  }
  
  /**
   * Create particle system that responds to music
   */
  createParticleSystem() {
    const count = this.config.particles.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    
    // Create particles in a spherical distribution around the album cover
    for (let i = 0; i < count; i++) {
      // Random spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 10 + Math.random() * 25;
      
      // Convert to Cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      // Assign colors based on position in space
      const hue = (Math.atan2(y, x) + Math.PI) / (Math.PI * 2);
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      // Random sizes
      sizes[i] = Math.random() * 
                 (this.config.particles.size.max - this.config.particles.size.min) + 
                 this.config.particles.size.min;
      
      // Random rotation angles and speeds for animation
      angles[i] = Math.random() * Math.PI * 2;
      speeds[i] = (0.5 + Math.random() * 0.5) * this.config.particles.speed;
    }
    
    // Create geometry with custom attributes
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    
    // Create shader material for particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        beatDetected: { value: 0.0 },
        energyBass: { value: 0.0 },
        energyMid: { value: 0.0 },
        energyHigh: { value: 0.0 },
        particleTexture: { value: new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAFFmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDAgNzkuMTYwNDUxLCAyMDE3LzA1LzA2LTAxOjA4OjIxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgKE1hY2ludG9zaCkiIHhtcDpDcmVhdGVEYXRlPSIyMDIwLTAzLTE5VDA4OjU4OjIwLTA3OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyMC0wMy0xOVQwODo1OTozNC0wNzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyMC0wMy0xOVQwODo1OTozNC0wNzowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpmZDhlNTljMC02NGJkLTQzNjEtOWRkOC0xZjczYTY4MjUxYmMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ZmQ4ZTU5YzAtNjRiZC00MzYxLTlkZDgtMWY3M2E2ODI1MWJjIiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9InhtcC5kaWQ6ZmQ4ZTU5YzAtNjRiZC00MzYxLTlkZDgtMWY3M2E2ODI1MWJjIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmZDhlNTljMC02NGJkLTQzNjEtOWRkOC0xZjczYTY4MjUxYmMiIHN0RXZ0OndoZW49IjIwMjAtMDMtMTlUMDg6NTg6MjAtMDc6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAoTWFjaW50b3NoKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4OJ5cwAAADTklEQVRYhbWXT2gcVRzHP9/3ZnZ2N3/abQoxDWqyKK1/IlaJJz0IgqQHe/GgCNKTIog3T4IKInoRRIWCFw96ULyJWhDqRQ9akJRYTCzBnahNS7q72exkdnbe/Dyks3aTbNom+m5v3ve9z+f9fu/3e/PQWpNmfS9FYTXbY6AIlIAtYA1YjOO4nObr+/4ToAXUA02M/gNcA9YKhUKYxjkAtOu6NeA1YAo4ChSBh4Au8AOwWalU5J6f7/vPAbeBp4Ht+OJAXa/Xt/r9/v+WwPO8aeAnYDYZQgWP3AL2pq4opXYTaK31quu6ny0uLv6TCrCwsPAxcGAPnGxdCMOw3mw27yaopJRdx3FcpdSFJEm6WQFUKpVuHMe+Uup8nucXgU4qQKPRaIVheKher/+RFQDAdd2GlPJwHMftVIB2u92t1WpTcRz/nDWB67obUkqZBfEAwGAwOLwPAjabTQngeV4OKKUYUkoRQGq7HcfB87wcgPYDmqaZJshx3RQiPcf/BHirVbkUUHnLKqQGsJK29MeA+ZQJtPZCGlvlrFZpxqWUWkqJvyoOwP4lPE2Yppn6NkgpkYYxHocWMCqrMplCpRT5fF5rrTuWZYXAsAD1ej0Mw7CbJAlaZxupD+C6Ls1mM9Jad8bTMC5ILPAN8HWWktJaqyRJEEIM6vX65jC4qqpBFEVbSZKE2aJoBFCpVLJarW4lSTK0F0bdsG27DbwJLGVJICLfJ0myYZJm0Wg0/gTOAPf2E15OxjVmKAAKwEvA84/CHyKK2t1qdW2jXK4MH7dCofA3MA+sP4J4RLPdrQ5Kpdnhde7gHkk58G6j0Wg9jNB13c1cLndUSvkGsJ7hcJsAF8vlcvlB+L59QAhxQQjxTb/fj/Zp36her3/Q6XQ+S5Lkm72s9/7QbDb/yuVy88CpfYg/7HQ6H0sprxwA3jdZrVar5fP5BeCVdrvd3Zmc8/l8AfgW+DLDfuW2Wq3zURRdnQTvqEKhEAEn5ubm3k5b2OzsrA2czpDXdaXU2bmrV69GSZJcmxS/JxnbtvcURAgxBcxMCL9pGMbxXq/325UrV8KHYXc1SXZprW1gFjiWJMnuLDSBn4UQJ1qt1hfAhZWVlWhS+N3/BEYoNm3KmEwGAAAAAElFTkSuQmCC') }
      },
      vertexShader: `
        attribute float size;
        attribute float angle;
        attribute float speed;
        
        uniform float time;
        uniform float beatDetected;
        uniform float energyBass;
        uniform float energyMid;
        uniform float energyHigh;
        
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          
          // Apply rotation around album
          float modifiedSpeed = speed * (1.0 + energyBass * 2.0);
          float rotationAngle = angle + time * modifiedSpeed;
          
          // Get original position
          vec3 pos = position;
          
          // Calculate distance from center
          float dist = length(pos);
          
          // Create pulsing effect when beat detected
          dist += sin(time * 4.0) * energyBass * 2.0;
          
          // Rotate based on time and energy levels
          float x = pos.x;
          float z = pos.z;
          
          // Apply vertical movement based on mid frequencies
          pos.y += sin(time * 2.0 + angle) * energyMid * 5.0;
          
          // Apply rotation based on bass frequencies
          float newX = x * cos(rotationAngle) - z * sin(rotationAngle);
          float newZ = x * sin(rotationAngle) + z * cos(rotationAngle);
          
          pos.x = newX;
          pos.z = newZ;
          
          // Beat reactive scaling
          float scale = 1.0 + beatDetected * 0.5;
          
          // Apply energyHigh to particle size
          float particleSize = size * (1.0 + energyHigh * 3.0) * scale;
          
          // Position in world
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Set final position
          gl_Position = projectionMatrix * mvPosition;
          
          // Set point size with perspective division
          gl_PointSize = particleSize * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform sampler2D particleTexture;
        uniform float beatDetected;
        uniform float energyBass;
        uniform float energyMid;
        uniform float energyHigh;
        
        varying vec3 vColor;
        
        void main() {
          // Sample particle texture
          vec4 texColor = texture2D(particleTexture, gl_PointCoord);
          
          // Create glow effect based on beat detection
          vec3 glow = mix(vColor, vec3(1.0), beatDetected * 0.5);
          
          // Mix color with energy levels
          vec3 finalColor = mix(glow, vec3(1.0, 1.0, 1.0), energyHigh * 0.5);
          
          // Apply alpha based on texture
          gl_FragColor = vec4(finalColor, texColor.a);
          
          // Discard transparent pixels for better performance
          if (gl_FragColor.a < 0.1) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });
    
    // Create particle system
    this.particleSystem = new THREE.Points(geometry, particleMaterial);
    this.scene.add(this.particleSystem);
    
    // Store material for updates
    this.materials.particles = particleMaterial;
  }
  
  /**
   * Create audio reactive wave system
   */
  createWaveSystem() {
    const segments = this.config.waves.count;
    const radius = 12;
    const detail = this.config.waves.detail;
    
    // Create circular wave geometry
    const waveGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);
    const indices = [];
    
    // Create circle points
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = Math.cos(theta) * radius;
      const y = Math.sin(theta) * radius;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;
      
      // Create line segments
      if (i < segments) {
        indices.push(i, i + 1);
      }
    }
    
    // Complete the loop
    indices.push(segments, 0);
    
    waveGeometry.setIndex(indices);
    waveGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create line material
    const waveMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waveform: { value: new Float32Array(segments) },
        energyBass: { value: 0.0 },
        energyMid: { value: 0.0 },
        energyHigh: { value: 0.0 },
        beatDetected: { value: 0.0 },
        color1: { value: new THREE.Color(this.config.colors.primary) },
        color2: { value: new THREE.Color(this.config.colors.accent) }
      },
      vertexShader: `
        uniform float time;
        uniform float waveform[${segments}];
        uniform float energyBass;
        uniform float energyMid;
        uniform float energyHigh;
        uniform float beatDetected;
        
        varying float vHeight;
        
        void main() {
          // Get original position
          vec3 pos = position;
          
          // Calculate angle in circle
          float angle = atan(pos.y, pos.x);
          if (angle < 0.0) angle += 3.14159 * 2.0;
          
          // Get index into waveform data
          int index = int(floor(angle / (3.14159 * 2.0) * ${segments}.0));
          
          // Get height from waveform data
          float height = waveform[index];
          
          // Calculate new radius with audio reactivity
          float baseRadius = length(vec2(pos.x, pos.y));
          float waveHeight = height * (4.0 + energyMid * 8.0);
          
          // Apply beat detection for pulsing
          waveHeight *= (1.0 + beatDetected * 0.3);
          
          // Calculate bass-driven time offset
          float timeOffset = time * (0.2 + energyBass * 0.5);
          
          // Add subtle oscillation
          waveHeight += sin(angle * 8.0 + timeOffset) * 0.3 * energyHigh;
          
          // Calculate new position
          float newRadius = baseRadius + waveHeight;
          float scale = newRadius / baseRadius;
          
          // Set new position
          pos.x *= scale;
          pos.y *= scale;
          
          // Add some z-movement based on height
          pos.z = waveHeight * 0.2;
          
          // Pass height to fragment shader
          vHeight = height;
          
          // Set final position
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float energyBass;
        uniform float energyMid;
        uniform float energyHigh;
        uniform float beatDetected;
        uniform vec3 color1;
        uniform vec3 color2;
        
        varying float vHeight;
        
        void main() {
          // Generate color based on height and energy
          float colorMix = vHeight * 2.0 + energyHigh;
          
          // Create a gradient between the two colors
          vec3 finalColor = mix(color1, color2, colorMix);
          
          // Make colors brighter when beat is detected
          finalColor = mix(finalColor, vec3(1.0), beatDetected * 0.3);
          
          // Add time-based color pulsing
          float pulse = sin(time * 3.0) * 0.5 + 0.5;
          finalColor = mix(finalColor, vec3(1.0, 1.0, 1.0), pulse * energyBass * 0.2);
          
          // Set final color with glow intensity
          float alpha = 0.7 + energyMid * 0.3;
          gl_FragColor = vec4(finalColor, alpha);
        }`
      ,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    // Create wave circle
    this.waveCircle = new THREE.LineLoop(waveGeometry, waveMaterial);
    this.waveCircle.rotation.x = Math.PI / 2; // Make it horizontal
    this.waveCircle.position.set(0, 0, 0);
    this.scene.add(this.waveCircle);
    
    // Store material for updates
    this.materials.wave = waveMaterial;
    
    // Store initial waveform data
    this.waveformData = new Float32Array(segments);
    for (let i = 0; i < segments; i++) {
      this.waveformData[i] = 0;
    }
  }
  
  /**
   * Set up post-processing effects (commented out for compatibility)
   */
  setupPostProcessing() {
    // Note: Full implementation would use Three.js post-processing modules
    console.log('Post-processing is commented out for compatibility');
  }
  
  /**
   * Extract dominant colors from album artwork
   * @param {string} imageUrl - URL of album artwork
   */
  extractColorsFromAlbumArt(imageUrl) {
    // This would ideally use a color extraction library
    // For now, we'll simulate by generating a color palette
    
    // Generate a palette based on shifting the primary color
    const baseHue = Math.random();
    const colorPalette = {
      primary: new THREE.Color().setHSL(baseHue, 0.8, 0.6),
      secondary: new THREE.Color().setHSL((baseHue + 0.33) % 1, 0.7, 0.5),
      accent: new THREE.Color().setHSL((baseHue + 0.66) % 1, 0.9, 0.5),
      dark: new THREE.Color().setHSL(baseHue, 0.7, 0.2)
    };
    
    // Store color palette
    this.trackInfo.colorPalette = colorPalette;
    
    // Update material colors
    if (this.materials.albumEdges) {
      this.materials.albumEdges.color = colorPalette.primary;
    }
    
    if (this.mainLight) {
      this.mainLight.color = colorPalette.primary;
    }
    
    if (this.rimLight) {
      this.rimLight.color = colorPalette.secondary;
    }
    
    // Update particle colors
    if (this.particleSystem && this.particleSystem.geometry.attributes.color) {
      const colors = this.particleSystem.geometry.attributes.color.array;
      
      for (let i = 0; i < colors.length; i += 3) {
        const mix = Math.random();
        
        if (mix < 0.5) {
          colors[i] = colorPalette.primary.r;
          colors[i + 1] = colorPalette.primary.g;
          colors[i + 2] = colorPalette.primary.b;
        } else if (mix < 0.8) {
          colors[i] = colorPalette.secondary.r;
          colors[i + 1] = colorPalette.secondary.g;
          colors[i + 2] = colorPalette.secondary.b;
        } else {
          colors[i] = colorPalette.accent.r;
          colors[i + 1] = colorPalette.accent.g;
          colors[i + 2] = colorPalette.accent.b;
        }
      }
      
      this.particleSystem.geometry.attributes.color.needsUpdate = true;
    }
    
    // Update wave colors
    if (this.materials.wave) {
      this.materials.wave.uniforms.color1.value = colorPalette.primary;
      this.materials.wave.uniforms.color2.value = colorPalette.accent;
    }
  }
  
  /**
   * Update the album cover image
   * @param {string} imageUrl - URL of album artwork
   */
  updateAlbumCover(imageUrl) {
    if (!imageUrl || imageUrl === this.trackInfo.albumImageUrl) {
      return; // Same image or no image provided
    }
    
    this.createAlbumCover(imageUrl);
  }
  
  /**
   * Update audio data for visualization
   * @param {Object} audioData - Audio analysis data from AudioAnalyzer
   */
  updateAudioData(audioData) {
    if (!audioData) return;
    
    // Store audio data
    this.audioData.bass = audioData.energyByBand.bass || 0;
    this.audioData.midLow = audioData.energyByBand.midLow || 0;
    this.audioData.mid = audioData.energyByBand.mid || 0;
    this.audioData.highMid = audioData.energyByBand.highMid || 0;
    this.audioData.high = audioData.energyByBand.high || 0;
    
    // Update beat detection
    this.audioData.beatDetected = audioData.beatDetected || false;
    if (this.audioData.beatDetected) {
      this.audioData.beatTime = performance.now() / 1000;
      this.audioData.beatIntensity = audioData.beatIntensity || 1.0;
    }
    
    // Update waveform data if available
    if (audioData.waveform && this.waveformData && this.waveformData.length > 0) {
      const sourceLength = audioData.waveform.length;
      const targetLength = this.waveformData.length;
      
      // Resample waveform data to fit our buffer
      for (let i = 0; i < targetLength; i++) {
        const sourceIdx = Math.floor((i / targetLength) * sourceLength);
        
        // Normalize from 0-255 to 0-1
        if (audioData.waveform[sourceIdx] !== undefined) {
          // Convert to -1 to 1 range and take absolute value for visualization
          const value = Math.abs((audioData.waveform[sourceIdx] / 128.0) - 1.0);
          this.waveformData[i] = value;
        }
      }
      
      // Apply smoothing
      for (let i = 0; i < targetLength; i++) {
        const prev = (i > 0) ? this.waveformData[i - 1] : this.waveformData[targetLength - 1];
        const next = (i < targetLength - 1) ? this.waveformData[i + 1] : this.waveformData[0];
        
        this.waveformData[i] = (prev + this.waveformData[i] + next) / 3;
      }
      
      // Update uniform in wave material
      if (this.materials.wave && this.materials.wave.uniforms.waveform) {
        this.materials.wave.uniforms.waveform.value = this.waveformData;
      }
    }
    
    // Update visualizer materials based on audio data
    this.updateMaterials();
  }
  
  /**
   * Update materials based on audio data
   */
  updateMaterials() {
    // Calculate normalized energy values
    const bassEnergy = this.audioData.bass;
    const midEnergy = this.audioData.mid;
    const highEnergy = this.audioData.high;
    
    // Calculate average energy
    const avgEnergy = (bassEnergy + midEnergy + highEnergy) / 3;
    
    // Calculate beat response (decay over time)
    const timeSinceLastBeat = (performance.now() / 1000) - this.audioData.beatTime;
    const beatResponse = this.audioData.beatDetected ? 1.0 : Math.max(0, 1.0 - timeSinceLastBeat * 5.0);
    
    // Update particle material uniforms
    if (this.materials.particles) {
      this.materials.particles.uniforms.time.value = this.time;
      this.materials.particles.uniforms.beatDetected.value = beatResponse;
      this.materials.particles.uniforms.energyBass.value = bassEnergy;
      this.materials.particles.uniforms.energyMid.value = midEnergy;
      this.materials.particles.uniforms.energyHigh.value = highEnergy;
    }
    
    // Update wave material uniforms
    if (this.materials.wave) {
      this.materials.wave.uniforms.time.value = this.time;
      this.materials.wave.uniforms.beatDetected.value = beatResponse;
      this.materials.wave.uniforms.energyBass.value = bassEnergy;
      this.materials.wave.uniforms.energyMid.value = midEnergy;
      this.materials.wave.uniforms.energyHigh.value = highEnergy;
    }
    
    // Update album cover animations
    if (this.albumCover) {
      // Make album rotate faster with higher energy
      const rotationSpeed = 0.2 + avgEnergy * 0.5;
      
      // Rotate album cover based on energy
      this.albumCover.rotation.y += rotationSpeed * 0.01;
      
      // Make album pulse with beat
      if (this.audioData.beatDetected) {
        const scaleFactor = 1.0 + beatResponse * 0.05;
        this.albumCover.scale.set(scaleFactor, scaleFactor, scaleFactor);
      } else {
        // Smoothly return to normal scale
        this.albumCover.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
      
      // Make album edges glow with high frequencies
      if (this.materials.albumEdges) {
        // Get color based on high frequency content
        const edgeColor = new THREE.Color();
        
        if (this.trackInfo.colorPalette) {
          edgeColor.copy(this.trackInfo.colorPalette.primary);
        } else {
          edgeColor.set(this.config.colors.primary);
        }
        
        // Brighten color with high frequencies
        edgeColor.r = Math.min(1, edgeColor.r + highEnergy * 0.5);
        edgeColor.g = Math.min(1, edgeColor.g + highEnergy * 0.5);
        edgeColor.b = Math.min(1, edgeColor.b + highEnergy * 0.5);
        
        this.materials.albumEdges.color = edgeColor;
        this.materials.albumEdges.opacity = 0.7 + highEnergy * 0.3;
      }
    }
    
    // Update lights
    if (this.mainLight) {
      // Pulse light intensity with beat
      this.mainLight.intensity = 1.0 + beatResponse * 2.0;
      
      // Pulse light position slightly with mid frequencies
      this.mainLight.position.y = 2.0 + midEnergy * 4.0;
    }
  }
  
  /**
   * Handle window resize
   */
  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    
    // Update camera aspect ratio
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Update post-processing composer if available
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }
  
  /**
   * Main animation loop
   */
  animate() {
    if (!this.initialized) return;
    
    // Request next animation frame
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    // Calculate delta time
    const currentTime = performance.now();
    const delta = (currentTime - this.lastFrameTime) / 1000; // convert to seconds
    this.lastFrameTime = currentTime;
    
    // Update time
    this.time += delta;
    
    // Update camera movement
    this.updateCamera(delta);
    
    // Render scene
    if (this.composer && this.config.postprocessing.enabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  /**
   * Update camera position and rotation
   * @param {number} delta - Time delta in seconds
   */
  updateCamera(delta) {
    if (!this.camera) return;
    
    // Calculate target camera position based on audio energy
    const bassDriven = this.audioData.bass * 5.0;
    const midDriven = this.audioData.mid * 3.0;
    
    // Calculate camera movement speed based on energy
    const moveSpeed = 0.5 + this.audioData.bass * 0.5;
    
    // Calculate new target position
    const angle = this.time * 0.1 * moveSpeed;
    const radius = 20 + Math.sin(this.time * 0.2) * 2.0 + bassDriven;
    
    // Set circular motion target around the center
    this.cameraPosition.target.x = Math.sin(angle) * radius;
    this.cameraPosition.target.z = Math.cos(angle) * radius;
    
    // Add vertical movement based on mid frequencies
    this.cameraPosition.target.y = Math.sin(this.time * 0.3) * 3.0 + midDriven;
    
    // Smoothly move current position toward target
    this.cameraPosition.current.lerp(this.cameraPosition.target, delta * 2.0);
    
    // Set camera position
    this.camera.position.copy(this.cameraPosition.current);
    
    // Always look at the center with slight offsets based on audio
    const lookAtX = Math.sin(this.time * 0.4) * this.audioData.mid * 2.0;
    const lookAtY = Math.sin(this.time * 0.5) * this.audioData.high * 2.0;
    
    this.camera.lookAt(lookAtX, lookAtY, 0);
  }
  
  /**
   * Change the current visualization mode
   * @param {string} mode - The mode to switch to
   */
  setVisualizationMode(mode) {
    if (!this.visualModes.includes(mode)) {
      console.warn(`Unknown visualization mode: ${mode}`);
      return;
    }
    
    this.currentMode = mode;
    
    // Apply mode-specific changes
    switch (mode) {
      case 'orbital':
        // Default particle movement around album
        if (this.particleSystem) {
          this.particleSystem.visible = true;
        }
        if (this.waveCircle) {
          this.waveCircle.visible = true;
        }
        break;
        
      case 'waveform':
        // Focus on audio waveform
        if (this.particleSystem) {
          this.particleSystem.visible = false;
        }
        if (this.waveCircle) {
          this.waveCircle.visible = true;
          this.waveCircle.scale.set(1.5, 1.5, 1.5);
        }
        break;
        
      case 'nebula':
        // Cloudy particle effect
        if (this.particleSystem) {
          this.particleSystem.visible = true;
          // Would adjust particle shader here in a full implementation
        }
        if (this.waveCircle) {
          this.waveCircle.visible = false;
        }
        break;
        
      case 'geometric':
        // Geometric shapes
        if (this.particleSystem) {
          this.particleSystem.visible = true;
        }
        if (this.waveCircle) {
          this.waveCircle.visible = true;
        }
        // Would add geometric shapes here in a full implementation
        break;
    }
    
    console.log(`Visualization mode changed to: ${mode}`);
  }
  
  /**
   * Clean up and dispose of resources
   */
  dispose() {
    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
    
    // Dispose materials
    Object.values(this.materials).forEach(material => {
      if (material && typeof material.dispose === 'function') {
        material.dispose();
      }
    });
    
    // Dispose geometries
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
    }
    
    if (this.waveCircle) {
      this.waveCircle.geometry.dispose();
    }
    
    // Clear scene
    if (this.scene) {
      this.clearScene(this.scene);
    }
    
    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    console.log('Visualizer disposed');
  }
  
  /**
   * Clear all objects from a scene
   * @param {THREE.Scene} scene - Scene to clear
   */
  clearScene(scene) {
    while (scene.children.length > 0) {
      const object = scene.children[0];
      scene.remove(object);
      
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  }
}