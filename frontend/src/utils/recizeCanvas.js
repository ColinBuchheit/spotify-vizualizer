export function handleCanvasResize(renderer, camera) {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
  
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
  }
  