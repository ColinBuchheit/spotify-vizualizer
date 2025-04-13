export function createSettingsPanel(options = {}) {
    // Default settings
    const defaultSettings = {
      quality: 'high',
      colorScheme: 'default',
      showFps: false,
      motionIntensity: 0.5,
      autoRotate: true,
      bassBoost: false,
      showLabels: true,
      ...options
    };
    
    // Current settings (will be updated by UI)
    let currentSettings = { ...defaultSettings };
    
    // Event callbacks
    const callbacks = {
      onChange: null,
    };
    
    // Remove existing settings panel if present
    const existingPanel = document.querySelector('.settings-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // Create container
    const container = document.createElement('div');
    container.className = 'settings-panel';
    container.setAttribute('aria-label', 'Visualization Settings Panel');
    
    // Create header
    const header = document.createElement('div');
    header.className = 'settings-header';
    header.innerHTML = `
      <h3>Settings</h3>
      <div class="settings-close" aria-label="Close settings">×</div>
    `;
    
    // Create content
    const content = document.createElement('div');
    content.className = 'settings-content';
    
    // Create settings groups
    const visualGroup = createSettingsGroup('Visual Settings');
    const performanceGroup = createSettingsGroup('Performance');
    const audioGroup = createSettingsGroup('Audio Settings');
    
    // Add settings to groups
    
    // Visual settings
    visualGroup.appendChild(
      createDropdown('colorScheme', 'Color Scheme', [
        { value: 'default', label: 'Default' },
        { value: 'neon', label: 'Neon' },
        { value: 'monochrome', label: 'Monochrome' },
        { value: 'pastel', label: 'Pastel' },
        { value: 'sunset', label: 'Sunset' },
        { value: 'ocean', label: 'Ocean' }
      ], currentSettings.colorScheme)
    );
    
    visualGroup.appendChild(
      createSlider('motionIntensity', 'Motion Intensity', 0, 1, 0.1, currentSettings.motionIntensity)
    );
    
    visualGroup.appendChild(
      createToggle('autoRotate', 'Auto Rotate', currentSettings.autoRotate)
    );
    
    visualGroup.appendChild(
      createToggle('showLabels', 'Show Labels', currentSettings.showLabels)
    );
    
    // Performance settings
    performanceGroup.appendChild(
      createDropdown('quality', 'Render Quality', [
        { value: 'low', label: 'Low (Better Performance)' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High (Better Visuals)' }
      ], currentSettings.quality)
    );
    
    performanceGroup.appendChild(
      createToggle('showFps', 'Show FPS Counter', currentSettings.showFps)
    );
    
    // Audio settings
    audioGroup.appendChild(
      createToggle('bassBoost', 'Bass Boost', currentSettings.bassBoost)
    );
    
    // Add groups to content
    content.appendChild(visualGroup);
    content.appendChild(performanceGroup);
    content.appendChild(audioGroup);
    
    // Add reset button
    const resetButton = document.createElement('button');
    resetButton.className = 'settings-reset';
    resetButton.textContent = 'Reset to Defaults';
    resetButton.addEventListener('click', () => {
      // Reset to defaults
      Object.keys(defaultSettings).forEach(key => {
        updateSetting(key, defaultSettings[key]);
        
        // Update UI to match
        const element = document.querySelector(`[data-setting="${key}"]`);
        if (element) {
          if (element.type === 'checkbox') {
            element.checked = defaultSettings[key];
          } else if (element.type === 'range') {
            element.value = defaultSettings[key];
            const valueDisplay = element.parentNode.querySelector('.slider-value');
            if (valueDisplay) {
              valueDisplay.textContent = defaultSettings[key];
            }
          } else {
            element.value = defaultSettings[key];
          }
        }
      });
      
      // Show confirmation message
      showMessage('Settings reset to defaults', 'success');
    });
    
    content.appendChild(resetButton);
    
    // Add message area for notifications
    const messageArea = document.createElement('div');
    messageArea.className = 'settings-message';
    messageArea.style.display = 'none';
    content.appendChild(messageArea);
    
    // Add elements to container
    container.appendChild(header);
    container.appendChild(content);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .settings-panel {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: rgba(20, 20, 20, 0.85);
        color: #fff;
        border-radius: 12px;
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        width: 90%;
        max-width: 400px;
        max-height: 90vh;
        z-index: 1000;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .settings-panel.visible {
        opacity: 1;
        pointer-events: auto;
        transform: translate(-50%, -50%) scale(1);
      }
      
      .settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        background: rgba(30, 30, 30, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .settings-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1DB954;
      }
      
      .settings-close {
        font-size: 24px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }
      
      .settings-close:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: rotate(90deg);
      }
      
      .settings-content {
        padding: 20px;
        overflow-y: auto;
        flex-grow: 1;
      }
      
      .settings-group {
        margin-bottom: 24px;
      }
      
      .settings-group-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.9);
        position: relative;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .settings-item {
        margin-bottom: 16px;
      }
      
      .settings-label {
        display: block;
        margin-bottom: 6px;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
      }
      
      /* Dropdown styling */
      .settings-dropdown {
        width: 100%;
        padding: 10px 12px;
        background: rgba(50, 50, 50, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #fff;
        font-size: 14px;
        appearance: none;
        cursor: pointer;
        transition: all 0.2s ease;
        background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E");
        background-repeat: no-repeat;
        background-position: right 12px top 50%;
        background-size: 10px auto;
        padding-right: 30px;
      }
      
      .settings-dropdown:hover {
        background-color: rgba(60, 60, 60, 0.7);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      .settings-dropdown:focus {
        outline: none;
        border-color: #1DB954;
        box-shadow: 0 0 0 2px rgba(29, 185, 84, 0.2);
      }
      
      .settings-dropdown option {
        background-color: #2a2a2a;
        color: #fff;
      }
      
      /* Slider styling */
      .slider-container {
        display: flex;
        flex-direction: column;
      }
      
      .slider-controls {
        display: flex;
        align-items: center;
      }
      
      .settings-slider {
        flex-grow: 1;
        height: 6px;
        -webkit-appearance: none;
        background: rgba(50, 50, 50, 0.6);
        border-radius: 3px;
        outline: none;
      }
      
      .settings-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #1DB954;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.8);
        transition: all 0.1s ease;
      }
      
      .settings-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #1DB954;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.8);
        transition: all 0.1s ease;
      }
      
      .settings-slider:hover::-webkit-slider-thumb {
        transform: scale(1.1);
      }
      
      .settings-slider:focus {
        outline: none;
      }
      
      .settings-slider:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.3);
      }
      
      .slider-value {
        margin-left: 12px;
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        width: 40px;
        text-align: center;
        background: rgba(0, 0, 0, 0.2);
        padding: 4px 8px;
        border-radius: 4px;
      }
      
      /* Toggle styling */
      .toggle-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 26px;
      }
      
      .toggle-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(50, 50, 50, 0.6);
        transition: .4s;
        border-radius: 26px;
      }
      
      .toggle-slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      input:checked + .toggle-slider {
        background-color: #1DB954;
      }
      
      input:focus + .toggle-slider {
        box-shadow: 0 0 1px #1DB954;
      }
      
      input:checked + .toggle-slider:before {
        transform: translateX(24px);
      }
      
      /* Reset button */
    .settings-reset {
      width: 100%;
      padding: 12px;
      background: rgba(200, 50, 50, 0.2);
      color: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(200, 50, 50, 0.3);
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 20px;
    }
    
    .settings-reset:hover {
      background: rgba(200, 50, 50, 0.3);
      transform: translateY(-2px);
    }
    
    .settings-reset:active {
      transform: translateY(0);
    }
    
    /* Message area */
    .settings-message {
      margin-top: 16px;
      padding: 10px;
      border-radius: 6px;
      font-size: 14px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .settings-message.success {
      background: rgba(29, 185, 84, 0.2);
      color: #1DB954;
      border: 1px solid rgba(29, 185, 84, 0.3);
    }
    
    .settings-message.error {
      background: rgba(200, 50, 50, 0.2);
      color: #ff5555;
      border: 1px solid rgba(200, 50, 50, 0.3);
    }
    
    /* Scrollbar styling */
    .settings-content::-webkit-scrollbar {
      width: 6px;
    }
    
    .settings-content::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 3px;
    }
    
    .settings-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    
    .settings-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    
    /* Animation for showing/hiding panel */
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    
    @keyframes fadeOut {
      from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      to { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    }
    
    /* Support for reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .settings-panel,
      .settings-panel.visible,
      .settings-close,
      .settings-close:hover,
      .settings-dropdown,
      .settings-slider::-webkit-slider-thumb,
      .settings-reset,
      .settings-reset:hover,
      .toggle-slider,
      .toggle-slider:before {
        transition: none;
        transform: none;
        animation: none;
      }
      
      .settings-panel.visible {
        transform: translate(-50%, -50%);
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Helper functions for creating settings UI elements
  
  // Create settings group
  function createSettingsGroup(title) {
    const group = document.createElement('div');
    group.className = 'settings-group';
    
    const groupTitle = document.createElement('h4');
    groupTitle.className = 'settings-group-title';
    groupTitle.textContent = title;
    
    group.appendChild(groupTitle);
    return group;
  }
  
  // Create dropdown setting
  function createDropdown(key, label, options, value) {
    const item = document.createElement('div');
    item.className = 'settings-item';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'settings-label';
    labelEl.setAttribute('for', `setting-${key}`);
    labelEl.textContent = label;
    
    const select = document.createElement('select');
    select.className = 'settings-dropdown';
    select.id = `setting-${key}`;
    select.setAttribute('data-setting', key);
    
    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      
      if (option.value === value) {
        optionEl.selected = true;
      }
      
      select.appendChild(optionEl);
    });
    
    select.addEventListener('change', () => {
      updateSetting(key, select.value);
    });
    
    item.appendChild(labelEl);
    item.appendChild(select);
    
    return item;
  }
  
  // Create slider setting
  function createSlider(key, label, min, max, step, value) {
    const item = document.createElement('div');
    item.className = 'settings-item';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'settings-label';
    labelEl.setAttribute('for', `setting-${key}`);
    labelEl.textContent = label;
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';
    
    const sliderControls = document.createElement('div');
    sliderControls.className = 'slider-controls';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'settings-slider';
    slider.id = `setting-${key}`;
    slider.setAttribute('data-setting', key);
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    
    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'slider-value';
    valueDisplay.textContent = value;
    
    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
      updateSetting(key, parseFloat(slider.value));
    });
    
    sliderControls.appendChild(slider);
    sliderControls.appendChild(valueDisplay);
    
    sliderContainer.appendChild(sliderControls);
    
    item.appendChild(labelEl);
    item.appendChild(sliderContainer);
    
    return item;
  }
  
  // Create toggle setting
  function createToggle(key, label, checked) {
    const item = document.createElement('div');
    item.className = 'settings-item toggle-container';
    
    const labelEl = document.createElement('label');
    labelEl.className = 'settings-label';
    labelEl.textContent = label;
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `setting-${key}`;
    checkbox.setAttribute('data-setting', key);
    checkbox.checked = checked;
    
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    
    checkbox.addEventListener('change', () => {
      updateSetting(key, checkbox.checked);
    });
    
    toggleSwitch.appendChild(checkbox);
    toggleSwitch.appendChild(slider);
    
    item.appendChild(labelEl);
    item.appendChild(toggleSwitch);
    
    return item;
  }
  
  // Update setting value
  function updateSetting(key, value) {
    currentSettings[key] = value;
    
    // Call onChange callback if defined
    if (callbacks.onChange && typeof callbacks.onChange === 'function') {
      callbacks.onChange(key, value, currentSettings);
    }
  }
  
  // Show message
  function showMessage(message, type = 'success') {
    messageArea.textContent = message;
    messageArea.className = `settings-message ${type}`;
    messageArea.style.display = 'block';
    
    // Hide message after a delay
    setTimeout(() => {
      messageArea.style.display = 'none';
    }, 3000);
  }
  
  // Close button functionality
  const closeButton = header.querySelector('.settings-close');
  closeButton.addEventListener('click', () => {
    hide();
  });
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (container.classList.contains('visible') && 
        !container.contains(e.target) && 
        !e.target.closest('.settings-button')) {
      hide();
    }
  });
  
  // Show the panel
  function show() {
    container.classList.add('visible');
  }
  
  // Hide the panel
  function hide() {
    container.classList.remove('visible');
  }
  
  // Add to DOM
  document.body.appendChild(container);
  
  // Return public API
  return {
    element: container,
    show,
    hide,
    toggle: () => {
      if (container.classList.contains('visible')) {
        hide();
      } else {
        show();
      }
    },
    getSettings: () => ({ ...currentSettings }),
    updateSetting,
    setSettings: (settings) => {
      Object.entries(settings).forEach(([key, value]) => {
        if (key in currentSettings) {
          updateSetting(key, value);
          
          // Update UI
          const element = document.querySelector(`[data-setting="${key}"]`);
          if (element) {
            if (element.type === 'checkbox') {
              element.checked = value;
            } else if (element.type === 'range') {
              element.value = value;
              const valueDisplay = element.parentNode.querySelector('.slider-value');
              if (valueDisplay) {
                valueDisplay.textContent = value;
              }
            } else {
              element.value = value;
            }
          }
        }
      });
    },
    resetToDefaults: () => {
      resetButton.click();
    },
    onChange: (callback) => {
      if (typeof callback === 'function') {
        callbacks.onChange = callback;
      }
    },
    showMessage
  };
}