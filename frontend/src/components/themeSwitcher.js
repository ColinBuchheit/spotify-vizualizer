export function createThemeSwitcher(themes, onSelect) {
    // Remove existing theme switcher if present
    const existingSelect = document.querySelector('.theme-switcher');
    if (existingSelect) {
      existingSelect.remove();
    }
    
    // Create container for improved styling and positioning
    const container = document.createElement('div');
    container.className = 'theme-switcher-container';
    
    // Create label for accessibility
    const label = document.createElement('label');
    label.setAttribute('for', 'theme-select');
    label.textContent = 'Visualizer';
    label.className = 'theme-label';
    
    // Create select element
    const select = document.createElement('select');
    select.id = 'theme-select';
    select.className = 'theme-switcher';
    select.setAttribute('aria-label', 'Select visualization theme');
    
    // Add themes as options
    if (Array.isArray(themes) && themes.length > 0) {
      themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        select.appendChild(option);
      });
    } else {
      // Default themes if none provided
      const defaultThemes = ['Bars', 'Wave', 'Particles', 'Spectrum'];
      defaultThemes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme;
        select.appendChild(option);
      });
    }
    
    // Apply styles to container
    Object.assign(container.style, {
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '5px',
      zIndex: '100',
    });
    
    // Apply styles to label
    Object.assign(label.style, {
      color: '#fff',
      fontSize: '12px',
      fontWeight: '500',
      opacity: '0.8',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    });
    
    // Apply styles to select
    Object.assign(select.style, {
      padding: '10px 15px',
      fontSize: '14px',
      fontWeight: '500',
      color: '#fff',
      backgroundColor: 'rgba(30, 30, 30, 0.7)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '30px',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      appearance: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px top 50%',
      backgroundSize: '10px auto',
      paddingRight: '30px',
      outline: 'none',
    });
    
    // Add hover effect
    select.addEventListener('mouseenter', () => {
      select.style.backgroundColor = 'rgba(40, 40, 40, 0.8)';
      select.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });
    
    select.addEventListener('mouseleave', () => {
      select.style.backgroundColor = 'rgba(30, 30, 30, 0.7)';
      select.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });
    
    // Add focus styles for accessibility
    select.addEventListener('focus', () => {
      select.style.boxShadow = '0 0 0 2px rgba(29, 185, 84, 0.5)';
      select.style.borderColor = 'rgba(29, 185, 84, 0.6)';
    });
    
    select.addEventListener('blur', () => {
      select.style.boxShadow = 'none';
      select.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });
    
    // Add change event handler
    select.addEventListener('change', () => {
      const selectedTheme = select.value;
      
      // Add visual feedback
      const originalBackground = select.style.backgroundColor;
      select.style.backgroundColor = 'rgba(29, 185, 84, 0.3)';
      select.style.transition = 'background-color 0.5s ease';
      
      setTimeout(() => {
        select.style.backgroundColor = originalBackground;
      }, 300);
      
      // Call onSelect callback
      if (onSelect && typeof onSelect === 'function') {
        try {
          onSelect(selectedTheme);
        } catch (error) {
          console.error('Error in theme selection handler:', error);
          
          // Visual feedback for error
          select.style.backgroundColor = 'rgba(231, 76, 60, 0.3)';
          setTimeout(() => {
            select.style.backgroundColor = originalBackground;
          }, 1000);
        }
      }
    });
    
    // Add elements to the DOM
    container.appendChild(label);
    container.appendChild(select);
    document.body.appendChild(container);
    
    // Return control methods
    return {
      element: select,
      setTheme: (theme) => {
        if (themes.includes(theme)) {
          select.value = theme;
          // Trigger the change event
          select.dispatchEvent(new Event('change'));
        }
      },
      getCurrentTheme: () => select.value,
      hide: () => {
        container.style.display = 'none';
      },
      show: () => {
        container.style.display = 'flex';
      }
    };
  }