class TrebleEffect {
    constructor(scene) {
        this.scene = scene;
        this.particles = null;
        this.particleSystem = null;
        
        this.init();
    }
    
    init() {
        // Create treble visualization - particle system
        const particleCount = 1000;
        const particles = new THREE.BufferGeometry();
        
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        // Create particles in a sphere
        for (let i = 0; i < particleCount; i++) {
            // Position
            const radius = 100 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Color
            const color = new THREE.Color(CONFIG.visualizer.trebleColor);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        // Material
        const material = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 0.7
        });
        
        this.particleSystem = new THREE.Points(particles, material);
        this.particles = particles;
        
        this.scene.add(this.particleSystem);
    }
    
    update(trebleValue) {
        if (!this.particleSystem) return;
        
        // Update particle size based on treble
        this.particleSystem.material.size = 2 + trebleValue * 6;
        
        // Rotate particle system
        this.particleSystem.rotation.y += 0.002;
        
        // Get particles' positions
        const positions = this.particles.attributes.position.array;
        
        // Update particle positions
        for (let i = 0; i < positions.length; i += 3) {
            // Get vector to particle
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];
            
            // Calculate distance from center
            const distance = Math.sqrt(x*x + y*y + z*z);
            
            // Create pulsing effect
            const scaleFactor = 1 + trebleValue * 0.2 * Math.sin(Date.now() * 0.001 + distance * 0.01);
            
            // Apply scale factor
            const normalizedX = x / distance;
            const normalizedY = y / distance;
            const normalizedZ = z / distance;
            
            positions[i] = normalizedX * distance * scaleFactor;
            positions[i + 1] = normalizedY * distance * scaleFactor;
            positions[i + 2] = normalizedZ * distance * scaleFactor;
        }
        
        // Update buffer
        this.particles.attributes.position.needsUpdate = true;
    }
}