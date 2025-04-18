const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth.js');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8888;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';

// Middleware
app.use(express.json()); // Parse JSON request bodies
// In your backend server.js, make sure CORS is properly configured:
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Allow both origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Log requests in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Routes
app.use('/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.send({
    message: 'Spotify Visualizer API',
    status: 'running',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.url} does not exist`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
  console.log(`Connected to frontend at ${FRONTEND_URL}`);
});
