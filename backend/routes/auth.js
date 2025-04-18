const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');
const { getSpotifyAuthHeader, exchangeCodeForToken } = require('../utils/spotify');

// Load environment variables
require('dotenv').config();

// Your Spotify credentials from .env
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:8888/auth/callback';
const FRONTEND_URI = process.env.FRONTEND_URL || 'http://localhost:5173';

// Define comprehensive scopes with comments
const scope = [
  // User profile and account - basic requirements
  'user-read-private',
  'user-read-email',
  
  // Playback control - core functionality
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'app-remote-control',
  
  // History and data - important for visualization context
  'user-read-recently-played',
  'user-read-playback-position',
  'user-top-read',
  
  // Library and playlists - access to user's music
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-library-modify',   // Required for fully interacting with library
  
  // These additional scopes might help with certain API access patterns
  'playlist-modify-private',
  'playlist-modify-public'
].join(' ');

// Login route
router.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(2, 15);
  
  // Redirect to Spotify authorization page
  res.redirect(
    'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
      state: state,
      show_dialog: true
    })
  );
});

// Callback route
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const state = req.query.state || null;
  
  if (!code) {
    return res.redirect(`${FRONTEND_URI}?error=invalid_token&message=Authorization code missing`);
  }
  
  try {
    // Exchange authorization code for tokens
    const tokenData = await exchangeCodeForToken(code, REDIRECT_URI, CLIENT_ID, CLIENT_SECRET);
    
    // Redirect to frontend with tokens
    res.redirect(
      `${FRONTEND_URI}?` +
      querystring.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      })
    );
  } catch (error) {
    console.error('Error during token exchange:', error);
    res.redirect(`${FRONTEND_URI}?error=invalid_token&message=${error.message}`);
  }
});

// Refresh token route
router.post('/refresh_token', async (req, res) => {
  const refresh_token = req.body.refresh_token;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }
  
  try {
    // Request new access token
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }),
      {
        headers: getSpotifyAuthHeader(CLIENT_ID, CLIENT_SECRET)
      }
    );
    
    res.json({
      access_token: response.data.access_token,
      expires_in: response.data.expires_in
    });
  } catch (error) {
    console.error('Error refreshing access token:', error);
    res.status(500).json({
      error: 'Error refreshing token',
      message: error.message
    });
  }
});

// Verify premium status
router.get('/verify-premium', async (req, res) => {
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(400).json({ error: 'No access token provided' });
  }
  
  try {
    // Check if user has premium account
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const user = response.data;
    const isPremium = user.product === 'premium';
    
    // Return user info along with premium status
    res.json({
      isPremium,
      user: {
        id: user.id,
        name: user.display_name,
        email: user.email,
        country: user.country
      }
    });
  } catch (error) {
    console.error('Error verifying premium status:', error);
    res.status(500).json({ error: 'Failed to verify premium status' });
  }
});

module.exports = router;