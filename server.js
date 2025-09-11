const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/leads', require('./api/leads.js'));

// Handle other API routes dynamically
app.use('/api/*', (req, res, next) => {
  const apiPath = req.path.replace('/api/', '');
  try {
    const handler = require(`./api/${apiPath}.js`);
    handler(req, res);
  } catch (error) {
    console.error(`API route not found: ${apiPath}`, error);
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});