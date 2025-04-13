export function createConnectButton(onClick) {
    // Check if button already exists to prevent duplicates
    const existingButton = document.querySelector('.spotify-btn');
    if (existingButton) {
      existingButton.remove();
    }
  
    // Create button element
    const button = document.createElement('button');
    button.textContent = '🎧 Connect to Spotify';
    button.className = 'spotify-btn';
    button.id = 'spotify-connect-btn';
    
    // Apply styles
    Object.assign(button.style, {
      background: '#1DB954',
      color: '#fff',
      border: 'none',
      padding: '12px 20px',
      fontSize: '16px',
      cursor: 'pointer',
      borderRadius: '30px',
      margin: '20px',
      fontWeight: '600',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      userSelect: 'none',
      position: 'absolute',
      zIndex: '100',
      top: '10px',
      left: '10px',
    });
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.background = '#1ed760';
      button.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.15)';
      button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = '#1DB954';
      button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      button.style.transform = 'translateY(0)';
    });
    
    // Add loading state capability
    const setLoading = (isLoading) => {
      if (isLoading) {
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.textContent = 'Connecting...';
        button.disabled = true;
        button.style.opacity = '0.7';
        button.style.cursor = 'wait';
      } else {
        if (button.dataset.originalText) {
          button.textContent = button.dataset.originalText;
        }
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
      }
    };
    
    // Add click handler with loading indicator
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        setLoading(true);
        
        // If onClick is an async function, await it
        if (onClick && typeof onClick === 'function') {
          await Promise.resolve(onClick());
        }
      } catch (error) {
        console.error('Button action failed:', error);
        
        // Show error feedback
        const originalText = button.dataset.originalText || '🎧 Connect to Spotify';
        button.textContent = '❌ Connection Error';
        button.style.background = '#e74c3c';
        
        // Reset after delay
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = '#1DB954';
          setLoading(false);
        }, 3000);
      } finally {
        setLoading(false);
      }
    });
    
    // Add button to document
    document.body.appendChild(button);
    
    // Return control methods
    return {
      element: button,
      setLoading,
      setConnected: (isConnected) => {
        if (isConnected) {
          button.textContent = '🎧 Disconnect';
          button.style.background = '#282828';
        } else {
          button.textContent = '🎧 Connect to Spotify';
          button.style.background = '#1DB954';
        }
      },
      hide: () => {
        button.style.display = 'none';
      },
      show: () => {
        button.style.display = 'flex';
      }
    };
  }