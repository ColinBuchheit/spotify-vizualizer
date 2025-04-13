// Application Integration Module
// This module helps manage the integration between UI components and core functionality

import { appAPI } from '../core/App.js';

// Component references
let components = {};

// Initialize the integration module
export function initAppIntegration(componentRefs) {
  // Store component references
  components = { ...componentRefs };
  
  // Connect components
  connectComponents();
  
  // Set up global event listeners
  setupGlobalEvents();
  
  return {
    getComponents: () => components,
    updateComponent: (name, component) => {
      components[name] = component;
    },
    getAppAPI: () => appAPI
  };
}

// Connect components to each other
function connectComponents() {
  if (!components) return;
  
  // Connect settings changes to visualizer
  if (components.settingsPanel && appAPI) {
    components.settingsPanel.onChange((key, value) => {
      switch (key) {
        case 'colorScheme':
          appAPI.setColorScheme(value);
          break;
        case 'autoRotate':
          appAPI.setAutoRotate(value);
          break;
        case 'motionIntensity':
          appAPI.setMotionIntensity(value);
          break;
        case 'showFps':
          appAPI.toggleFpsDisplay(value);
          break;
        // Add more settings as needed
      }
    });
  }
  
  // Connect volume slider to audio manager
  if (components.volumeSlider && appAPI) {
    const audioManager = appAPI.getAudioManager();
    if (audioManager && audioManager.setVolume) {
      components.volumeSlider.slider.addEventListener('input', () => {
        const volume = parseFloat(components.volumeSlider.slider.value);
        audioManager.setVolume(volume);
      });
    }
  }
  
  // Connect visualization selector to visualizer
  if (components.vizSelector && appAPI) {
    const visualizer = appAPI.getVisualizer();
    if (visualizer && visualizer.setActiveVisualizer) {
      components.vizSelector.element.addEventListener('change', () => {
        const selectedViz = components.vizSelector.getActiveMode();
        visualizer.setActiveVisualizer(selectedViz);
      });
    }
  }
}

// Set up global event listeners
function setupGlobalEvents() {
  // Performance monitoring
  const performanceMonitor = createPerformanceMonitor();
  performanceMonitor.start();
  
  // Screenshot functionality
  window.addEventListener('keydown', (e) => {
    // Alt+S to take screenshot
    if (e.altKey && e.code === 'KeyS') {
      takeScreenshot();
    }
    
    // Alt+H to toggle UI visibility
    if (e.altKey && e.code === 'KeyH') {
      toggleUIVisibility();
    }
  });
  
  // Error handling
  window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    showErrorNotification('An error occurred. Check console for details.');
  });
}

// Create performance monitor
function createPerformanceMonitor() {
  const metrics = {
    fps: 0,
    memory: 0,
    cpu: 0,
    lastUpdate: 0
  };
  
  let monitoring = false;
  let monitoringInterval;
  
  // Start monitoring
  function start() {
    if (monitoring) return;
    monitoring = true;
    
    // Update metrics every second
    monitoringInterval = setInterval(() => {
      // Update FPS
      if (window.performance && window.performance.now) {
        const now = performance.now();
        const delta = now - metrics.lastUpdate;
        metrics.fps = Math.round(1000 / delta);
        metrics.lastUpdate = now;
      }
      
      // Update memory usage if available
      if (window.performance && window.performance.memory) {
        metrics.memory = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      }
      
      // Log metrics if debug mode is enabled
      if (window.localStorage && localStorage.getItem('debug') === 'true') {
        console.log(`Performance: ${metrics.fps} FPS, Memory: ${metrics.memory} MB`);
      }
      
      // Check for performance issues
      if (metrics.fps < 30) {
        // Suggest performance improvements
        if (appAPI && !performanceWarningShown) {
          showPerformanceWarning();
          performanceWarningShown = true;
        }
      } else {
        performanceWarningShown = false;
      }
    }, 1000);
  }
  
  // Stop monitoring
  function stop() {
    if (!monitoring) return;
    monitoring = false;
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
    }
  }
  
  // Flag to prevent multiple warnings
  let performanceWarningShown = false;
  
  // Show performance warning notification
  function showPerformanceWarning() {
    if (components.settingsPanel) {
      // Suggest lower quality settings
      showNotification('Performance is low. Consider reducing quality in settings.', 'warning', () => {
        components.settingsPanel.show();
      });
    }
  }
  
  return {
    start,
    stop,
    getMetrics: () => ({ ...metrics })
  };
}

// Take a screenshot of the visualization
function takeScreenshot() {
  if (!appAPI) return;
  
  const screenshot = appAPI.takeScreenshot();
  if (screenshot) {
    // Create a temporary link to download the screenshot
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = `spotify-visualizer-${Date.now()}.png`;
    link.click();
    
    // Show confirmation
    showNotification('Screenshot saved!', 'success');
  }
}

// Toggle UI visibility for clean screenshots
function toggleUIVisibility() {
  const uiElements = document.querySelectorAll('.ui-element');
  
  uiElements.forEach(el => {
    el.style.display = el.style.display === 'none' ? '' : 'none';
  });
  
  // Show confirmation
  if (uiElements[0] && uiElements[0].style.display === 'none') {
    showNotification('UI hidden. Press Alt+H to show again.', 'info');
  }
}

// Show notification
export function showNotification(message, type = 'info', onClick = null) {
  // Remove existing notification
  const existingNotification = document.querySelector('.app-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `app-notification ${type}`;
  notification.textContent = message;
  
  // Add close button
  const closeButton = document.createElement('span');
  closeButton.className = 'notification-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    notification.remove();
  });
  
  notification.appendChild(closeButton);
  
  // Add click handler
  if (onClick && typeof onClick === 'function') {
    notification.addEventListener('click', (e) => {
      if (e.target !== closeButton) {
        onClick();
      }
    });
    notification.style.cursor = 'pointer';
  }
  
  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .app-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      background: rgba(40, 40, 40, 0.9);
      color: white;
      font-size: 14px;
      max-width: 300px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out forwards;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }
    
    .app-notification.success {
      background: rgba(40, 180, 100, 0.9);
    }
    
    .app-notification.warning {
      background: rgba(220, 160, 40, 0.9);
    }
    
    .app-notification.error {
      background: rgba(220, 60, 60, 0.9);
    }
    
    .notification-close {
      margin-left: 10px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      font-size: 18px;
      font-weight: bold;
      line-height: 14px;
      vertical-align: middle;
    }
    
    .notification-close:hover {
      opacity: 1;
    }
    
    @keyframes slideIn {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  
  // Add to document
  document.head.appendChild(styles);
  document.body.appendChild(notification);
  
  // Remove after timeout
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(100px)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Show error notification
export function showErrorNotification(message) {
  showNotification(message, 'error');
}

// Export helper functions
export const helpers = {
  toggleUIVisibility,
  takeScreenshot,
  showNotification,
  showErrorNotification
};