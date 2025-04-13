// js/visualizer/post-processing.js
// Import post-processing modules
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Make available globally for other modules
window.THREE.EffectComposer = EffectComposer;
window.THREE.RenderPass = RenderPass;
window.THREE.UnrealBloomPass = UnrealBloomPass;
window.THREE.ShaderPass = ShaderPass;