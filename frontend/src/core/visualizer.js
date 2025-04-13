import * as THREE from 'three';

export function createVisualizer(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const barCount = 64;
  const bars = [];

  for (let i = 0; i < barCount; i++) {
    const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(`hsl(${(i / barCount) * 360}, 100%, 50%)`)
    });
    const bar = new THREE.Mesh(geometry, material);
    bar.position.x = i - barCount / 2;
    group.add(bar);
    bars.push(bar);
  }

  return {
    update: (freqData) => {
      bars.forEach((bar, i) => {
        const scale = (freqData[i] || 0) / 20;
        bar.scale.y = Math.max(scale, 0.1);
        bar.position.y = bar.scale.y / 2;
      });
    }
  };
}
