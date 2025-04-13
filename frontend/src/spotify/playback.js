let player;

export async function loadSpotifySDK(onReady) {
  if (!window.Spotify) {
    await new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.onload = resolve;
      document.body.appendChild(script);
    });
  }

  window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('spotify_access_token');
    player = new Spotify.Player({
      name: 'SonicCanvas Player',
      getOAuthToken: cb => cb(token),
      volume: 0.5
    });

    player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player ready with Device ID', device_id);
      onReady(device_id);
    });

    player.addListener('not_ready', () => {
      console.warn('Spotify player is not ready');
    });

    player.connect();
  };
}

export function getPlayer() {
  return player;
}
