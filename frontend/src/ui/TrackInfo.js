export function renderTrackInfo(trackData) {
    const container = document.createElement('div');
    container.id = 'track-info';
  
    const name = trackData.item?.name || 'Unknown Track';
    const artist = trackData.item?.artists?.[0]?.name || 'Unknown Artist';
    const albumImage = trackData.item?.album?.images?.[0]?.url || '';
  
    container.innerHTML = `
      <div class="track-container">
        <img src="${albumImage}" alt="Album Cover">
        <div class="text">
          <div class="title">${name}</div>
          <div class="artist">${artist}</div>
        </div>
      </div>
    `;
  
    document.body.appendChild(container);
  }
  