// vite.config.js
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      }
    }
  },
  define: {
    // This properly exposes environment variables to the client-side code
    'import.meta.env.VITE_SPOTIFY_CLIENT_ID': JSON.stringify(process.env.VITE_SPOTIFY_CLIENT_ID),
    'import.meta.env.VITE_SPOTIFY_REDIRECT_URI': JSON.stringify(process.env.VITE_SPOTIFY_REDIRECT_URI)
  }
});