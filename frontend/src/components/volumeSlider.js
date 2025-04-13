export function createVolumeSlider(onChange) {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = 0.5;
    slider.className = 'volume-slider';
  
    Object.assign(slider.style, {
      position: 'absolute',
      bottom: '20px',
      left: '10px',
      width: '200px',
    });
  
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      onChange(value);
    });
  
    document.body.appendChild(slider);
  }
  