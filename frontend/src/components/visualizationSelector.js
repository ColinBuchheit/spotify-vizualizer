export function createVisualizationSelector(modes, onSelect) {
    // Remove existing visualization selector if present
    const existingSelector = document.querySelector('.visualization-selector');
    if (existingSelector) {
      existingSelector.remove();
    }
    
    // Create container
    const container = document.createElement('div');
    container.className = 'visualization-selector';
    
    // Create title
    const title = document.createElement('h3');
    title.className = 'viz-title';
    title.textContent = 'Visualization Mode';
    
    // Create modes container
    const modesContainer = document.createElement('div');
    modesContainer.className = 'viz-modes';
    
    // Add visualization modes
    if (Array.isArray(modes) && modes.length > 0) {
      modes.forEach((mode, index) => {
        const modeButton = document.createElement('div');
        modeButton.className = 'viz-mode-button';
        modeButton.setAttribute('data-mode', mode);
        modeButton.setAttribute('aria-label', `Switch to ${mode} visualization`);
        modeButton.setAttribute('role', 'button');
        modeButton.setAttribute('tabindex', '0');
        
        // Set the first mode as active by default
        if (index === 0) {
          modeButton.classList.add('active');
        }
        
        // Create mode icon based on type
        let iconSvg = '';
        
        switch (mode.toLowerCase()) {
          case 'bars':
            iconSvg = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="14" width="3" height="6" rx="1" fill="currentColor"/>
                <rect x="9" y="10" width="3" height="10" rx="1" fill="currentColor"/>
                <rect x="14" y="6" width="3" height="14" rx="1" fill="currentColor"/>
                <rect x="19" y="12" width="3" height="8" rx="1" fill="currentColor"/>
              </svg>
            `;
            break;
          case 'wave':
            iconSvg = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12C5 12 5 8 7 8C9 8 9 16 11 16C13 16 13 10 15 10C17 10 17 14 19 14C21 14 21 10 23 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
            break;
          case 'galaxy':
          case 'particles':
            iconSvg = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="8" cy="9" r="1" fill="currentColor"/>
                <circle cx="16" cy="9" r="1" fill="currentColor"/>
                <circle cx="18" cy="14" r="1" fill="currentColor"/>
                <circle cx="6" cy="15" r="1" fill="currentColor"/>
                <circle cx="10" cy="16" r="1" fill="currentColor"/>
                <circle cx="14" cy="15" r="1" fill="currentColor"/>
                <circle cx="8" cy="5" r="0.75" fill="currentColor"/>
                <circle cx="16" cy="5" r="0.75" fill="currentColor"/>
                <circle cx="20" cy="8" r="0.75" fill="currentColor"/>
                <circle cx="4" cy="9" r="0.75" fill="currentColor"/>
                <circle cx="21" cy="12" r="0.75" fill="currentColor"/>
                <circle cx="4" cy="18" r="0.75" fill="currentColor"/>
                <circle cx="10" cy="20" r="0.75" fill="currentColor"/>
                <circle cx="17" cy="18" r="0.75" fill="currentColor"/>
              </svg>
            `;
            break;
          case 'pulse':
            iconSvg = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="4" fill="currentColor"/>
                <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/>
                <circle cx="12" cy="12" r="12" stroke="currentColor" stroke-width="1" stroke-dasharray="1 3"/>
              </svg>
            `;
            break;
          default:
            iconSvg = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2"/>
              </svg>
            `;
        }
        
        // Create button content
        modeButton.innerHTML = `
          <div class="viz-mode-icon">${iconSvg}</div>
          <div class="viz-mode-name">${mode}</div>
        `;
        
        // Add click handler
        modeButton.addEventListener('click', () => {
          // Remove active class from all buttons
          document.querySelectorAll('.viz-mode-button').forEach(button => {
            button.classList.remove('active');
          });
          
          // Add active class to clicked button
          modeButton.classList.add('active');
          
          // Call onSelect callback
          if (onSelect && typeof onSelect === 'function') {
            try {
              onSelect(mode);
            } catch (error) {
              console.error('Error in visualization selector handler:', error);
            }
          }
        });
        
        // Add keyboard accessibility
        modeButton.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            modeButton.click();
          }
        });
        
        modesContainer.appendChild(modeButton);
      });
    } else {
      // Default modes if none provided
      const defaultModes = ['Bars', 'Wave', 'Galaxy', 'Pulse'];
      defaultModes.forEach((mode, index) => {
        const modeButton = document.createElement('div');
        modeButton.className = 'viz-mode-button';
        modeButton.setAttribute('data-mode', mode);
        modeButton.innerHTML = `<div class="viz-mode-name">${mode}</div>`;
        
        if (index === 0) {
          modeButton.classList.add('active');
        }
        
        modeButton.addEventListener('click', () => {
          document.querySelectorAll('.viz-mode-button').forEach(button => {
            button.classList.remove('active');
          });
          
          modeButton.classList.add('active');
          
          if (onSelect && typeof onSelect === 'function') {
            try {
              onSelect(mode);
            } catch (error) {
              console.error('Error in visualization selector handler:', error);
            }
          }
        });
        
        modesContainer.appendChild(modeButton);
      });
    }
    
    // Add expand/collapse button
    const toggleButton = document.createElement('div');
    toggleButton.className = 'viz-toggle';
    toggleButton.innerHTML = `
      <svg class="viz-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 8L12 16L20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Add elements to container
    container.appendChild(title);
    container.appendChild(modesContainer);
    container.appendChild(toggleButton);
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .visualization-selector {
        position: absolute;
        top: 120px;
        right: 20px;
        background: rgba(20, 20, 20, 0.75);
        color: #fff;
        border-radius: 12px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        overflow: hidden;
        z-index: 100;
        transition: all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);
        max-width: 200px;
      }
      
      .viz-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        padding: 12px 16px;
        color: #1DB954;
        background: rgba(30, 30, 30, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .viz-modes {
        padding: 8px;
        max-height: 300px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      
      .viz-mode-button {
        cursor: pointer;
        padding: 10px;
        border-radius: 8px;
        background: rgba(50, 50, 50, 0.5);
        border: 1px solid transparent;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        user-select: none;
      }
      
      .viz-mode-button:hover {
        background: rgba(70, 70, 70, 0.7);
        transform: translateY(-2px);
      }
      
      .viz-mode-button.active {
        background: rgba(29, 185, 84, 0.2);
        border-color: rgba(29, 185, 84, 0.5);
        box-shadow: 0 0 10px rgba(29, 185, 84, 0.3);
      }
      
      .viz-mode-icon {
        color: rgba(255, 255, 255, 0.9);
        transition: color 0.2s ease;
      }
      
      .viz-mode-button.active .viz-mode-icon {
        color: #1DB954;
      }
      
      .viz-mode-name {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
      }
      
      .viz-mode-button.active .viz-mode-name {
        color: #1DB954;
        font-weight: 600;
      }
      
      .viz-toggle {
        padding: 8px;
        background: rgba(30, 30, 30, 0.9);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      
      .viz-toggle:hover {
        background: rgba(40, 40, 40, 0.9);
      }
      
      /* Collapsed state */
      .visualization-selector.collapsed .viz-modes {
        display: none;
      }
      
      .visualization-selector.collapsed .viz-toggle-icon {
        transform: rotate(180deg);
      }
      
      /* Scrollbar styling */
      .viz-modes::-webkit-scrollbar {
        width: 6px;
      }
      
      .viz-modes::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
        border-radius: 3px;
      }
      
      .viz-modes::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }
      
      .viz-modes::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .visualization-selector {
          top: auto;
          bottom: 80px;
          right: 10px;
          max-width: 160px;
        }
        
        .viz-title {
          font-size: 12px;
          padding: 10px 12px;
        }
        
        .viz-mode-button {
          padding: 8px;
        }
        
        .viz-mode-name {
          font-size: 11px;
        }
      }
      
      /* Support for reduced motion preferences */
      @media (prefers-reduced-motion: reduce) {
        .visualization-selector,
        .viz-mode-button,
        .viz-mode-button:hover {
          transition: none;
          transform: none;
        }
      }
      
      /* Animation for new mode button */
      @keyframes highlight-pulse {
        0% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(29, 185, 84, 0); }
        100% { box-shadow: 0 0 0 0 rgba(29, 185, 84, 0); }
      }
      
      .viz-mode-button.new {
        animation: highlight-pulse 2s infinite;
      }
    `;
    
    document.head.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(container);
    
    // Add toggle functionality
    let isCollapsed = false;
    
    toggleButton.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      
      if (isCollapsed) {
        container.classList.add('collapsed');
      } else {
        container.classList.remove('collapsed');
      }
    });
    
    // Return control methods
    return {
      element: container,
      setActiveMode: (mode) => {
        document.querySelectorAll('.viz-mode-button').forEach(button => {
          button.classList.remove('active');
          
          if (button.getAttribute('data-mode') === mode) {
            button.classList.add('active');
          }
        });
      },
      getActiveMode: () => {
        const activeButton = document.querySelector('.viz-mode-button.active');
        return activeButton ? activeButton.getAttribute('data-mode') : null;
      },
      addMode: (mode, isNew = false) => {
        const exists = Array.from(document.querySelectorAll('.viz-mode-button'))
          .some(button => button.getAttribute('data-mode') === mode);
        
        if (!exists) {
          const modeButton = document.createElement('div');
          modeButton.className = 'viz-mode-button';
          modeButton.setAttribute('data-mode', mode);
          modeButton.innerHTML = `<div class="viz-mode-name">${mode}</div>`;
          
          if (isNew) {
            modeButton.classList.add('new');
          }
          
          modeButton.addEventListener('click', () => {
            document.querySelectorAll('.viz-mode-button').forEach(button => {
              button.classList.remove('active');
            });
            
            modeButton.classList.add('active');
            
            if (onSelect && typeof onSelect === 'function') {
              try {
                onSelect(mode);
              } catch (error) {
                console.error('Error in visualization selector handler:', error);
              }
            }
          });
          
          modesContainer.appendChild(modeButton);
        }
      },
      collapse: () => {
        isCollapsed = true;
        container.classList.add('collapsed');
      },
      expand: () => {
        isCollapsed = false;
        container.classList.remove('collapsed');
      },
      hide: () => {
        container.style.display = 'none';
      },
      show: () => {
        container.style.display = 'block';
      }
    };
  }