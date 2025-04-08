import { initVisualizer } from './src/three/Visualizer.js';
import { getAccessTokenFromUrl } from './src/auth/handleAuth.js';

const token = getAccessTokenFromUrl();

if (token) {
  // Clean up URL and transition into visualizer
  window.history.pushState({}, document.title, '/');

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  initVisualizer(token);
} else {
  // Wait for user to click the connect button
  const connectBtn = document.getElementById('connect-button');
  connectBtn.addEventListener('click', () => {
    window.location.href = 'http://localhost:8888/auth/login';
  });
}
