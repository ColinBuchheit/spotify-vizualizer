class VolumeEffect {
    constructor(scene) {
        this.scene = scene;
        this.rings = [];
        
        this.init();
    }
    
    init() {
        // Create volume visualization - concentric rings
        for (let i = 0; i < 5; i++) {
            const radius = 100 + i * 40;
            const geometry = new THREE.TorusGeometry(radius, 5, 16, 100);
            const material = new THREE.MeshPhongMaterial({
                color: CONFIG.visualizer.volumeColor,
                emissive: CONFIG.visualizer.volumeColor,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.6 - i * 0.1
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.PI / 2;
            
            this.rings.push(ring);
            this.scene.add(ring);
        }
    }
    
    update(volumeValue) {
        // Update rings based on volume
        this.rings.forEach((ring, index) => {
            // Rotate rings
            ring.rotation.z += 0.01 * (index + 1) * 0.2;
            
            // Scale ring thickness with volume
            const thickness = 2 + volumeValue * 10;
            ring.geometry.parameters.tubularSegments = thickness;
            
            // Pulsate radius based on volume
            const radiusScale = 1 + volumeValue * 0.3 * Math.sin(Date.now() * 0.001 * (index + 1) * 0.3);
            ring.scale.set(radiusScale, radiusScale, 1);
            
            // Update emissive intensity
            ring.material.emissiveIntensity = 0.1 + volumeValue * 0.7;
        });
    }
}