export function createTrackInfoBox() {
    // Remove existing track info if present
    const existingBox = document.getElementById('track-info');
    if (existingBox) {
      existingBox.remove();
    }
    
    // Create main container
    const box = document.createElement('div');
    box.id = 'track-info';
    box.className = 'track-info-container';
    
    // Create header with icon
    const header = document.createElement('div');
    header.className = 'track-info-header';
    header.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="track-info-icon">
        <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM8 14.5C4.4 14.5 1.5 11.6 1.5 8C1.5 4.4 4.4 1.5 8 1.5C11.6 1.5 14.5 4.4 14.5 8C14.5 11.6 11.6 14.5 8 14.5Z" fill="#1DB954"/>
        <path d="M6 11.5L12 8L6 4.5V11.5Z" fill="#1DB954"/>
      </svg>
      <h3>Now Playing</h3>
      <div class="minimize-button">−</div>
    `;
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'track-info-content';
    
    // Create track details
    const trackTitle = document.createElement('p');
    trackTitle.id = 'track-title';
    trackTitle.className = 'track-title';
    trackTitle.textContent = 'Waiting for track...';
    
    const trackArtist = document.createElement('p');
    trackArtist.id = 'track-artist';
    trackArtist.className = 'track-artist';
    trackArtist.textContent = '';
    
    // Create animated equalizer for visual effect
    const equalizer = document.createElement('div');
    equalizer.className = 'track-equalizer';
    equalizer.innerHTML = `
      <div class="track-eq-bar"></div>
      <div class="track-eq-bar"></div>
      <div class="track-eq-bar"></div>
      <div class="track-eq-bar"></div>
    `;
    
    // Add elements to the DOM
    content.appendChild(trackTitle);
    content.appendChild(trackArtist);
    content.appendChild(equalizer);
    
    box.appendChild(header);
    box.appendChild(content);
    
    document.body.appendChild(box);
    
    // Apply styles
    const style = document.createElement('style');
    style.textContent = `
      .track-info-container {
        position: absolute;
        top: 80px;
        left: 20px;
        background: rgba(15, 15, 15, 0.75);
        color: #fff;
        padding: 0;
        border-radius: 12px;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
        min-width: 280px;
        max-width: 320px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 100;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.17, 0.67, 0.83, 0.67);
      }
      
      .track-info-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: rgba(30, 30, 30, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .track-info-header h3 {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        flex-grow: 1;
        color: #1DB954;
      }
      
      .track-info-icon {
        flex-shrink: 0;
      }
      
      .minimize-button {
        cursor: pointer;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        font-size: 16px;
        line-height: 1;
        user-select: none;
        flex-shrink: 0;
      }
      
      .minimize-button:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      .track-info-content {
        padding: 16px;
      }
      
      .track-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .track-artist {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        margin: 0 0 12px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .track-equalizer {
        display: flex;
        gap: 3px;
        height: 20px;
        align-items: flex-end;
      }
      
      .track-eq-bar {
        background: #1DB954;
        width: 4px;
        height: 5px;
        border-radius: 1px;
        flex-grow: 1;
        animation: eq-animation 0.8s infinite ease-in-out alternate;
      }
      
      .track-eq-bar:nth-child(1) { animation-delay: 0s; }
      .track-eq-bar:nth-child(2) { animation-delay: 0.2s; }
      .track-eq-bar:nth-child(3) { animation-delay: 0.4s; }
      .track-eq-bar:nth-child(4) { animation-delay: 0.6s; }
      
      @keyframes eq-animation {
        0% { height: 5px; }
        100% { height: 20px; }
      }
      
      .track-info-minimized .track-info-content {
        display: none;
      }
      
      .track-info-minimized {
        width: auto;
      }
      
      /* Scrolling text animation for long titles */
      .track-title-scrolling, .track-artist-scrolling {
        white-space: nowrap;
        animation: text-scroll 10s linear infinite;
      }
      
      @keyframes text-scroll {
        0% { transform: translateX(0); }
        35% { transform: translateX(0); }
        85% { transform: translateX(calc(-100% + 280px)); }
        100% { transform: translateX(0); }
      }
    `;
    
    document.head.appendChild(style);
    
    // Add interactivity
    const minimizeButton = box.querySelector('.minimize-button');
    let isMinimized = false;
    
    minimizeButton.addEventListener('click', () => {
      isMinimized = !isMinimized;
      
      if (isMinimized) {
        box.classList.add('track-info-minimized');
        minimizeButton.textContent = '+';
      } else {
        box.classList.remove('track-info-minimized');
        minimizeButton.textContent = '−';
      }
    });
    
    // Make the box draggable
    let isDragging = false;
    let initialX, initialY, initialBoxX, initialBoxY;
    
    header.addEventListener('mousedown', (e) => {
      // Ignore clicks on minimize button
      if (e.target === minimizeButton) return;
      
      isDragging = true;
      initialX = e.clientX;
      initialY = e.clientY;
      initialBoxX = box.offsetLeft;
      initialBoxY = box.offsetTop;
      
      header.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - initialX;
      const dy = e.clientY - initialY;
      
      box.style.left = `${initialBoxX + dx}px`;
      box.style.top = `${initialBoxY + dy}px`;
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
      }
    });
    
    // Add grab cursor to header
    header.style.cursor = 'grab';
    
    return {
      element: box,
      show: () => {
        box.style.display = 'block';
      },
      hide: () => {
        box.style.display = 'none';
      }
    };
  }
  
  export function updateTrackInfo(title, artist, isPlaying = true) {
    const trackTitleElement = document.getElementById('track-title');
    const trackArtistElement = document.getElementById('track-artist');
    const equalizerElement = document.querySelector('.track-equalizer');
    
    if (!trackTitleElement || !trackArtistElement) return;
    
    // Update track info with animated transition
    const animateUpdate = (element, newText) => {
      // Only animate if content actually changes
      if (element.textContent === newText) return;
      
      // Fade out
      element.style.opacity = '0';
      element.style.transform = 'translateY(5px)';
      element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      setTimeout(() => {
        // Update content
        element.textContent = newText;
        
        // Check if text overflows container
        const isOverflowing = element.scrollWidth > element.clientWidth;
        
        if (isOverflowing) {
          if (element.id === 'track-title') {
            element.classList.add('track-title-scrolling');
          } else {
            element.classList.add('track-artist-scrolling');
          }
        } else {
          if (element.id === 'track-title') {
            element.classList.remove('track-title-scrolling');
          } else {
            element.classList.remove('track-artist-scrolling');
          }
        }
        
        // Fade in
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, 300);
    };
    
    // Update track info
    animateUpdate(trackTitleElement, title || 'No track playing');
    animateUpdate(trackArtistElement, artist || '');
    
    // Update equalizer animation based on playback state
    if (equalizerElement) {
      const bars = equalizerElement.querySelectorAll('.track-eq-bar');
      
      if (isPlaying) {
        bars.forEach(bar => {
          bar.style.animationPlayState = 'running';
        });
      } else {
        bars.forEach(bar => {
          bar.style.animationPlayState = 'paused';
          bar.style.height = '5px';
        });
      }
    }
  }