import * as THREE from 'three';
import { loadShader } from '../utils/loadShader.js';
import { remap, lerp } from '../utils/math.js';

export function createVisualizer(scene) {
  // Create main group to hold all visualizers
  const visualizers = {
    Bars: createBarsVisualizer(scene),
    Galaxy: createGalaxyVisualizer(scene),
    Wave: createWaveVisualizer(scene),
    Pulse: createPulseVisualizer(scene)
  };
  
  let activeVisualizer = 'Bars';
  let smoothedData = new Array(128).fill(0);
  let uniforms = {
    uTime: { value: 0 },
    uAudioData: { value: new Float32Array(64) }
  };
  
  // Listen for theme changes
  window.addEventListener('themeChange', (event) => {
    const { theme } = event.detail;
    setActiveVisualizer(theme);
  });
  
  function setActiveVisualizer(name) {
    // Hide all visualizers
    Object.keys(visualizers).forEach(key => {
      visualizers[key].visible = false;
    });
    
    // Show the selected one
    if (visualizers[name]) {
      visualizers[name].visible = true;
      activeVisualizer = name;
    }
  }
  
  // Set initial active visualizer
  setActiveVisualizer('Bars');
  
  return {
    update: (freqData) => {
      // Update time uniform for all shaders
      uniforms.uTime.value += 0.01;
      
      // Smooth the frequency data for more pleasing visuals
      for (let i = 0; i < freqData.length; i++) {
        smoothedData[i] = lerp(smoothedData[i], freqData[i] / 255.0, 0.3);
        
        if (i < 64) {
          uniforms.uAudioData.value[i] = smoothedData[i];
        }
      }
      
      // Update the current active visualizer
      if (activeVisualizer === 'Bars') {
        updateBarsVisualizer(visualizers.Bars, smoothedData);
      } else if (activeVisualizer === 'Galaxy') {
        updateGalaxyVisualizer(visualizers.Galaxy, smoothedData, uniforms);
      } else if (activeVisualizer === 'Wave') {
        updateWaveVisualizer(visualizers.Wave, smoothedData, uniforms);
      } else if (activeVisualizer === 'Pulse') {
        updatePulseVisualizer(visualizers.Pulse, smoothedData, uniforms);
      }
    }
  };
}

// Bar Visualizer
function createBarsVisualizer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  
  const barCount = 64;
  const bars = [];
  
  for (let i = 0; i < barCount; i++) {
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${(i / barCount) * 360}, 100%, 50%)`),
      metalness: 0.8,
      roughness: 0.2,
      emissive: new THREE.Color(`hsl(${(i / barCount) * 360}, 100%, 20%)`),
      emissiveIntensity: 0.5
    });
    
    const bar = new THREE.Mesh(geometry, material);
    bar.position.x = i - barCount / 2;
    group.add(bar);
    bars.push(bar);
  }
  
  // Add rotation to the whole group
  group.rotation.x = -0.2;
  
  // Create a circular layout
  bars.forEach((bar, i) => {
    const angle = (i / barCount) * Math.PI * 2;
    const radius = 12;
    bar.position.x = Math.cos(angle) * radius;
    bar.position.z = Math.sin(angle) * radius;
    bar.rotation.y = angle;
  });
  
  group.userData = { bars };
  return group;
}

function updateBarsVisualizer(group, freqData) {
  const { bars } = group.userData;
  
  bars.forEach((bar, i) => {
    const scale = Math.max(freqData[i] * 15, 0.1);
    bar.scale.y = scale;
    bar.position.y = scale / 2;
    
    // Update color based on amplitude
    const hue = (i / bars.length) * 360 + freqData[i] * 120;
    bar.material.color.setHSL(hue / 360, 1, 0.5 + freqData[i] * 0.5);
    bar.material.emissive.setHSL(hue / 360, 1, 0.2 + freqData[i] * 0.3);
  });
  
  // Rotate the entire group
  group.rotation.y += 0.003;
}

// Galaxy Visualizer
async function createGalaxyVisualizer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  
  // Load shaders
  const vertexShader = await loadShader('/src/shaders/galaxy.vert.glsl');
  const fragmentShader = await loadShader('/src/shaders/galaxy.frag.glsl');
  
  const particleCount = 5000;
  const geometry = new THREE.BufferGeometry();
  
  // Create particle positions and attributes
  const positions = new Float32Array(particleCount * 3);
  const indices = new Float32Array(particleCount);
  const colors = new Float32Array(particleCount * 3);
  
  // Generate a spiral galaxy
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.pow(Math.random(), 0.5) * 20;
    const spiralOffset = Math.random() * 0.5;
    
    const x = Math.cos(angle + radius * spiralOffset) * radius;
    const y = (Math.random() - 0.5) * 2;
    const z = Math.sin(angle + radius * spiralOffset) * radius;
    
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    
    indices[i] = i % 64;
    
    // Color based on distance from center
    const colorHue = (radius / 20) * 0.6 + 0.2;
    const saturation = 0.6 + Math.random() * 0.4;
    const lightness = 0.6 + Math.random() * 0.4;
    
    const color = new THREE.Color().setHSL(colorHue, saturation, lightness);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  // Create a custom shader material
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAudioData: { value: new Float32Array(64) }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexColors: true
  });
  
  const particles = new THREE.Points(geometry, material);
  group.add(particles);
  
  group.userData = { particles, material };
  group.visible = false;
  return group;
}

function updateGalaxyVisualizer(group, freqData, globalUniforms) {
  const { particles, material } = group.userData;
  
  // Update material uniforms
  material.uniforms.uTime.value = globalUniforms.uTime.value;
  material.uniforms.uAudioData.value = globalUniforms.uAudioData.value;
  
  // Rotate the galaxy based on bass frequencies
  const bassFreq = freqData.slice(0, 5).reduce((sum, val) => sum + val, 0) / 5;
  group.rotation.y += 0.001 + bassFreq * 0.005;
  group.rotation.x = Math.sin(globalUniforms.uTime.value * 0.2) * 0.2;
}

// Wave Visualizer
async function createWaveVisualizer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  
  // Load shaders
  const vertexShader = await loadShader('/src/shaders/wave.vert.glsl');
  const fragmentShader = await loadShader('/src/shaders/wave.frag.glsl');
  
  const geometry = new THREE.PlaneGeometry(50, 50, 128, 128);
  
  // Create a custom shader material
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAudioData: { value: new Float32Array(64) }
    },
    side: THREE.DoubleSide,
    wireframe: false
  });
  
  const plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI / 2;
  group.add(plane);
  
  group.userData = { plane, material };
  group.visible = false;
  return group;
}

function updateWaveVisualizer(group, freqData, globalUniforms) {
  const { material } = group.userData;
  
  // Update material uniforms
  material.uniforms.uTime.value = globalUniforms.uTime.value;
  material.uniforms.uAudioData.value = globalUniforms.uAudioData.value;
  
  // Rotate the wave visualizer based on mid frequencies
  const midFreq = freqData.slice(20, 40).reduce((sum, val) => sum + val, 0) / 20;
  group.rotation.z += 0.005 + midFreq * 0.01;
}

// Pulse Visualizer
async function createPulseVisualizer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  
  // Load shaders
  const vertexShader = await loadShader('/src/shaders/pulse.vert.glsl');
  const fragmentShader = await loadShader('/src/shaders/pulse.frag.glsl');
  
  // Create a sphere geometry
  const sphereGeometry = new THREE.SphereGeometry(5, 64, 64);
  
  // Create a custom shader material
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAudioData: { value: new Float32Array(64) }
    },
    transparent: true,
    blending: THREE.AdditiveBlending
  });
  
  const sphere = new THREE.Mesh(sphereGeometry, material);
  group.add(sphere);
  
  // Add some orbital rings
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ringGeometry = new THREE.TorusGeometry(8 + i * 3, 0.1, 16, 100);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(i * 0.1 + 0.6, 1, 0.5),
      emissive: new THREE.Color().setHSL(i * 0.1 + 0.6, 1, 0.3),
      metalness: 0.8,
      roughness: 0.2
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2 + Math.random() * 0.5;
    ring.rotation.y = Math.random() * Math.PI * 2;
    group.add(ring);
    rings.push(ring);
  }
  
  group.userData = { sphere, material, rings };
  group.visible = false;
  return group;
}

function updatePulseVisualizer(group, freqData, globalUniforms) {
  const { sphere, material, rings } = group.userData;
  
  // Update material uniforms
  material.uniforms.uTime.value = globalUniforms.uTime.value;
  material.uniforms.uAudioData.value = globalUniforms.uAudioData.value;
  
  // Rotate the sphere based on high frequencies
  const highFreq = freqData.slice(40, 60).reduce((sum, val) => sum + val, 0) / 20;
  
  // Scale the sphere based on bass
  const bassFreq = freqData.slice(0, 5).reduce((sum, val) => sum + val, 0) / 5;
  sphere.scale.set(
    1 + bassFreq * 0.2,
    1 + bassFreq * 0.2,
    1 + bassFreq * 0.2
  );
  
  // Animate the rings
  rings.forEach((ring, i) => {
    ring.rotation.z += 0.002 * (i + 1);
    ring.scale.set(
      1 + freqData[i * 20] * 0.1,
      1 + freqData[i * 20] * 0.1,
      1
    );
  });
  
  // Rotate the entire group
  group.rotation.y += 0.001 + highFreq * 0.003;
}