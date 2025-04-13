class VisualizerScene {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = null;
        this.renderer = null;
        this.bassEffect = null;
        this.trebleEffect = null;
        this.volumeEffect = null;
        
        // Initialize
        this.init();
        this.animate();
    }
    
    init() {
        // Get container dimensions
        const container = document.getElementById('visualizer-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
        this.camera.position.z = window.CONFIG.visualizer.cameraDistance;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000, 0);
        container.appendChild(this.renderer.domElement);
        
        // Add window resize handler
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        // Add light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);
        
        // Create visual effects
        this.bassEffect = new window.BassEffect(this.scene);
        this.trebleEffect = new window.TrebleEffect(this.scene);
        this.volumeEffect = new window.VolumeEffect(this.scene);
    }
    
    onWindowResize() {
        const container = document.getElementById('visualizer-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Get audio data
        if (window.audioAnalyzer) {
            const audioData = window.audioAnalyzer.getAudioData();
            
            if (audioData) {
                // Update visual effects
                this.bassEffect.update(audioData.bass);
                this.trebleEffect.update(audioData.treble);
                this.volumeEffect.update(audioData.volume);
            }
        }
        
        // Rotate camera
        this.camera.rotation.y += window.CONFIG.visualizer.rotationSpeed;
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Export to window
window.VisualizerScene = VisualizerScene;