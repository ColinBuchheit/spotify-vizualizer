export function createConnectButton(onClick) {
    const button = document.createElement('button');
    button.textContent = '🎧 Connect to Spotify';
    button.className = 'spotify-btn';
    button.onclick = onClick;
  
    Object.assign(button.style, {
      background: '#1DB954',
      color: '#fff',
      border: 'none',
      padding: '12px 20px',
      fontSize: '16px',
      cursor: 'pointer',
      borderRadius: '30px',
      margin: '20px',
    });
  
    document.body.appendChild(button);
  }
  