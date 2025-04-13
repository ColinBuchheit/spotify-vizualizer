import * as THREE from 'three';
import { createAudioManager } from './AudioManager.js';
import { createControls } from './Controls.js';
import { createEnvironment } from './environment.js';
import { createVisualizer } from './Visualizer.js';

let scene, camera, renderer, controls, visualizer, audioManager;

export function initScene() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 25);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  // Modules
  controls = createControls(camera, renderer.domElement);
  createEnvironment(scene);
  visualizer = createVisualizer(scene);
  audioManager = createAudioManager();

  // Start
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const freqData = audioManager.getFrequencyData();
  if (freqData) visualizer.update(freqData);

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
