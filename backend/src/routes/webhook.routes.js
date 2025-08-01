/**
 * Webhook API endpoints for SignalWire and ElevenLabs callbacks
 */

const express = require('express');
const router = express.Router();
// const webhookController = require('../controllers/webhook.controller'); // Will implement later
const elevenLabsWebhookController = require('../controllers/elevenlabs-webhook.controller');

// POST endpoint for inbound calls
router.post('/inbound', (req, res) => {
  // Placeholder - will implement controller
  console.log('Inbound call webhook received:', req.body);
  
  // Return SignalWire SWML/XML response
  res.set('Content-Type', 'application/xml');
  res.send(`
    <Response>
      <Say>Thanks for calling the 11Wire system. This is a placeholder response.</Say>
    </Response>
  `);
});

// POST endpoint for call status updates
router.post('/call-status', (req, res) => {
  // Placeholder - will implement controller
  console.log('Call status webhook received:', req.body);
  res.status(200).send();
});

// POST endpoint for recording status

// ElevenLabs webhook routes
router.use('/elevenlabs', elevenLabsWebhookController);

// Recording webhook route
router.post('/recording', (req, res) => {
  // Placeholder - will implement controller
  console.log('Recording webhook received:', req.body);
  res.status(200).send();
});

// NOTE: ElevenLabs webhook is handled by the elevenLabsWebhookController
// mounted at router.use('/elevenlabs', elevenLabsWebhookController)

// POST endpoint for Answering Machine Detection (AMD)
router.post('/amd', (req, res) => {
  // Placeholder - will implement controller
  console.log('AMD webhook received:', req.body);
  res.set('Content-Type', 'application/xml');
  res.send(`
    <Response>
      <Say>This is a placeholder AMD response.</Say>
    </Response>
  `);
});

module.exports = router;
