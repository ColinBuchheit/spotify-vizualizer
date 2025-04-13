export function createVolumeSlider(onChange) {
    // Remove existing volume slider if present
    const existingSlider = document.querySelector('.volume-slider-container');
    if (existingSlider) {
      existingSlider.remove();
    }
    
    // Create container
    const container = document.createElement('div');
    container.className = 'volume-slider-container';
    
    // Create volume icon
    const volumeIcon = document.createElement('div');
    volumeIcon.className = 'volume-icon';
    volumeIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.5 8.25C14.5 8.25 16 9.75 16 12C16 14.25 14.5 15.75 14.5 15.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17.5 5.75C17.5 5.75 20.5 8.25 20.5 12C20.5 15.75 17.5 18.25 17.5 18.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.5 14V10C3.5 9.44772 3.94772 9 4.5 9H6.5L11 5V19L6.5 15H4.5C3.94772 15 3.5 14.5523 3.5 14Z" fill="currentColor"/>
      </svg>
    `;
    
    // Create volume value display
    const volumeValue = document.createElement('div');
    volumeValue.className = 'volume-value';
    volumeValue.textContent = '50%';
    
    // Create slider element
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = 0.5;
    slider.className = 'volume-slider';
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'volume-tooltip';
    tooltip.textContent = '50%';
    
    // Create volume level indicator
    const levelIndicator = document.createElement('div');
    levelIndicator.className = 'volume-level-indicator';
    
    const levelFill = document.createElement('div');
    levelFill.className = 'volume-level-fill';
    levelFill.style.width = '50%';
    
    levelIndicator.appendChild(levelFill);
    
    // Add elements to container
    container.appendChild(volumeIcon);
    container.appendChild(levelIndicator);
    container.appendChild(slider);
    container.appendChild(volumeValue);
    container.appendChild(tooltip);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .volume-slider-container {
        position: absolute;
        bottom: 20px;
        left: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(30, 30, 30, 0.7);
        padding: 12px 16px;
        border-radius: 30px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
        z-index: 100;
      }
      
      .volume-slider-container:hover {
        background: rgba(40, 40, 40, 0.8);
      }
      
      .volume-icon {
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 5px;
        cursor: pointer;
      }
      
      .volume-icon svg {
        transition: transform 0.3s ease;
      }
      
      .volume-icon:hover svg {
        transform: scale(1.1);
      }
      
      .volume-value {
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        min-width: 40px;
        text-align: right;
      }
      
      .volume-slider {
        -webkit-appearance: none;
        width: 120px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        outline: none;
        position: relative;
        z-index: 2;
        cursor: pointer;
      }
      
      .volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #1DB954;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.1s ease;
      }
      
      .volume-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #1DB954;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.1s ease;
      }
      
      .volume-slider:hover::-webkit-slider-thumb {
        transform: scale(1.2);
      }
      
      .volume-slider:active::-webkit-slider-thumb {
        transform: scale(1.3);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }
      
      .volume-tooltip {
        position: absolute;
        background: #1DB954;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        pointer-events: none;
        opacity: 0;
        transform: translateY(-30px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        white-space: nowrap;
      }
      
      .volume-tooltip::after {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px 5px 0;
        border-style: solid;
        border-color: #1DB954 transparent transparent;
      }
      
      .volume-level-indicator {
        position: absolute;
        width: 120px;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
        pointer-events: none;
      }
      
      .volume-level-fill {
        height: 100%;
        background: linear-gradient(90deg, #1DB954 0%, #1ed760 100%);
        border-radius: 2px;
        transition: width 0.1s ease;
      }
      
      .volume-slider-container.muted .volume-icon {
        color: #e74c3c;
      }
      
      .volume-slider-container.muted .volume-level-fill {
        background: #e74c3c;
      }
      
      /* Accessibility focus styles */
      .volume-slider:focus {
        outline: none;
      }
      
      .volume-slider:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.4);
      }
      
      /* Animation for tooltip */
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .volume-tooltip.active {
        animation: pulse 1s infinite;
      }
      
      /* Support for reduced motion preferences */
      @media (prefers-reduced-motion: reduce) {
        .volume-tooltip,
        .volume-level-fill,
        .volume-slider::-webkit-slider-thumb,
        .volume-icon svg {
          transition: none;
        }
        
        .volume-tooltip.active {
          animation: none;
        }
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(container);
    
    // Track if sound is muted
    let isMuted = false;
    let lastVolume = 0.5; // Store last non-zero volume
    
    // Update volume display
    const updateVolumeDisplay = (value) => {
      const percent = Math.round(value * 100);
      volumeValue.textContent = `${percent}%`;
      levelFill.style.width = `${percent}%`;
      tooltip.textContent = `${percent}%`;
      
      // Update icon based on volume level
      if (value === 0 || isMuted) {
        volumeIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 14L22 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.5 14V10C3.5 9.44772 3.94772 9 4.5 9H6.5L11 5V19L6.5 15H4.5C3.94772 15 3.5 14.5523 3.5 14Z" fill="currentColor"/>
          </svg>
        `;
        container.classList.add('muted');
      } else if (value < 0.3) {
        volumeIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.5 8.25C14.5 8.25 16 9.75 16 12C16 14.25 14.5 15.75 14.5 15.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.5 14V10C3.5 9.44772 3.94772 9 4.5 9H6.5L11 5V19L6.5 15H4.5C3.94772 15 3.5 14.5523 3.5 14Z" fill="currentColor"/>
          </svg>
        `;
        container.classList.remove('muted');
      } else if (value < 0.7) {
        volumeIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.5 8.25C14.5 8.25 16 9.75 16 12C16 14.25 14.5 15.75 14.5 15.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.5 14V10C3.5 9.44772 3.94772 9 4.5 9H6.5L11 5V19L6.5 15H4.5C3.94772 15 3.5 14.5523 3.5 14Z" fill="currentColor"/>
          </svg>
        `;
        container.classList.remove('muted');
      } else {
        volumeIcon.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14.5 8.25C14.5 8.25 16 9.75 16 12C16 14.25 14.5 15.75 14.5 15.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17.5 5.75C17.5 5.75 20.5 8.25 20.5 12C20.5 15.75 17.5 18.25 17.5 18.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.5 14V10C3.5 9.44772 3.94772 9 4.5 9H6.5L11 5V19L6.5 15H4.5C3.94772 15 3.5 14.5523 3.5 14Z" fill="currentColor"/>
          </svg>
        `;
        container.classList.remove('muted');
      }
    };
    
    // Show the tooltip when interacting with slider
    const showTooltip = () => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(-40px)';
      
      // Position tooltip
      const sliderRect = slider.getBoundingClientRect();
      const thumbPosition = ((slider.value - slider.min) / (slider.max - slider.min)) * sliderRect.width;
      tooltip.style.left = `${thumbPosition}px`;
    };
    
    // Hide the tooltip
    const hideTooltip = () => {
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(-30px)';
    };
    
    // Update volume and trigger callback
    const updateVolume = (value) => {
      slider.value = value;
      updateVolumeDisplay(value);
      
      if (onChange && typeof onChange === 'function') {
        onChange(parseFloat(value));
      }
      
      // If volume is being set to non-zero, update lastVolume
      if (value > 0) {
        lastVolume = value;
      }
    };
    
    // Toggle mute state
    const toggleMute = () => {
      if (isMuted || parseFloat(slider.value) > 0) {
        isMuted = !isMuted;
        
        if (isMuted) {
          // Save current volume and set to 0
          lastVolume = Math.max(parseFloat(slider.value), 0.1);
          updateVolume(0);
        } else {
          // Restore previous volume
          updateVolume(lastVolume);
        }
        
        // Show temporary indicator
        tooltip.textContent = isMuted ? 'Muted' : `${Math.round(lastVolume * 100)}%`;
        tooltip.classList.add('active');
        showTooltip();
        
        setTimeout(() => {
          tooltip.classList.remove('active');
          hideTooltip();
        }, 1500);
      }
    };
    
    // Add event listeners
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      updateVolumeDisplay(value);
      showTooltip();
      
      // If volume is manually set to 0, consider it as muted
      isMuted = value === 0;
      
      if (onChange && typeof onChange === 'function') {
        onChange(value);
      }
    });
    
    slider.addEventListener('mousedown', showTooltip);
    slider.addEventListener('touchstart', showTooltip, { passive: true });
    
    slider.addEventListener('mouseup', hideTooltip);
    slider.addEventListener('touchend', hideTooltip);
    slider.addEventListener('mouseleave', hideTooltip);
    
    // Add mute toggle on icon click
    volumeIcon.addEventListener('click', toggleMute);
    
    // Initialize with default value
    updateVolumeDisplay(0.5);
    
    // Return control methods
    return {
      element: container,
      slider,
      setVolume: (value) => {
        // Ensure value is within range
        const clampedValue = Math.min(1, Math.max(0, value));
        updateVolume(clampedValue);
      },
      getVolume: () => parseFloat(slider.value),
      mute: () => {
        if (!isMuted) {
          toggleMute();
        }
      },
      unmute: () => {
        if (isMuted) {
          toggleMute();
        }
      },
      toggleMute,
      hide: () => {
        container.style.display = 'none';
      },
      show: () => {
        container.style.display = 'flex';
      }
    };
  }