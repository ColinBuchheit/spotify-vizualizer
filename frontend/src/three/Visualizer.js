import * as THREE from 'three';
import { renderTrackInfo } from '../ui/TrackInfo.js';
import { getCurrentlyPlayingTrack } from '../spotify/spotifyAPI.js';

let scene, camera, renderer;
let analyser, dataArray;
let bars = [];

export async function initVisualizer(accessToken) {
  setupThreeScene();
  await setupSpotifyPlayer(accessToken);
  animate();
}

function setupThreeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 30;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('app').appendChild(renderer.domElement);

  const light = new THREE.PointLight(0xffffff, 1);
  light.position.set(0, 10, 10);
  scene.add(light);

  const numBars = 64;
  const spacing = 1;
  for (let i = 0; i < numBars; i++) {
    const geometry = new THREE.BoxGeometry(0.8, 1, 0.8);
    const material = new THREE.MeshStandardMaterial({ color: 0x1db954 });
    const bar = new THREE.Mesh(geometry, material);
    bar.position.x = (i - numBars / 2) * spacing;
    bars.push(bar);
    scene.add(bar);
  }

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
    bars.forEach((bar, i) => {
      const scale = dataArray[i] / 128;
      bar.scale.y = Math.max(scale, 0.1);
      bar.position.y = bar.scale.y / 2;
    });
  }

  renderer.render(scene, camera);
}

async function setupSpotifyPlayer(token) {
  await waitForSpotifySDK();

  const player = new Spotify.Player({
    name: 'Web Visualizer Player',
    getOAuthToken: cb => cb(token),
    volume: 0.8
  });

  player.connect();

  player.addListener('ready', async ({ device_id }) => {
    console.log('Player ready with device ID', device_id);

    const track = await getCurrentlyPlayingTrack(token);
    if (track && track.item) {
      renderTrackInfo(track);

      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ device_ids: [device_id], play: true })
      });

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioElement = new Audio(); // placeholder audio source
      const source = audioCtx.createMediaElementSource(audioElement);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);

      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    } else {
      alert('No track is currently playing. Please start music on Spotify.');
    }
  });
}

function waitForSpotifySDK() {
  return new Promise(resolve => {
    if (window.Spotify) {
      resolve();
    } else {
      window.onSpotifyWebPlaybackSDKReady = () => {
        resolve();
      };
    }
  });
}
