// server.js

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Replace this with your actual Atlas connection string,
// or set it in an environment variable called MONGODB_URI.
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://fionanosullivan:KrFc1314!@myfleetappcluster.g0jixfi.mongodb.net/?appName=MyFleetAppCluster';

// Connect to MongoDB Atlas (no deprecated options)
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Fleet maintenance backend running',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
