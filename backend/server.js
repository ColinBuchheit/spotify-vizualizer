import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

// Environment variables
const PORT = process.env.PORT || 8888;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CLIENT_ID = process.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/callback/spotify`;

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'spotify-visualizer-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Spotify auth scopes
const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing'
].join(' ');

// Routes

// Login endpoint - redirects to Spotify auth
app.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(2, 15);
  req.session.state = state;

  const spotifyAuthUrl = new URL('https://accounts.spotify.com/authorize');
  spotifyAuthUrl.searchParams.append('response_type', 'code');
  spotifyAuthUrl.searchParams.append('client_id', CLIENT_ID);
  spotifyAuthUrl.searchParams.append('scope', SPOTIFY_SCOPES);
  spotifyAuthUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  spotifyAuthUrl.searchParams.append('state', state);

  res.redirect(spotifyAuthUrl.toString());
});

// Callback endpoint - exchanges code for tokens
app.get('/callback/spotify', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.session.state;

  if (!state || state !== storedState) {
    return res.redirect(`${FRONTEND_URL}?error=state_mismatch`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Redirect to frontend with tokens
    res.redirect(`${FRONTEND_URL}/callback?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}?error=invalid_token`);
  }
});

// Refresh token endpoint
app.post('/refresh_token', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      params: {
        grant_type: 'refresh_token',
        refresh_token
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Proxy for Spotify API requests
app.post('/api/spotify/*', async (req, res) => {
  const endpoint = req.params[0];
  const { method = 'GET', data, token } = req.body;
  
  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }

  try {
    const response = await axios({
      method,
      url: `https://api.spotify.com/v1/${endpoint}`,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json(error.response?.data || { error: 'API request failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
