export function createTrackInfoBox() {
    const box = document.createElement('div');
    box.id = 'track-info';
    box.innerHTML = `
      <h3>Track:</h3>
      <p id="track-title">Loading...</p>
      <p id="track-artist"></p>
    `;
  
    Object.assign(box.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.6)',
      color: '#fff',
      padding: '12px',
      borderRadius: '12px',
      fontFamily: 'sans-serif',
    });
  
    document.body.appendChild(box);
  }
  
  export function updateTrackInfo(title, artist) {
    document.getElementById('track-title').textContent = title;
    document.getElementById('track-artist').textContent = artist;
  }
  