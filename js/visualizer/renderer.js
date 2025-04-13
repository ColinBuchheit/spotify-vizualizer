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
            console.log('Post-processing support detected but skipped for this implementation');
            // We're not implementing post-processing in this version
            // to avoid additional dependencies
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
    }
    
    updatePostProcessing(audioData) {
        // Stub for future implementation
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

// Export to window
window.VisualizerRenderer = VisualizerRenderer;