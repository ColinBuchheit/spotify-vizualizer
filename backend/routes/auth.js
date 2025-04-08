const express = require('express');
const axios = require('axios');
const qs = require('querystring');
require('dotenv').config(); // ✅ This loads your .env file in this file too

const router = express.Router();

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI
} = process.env;


const client_id = SPOTIFY_CLIENT_ID;
const client_secret = SPOTIFY_CLIENT_SECRET;
const redirect_uri = SPOTIFY_REDIRECT_URI;

router.get('/login', (req, res) => {
  const scope = 'user-read-playback-state user-read-currently-playing';
  const params = qs.stringify({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri
  });
  res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

router.get('/callback', async (req, res) => {
  const code = req.query.code || null;

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify({
        code,
        redirect_uri,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(`${client_id}:${client_secret}`).toString('base64')
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Redirect to frontend with tokens as URL parameters
    res.redirect(
      `http://localhost:5173/?access_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`
    );
  } catch (error) {
    console.error('Token exchange error:', error.response.data);
    res.status(500).send('Authentication failed');
  }
});
console.log('CLIENT ID:', SPOTIFY_CLIENT_ID);


router.post('/refresh_token', async (req, res) => {
  const refresh_token = req.query.refresh_token;

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
          Authorization:
            'Basic ' +
            Buffer.from(`${client_id}:${client_secret}`).toString('base64')
        }
      }
    );

    const { access_token } = response.data;
    res.json({ access_token });
  } catch (error) {
    console.error('Refresh token error:', error.response.data);
    res.status(500).send('Could not refresh token');
  }
});

module.exports = router;
