class VisualizerRenderer {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = null;
        this.postProcessing = false;
        this.effects = {};
        this.clock = new THREE.Clock();
        
        this.init();
    }
    
    init() {
        const container = document.getElementById('visualizer-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Append renderer to container
        container.appendChild(this.renderer.domElement);
        
        // Set up resize handler
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Check if post-processing should be enabled
        this.checkPostProcessingSupport();
    }
    
    checkPostProcessingSupport() {
        // Don't enable post-processing for mobile or low-performance devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isLowPerformance = window.navigator.hardwareConcurrency && window.navigator.hardwareConcurrency < 4;
        
        if (!isMobile && !isLowPerformance) {
            this.setupPostProcessing();
        }
    }
    
    setupPostProcessing() {
        // Import necessary Three.js post-processing modules
        // Note: This method assumes that the EffectComposer and related passes are available
        // You may need to include additional scripts in your HTML
        
        try {
            this.postProcessing = true;
            
            // Create effect composer
            this.effects.composer = new THREE.EffectComposer(this.renderer);
            
            // Add render pass
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.effects.composer.addPass(renderPass);
            
            // Add bloom effect
            const bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                0.5,    // strength
                0.4,    // radius
                0.85    // threshold
            );
            this.effects.composer.addPass(bloomPass);
            this.effects.bloomPass = bloomPass;
            
            console.log('Post-processing initialized');
        } catch (e) {
            console.warn('Post-processing initialization failed:', e);
            this.postProcessing = false;
        }
    }
    
    onWindowResize() {
        const container = document.getElementById('visualizer-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Update camera
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(width, height);
        
        // Update post-processing if enabled
        if (this.postProcessing && this.effects.composer) {
            this.effects.composer.setSize(width, height);
        }
    }
    
    updatePostProcessing(audioData) {
        if (!this.postProcessing || !audioData) return;
        
        // Update bloom effect based on audio data
        if (this.effects.bloomPass) {
            // Scale bloom strength based on volume
            this.effects.bloomPass.strength = 0.3 + audioData.volume * 0.7;
        }
    }
    
    render() {
        if (this.postProcessing && this.effects.composer) {
            this.effects.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}