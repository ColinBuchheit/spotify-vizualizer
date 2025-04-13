import * as THREE from 'three';

export function createEnvironment(scene) {
  const light1 = new THREE.PointLight(0xffffff, 1.2);
  light1.position.set(10, 10, 10);
  scene.add(light1);

  const light2 = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(light2);

  scene.fog = new THREE.FogExp2(0x000000, 0.03);

  const bgColor = new THREE.Color(0x000000);
  scene.background = bgColor;
}
