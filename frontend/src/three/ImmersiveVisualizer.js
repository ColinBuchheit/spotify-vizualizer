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
   * Set up post-processing effects
   */
  setupPostProcessing() {
    try {
      // Import required Three.js addons for post-processing
      // This would normally be done at the top of the file but is shown here for clarity
      // Make sure to add the following to your imports:
      // import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
      // import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
      // import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
      // import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
      // import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
      
      // If these imports are working, you can uncomment this code to enable post-processing
      /*
      this.composer = new EffectComposer(this.renderer);
      
      // Add standard render pass
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // Add bloom pass for glow effects
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        this.config.postprocessing.bloom.strength,
        this.config.postprocessing.bloom.radius,
        this.config.postprocessing.bloom.threshold
      );
      this.composer.addPass(bloomPass);
      this.bloomPass = bloomPass;
      
      // Add output pass
      const outputPass = new OutputPass();
      this.composer.addPass(outputPass);
      */
      
      console.log('Post-processing setup succeeded');
    } catch (error) {
      console.error('Post-processing setup failed:', error);
      this.config.postprocessing.enabled = false;
    }
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
  }
}