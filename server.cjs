const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Explicitly define API routes
try {
  // Main leads route
  const leadsHandler = require('./api/leads.js');
  app.use('/api/leads', leadsHandler);

  // Twilio webhook routes
  try {
    const twilioWebhookTest = require('./api/twilio-webhook-test.js');
    app.post('/api/twilio-webhook-test', twilioWebhookTest);
  } catch (error) {
    console.log('twilio-webhook-test.js not found, skipping...');
  }

  try {
    const twilioWebhookOpenai = require('./api/twilio-webhook-openai.js');
    app.post('/api/twilio-webhook-openai', twilioWebhookOpenai);
  } catch (error) {
    console.log('twilio-webhook-openai.js not found, skipping...');
  }

  try {
    const twilioWebhookElevenlabs = require('./api/twilio-webhook-elevenlabs.js');
    app.post('/api/twilio-webhook-elevenlabs', twilioWebhookElevenlabs);
  } catch (error) {
    console.log('twilio-webhook-elevenlabs.js not found, skipping...');
  }

  // Call routes with parameters
  try {
    const callTest = require('./api/call-test/[leadId].js');
    app.post('/api/call-test/:leadId', callTest);
  } catch (error) {
    console.log('call-test/[leadId].js not found, skipping...');
  }

  try {
    const callOpenai = require('./api/call-openai/[leadId].js');
    app.post('/api/call-openai/:leadId', callOpenai);
  } catch (error) {
    console.log('call-openai/[leadId].js not found, skipping...');
  }

  try {
    const callElevenlabs = require('./api/call-elevenlabs/[leadId].js');
    app.post('/api/call-elevenlabs/:leadId', callElevenlabs);
  } catch (error) {
    console.log('call-elevenlabs/[leadId].js not found, skipping...');
  }

} catch (error) {
  console.error('Error setting up API routes:', error);
}

// Fallback for any unhandled API routes
app.use('/api/*', (req, res) => {
  console.error(`API route not found: ${req.path}`);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});