const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');

require('dotenv').config();

dotenv.config();

const app = express();
const PORT = 8888;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Spotify Visualizer Backend is running.');
});

// Optional error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
