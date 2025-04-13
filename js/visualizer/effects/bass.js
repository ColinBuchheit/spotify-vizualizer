class BassEffect {
    constructor(scene) {
        this.scene = scene;
        this.spheres = [];
        
        this.init();
    }
    
    init() {
        // Create bass visualization - pulsing spheres
        const geometry = new THREE.SphereGeometry(50, 32, 32);
        const material = new THREE.MeshPhongMaterial({
            color: CONFIG.visualizer.bassColor,
            emissive: CONFIG.visualizer.bassColor,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        // Create multiple spheres for bass visualization
        for (let i = 0; i < 3; i++) {
            const sphere = new THREE.Mesh(geometry, material.clone());
            sphere.position.x = Math.sin(i * Math.PI * 2 / 3) * 200;
            sphere.position.z = Math.cos(i * Math.PI * 2 / 3) * 200;
            
            this.spheres.push(sphere);
            this.scene.add(sphere);
        }
    }
    
    update(bassValue) {
        // Scale spheres based on bass value
        this.spheres.forEach((sphere, index) => {
            const scale = 0.5 + bassValue * 2; // Scale from 0.5 to 2.5 based on bass
            const delay = index * 0.1; // Add slight delay to create wave effect
            
            sphere.scale.set(scale, scale, scale);
            sphere.material.emissiveIntensity = 0.2 + bassValue * 0.8;
            
            // Rotate spheres
            sphere.rotation.x += 0.01;
            sphere.rotation.y += 0.02;
        });
    }
}