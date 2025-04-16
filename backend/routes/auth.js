const express = require('express');
const axios = require('axios');
const qs = require('querystring');
require('dotenv').config();

const router = express.Router();

// Get environment variables
const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URL = 'http://localhost:5173'
} = process.env;

// Validate required environment variables
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
  console.error('Missing required environment variables for Spotify authentication!');
  console.error('Make sure SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI are set in your .env file');
  process.exit(1);
}

/**
 * Redirect to Spotify authorization page
 */
router.get('/login', (req, res) => {
  // Define scopes - request all necessary permissions for visualization
  const scope = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'user-read-recently-played',
    'user-read-playback-position'
  ].join(' ');

  // Build authorization URL
  const params = qs.stringify({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    show_dialog: true // Force login dialog for testing
  });
  
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

/**
 * Handle callback from Spotify
 */
router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const error = req.query.error || null;

  // If user denied access
  if (error) {
    return res.redirect(`${FRONTEND_URL}?error=access_denied`);
  }

  // Exchange code for tokens
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify({
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Redirect to frontend with tokens as URL parameters
    // NOTE: In a production environment, you should use secure httpOnly cookies
    // or a token exchange mechanism instead of exposing tokens in the URL
    res.redirect(
      `${FRONTEND_URL}?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`
    );
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}?error=authentication_failed`);
  }
});

/**
 * Refresh access token
 */
router.post('/refresh_token', async (req, res) => {
  const refresh_token = req.body.refresh_token;

  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify({
        grant_type: 'refresh_token',
        refresh_token
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`
        }
      }
    );

    const { access_token, expires_in } = response.data;
    
    res.json({
      access_token,
      expires_in
    });
  } catch (error) {
    console.error('Refresh token error:', error.response?.data || error.message);
    res.status(401).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
